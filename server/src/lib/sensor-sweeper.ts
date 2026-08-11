/**
 * Background offline detector. Real hardware (and the simulator) only ever
 * moves a sensor to ONLINE by reporting in — nothing marks a sensor OFFLINE
 * directly, so a device that stops reporting (power loss, Wi-Fi drop) would
 * otherwise show a stale "available"/"occupied" forever. This sweeper is the
 * only thing that flips a sensor, and its space, to OFFLINE.
 */
import { prisma } from "../db.js";
import { env } from "../env.js";
import { publishFacilitySnapshot } from "./sensor-realtime.js";

const SWEEP_INTERVAL_MS = 15_000;

async function sweepOnce() {
  const cutoff = new Date(Date.now() - env.SENSOR_OFFLINE_AFTER_SECONDS * 1000);

  const staleSensors = await prisma.sensor.findMany({
    where: { onlineStatus: "ONLINE", lastSeen: { lt: cutoff } },
    include: { space: true },
  });
  if (staleSensors.length === 0) return;

  const affectedFacilityIds = new Set<string>();
  const now = new Date();

  for (const sensor of staleSensors) {
    const previousStatus = sensor.space.status;
    await prisma.$transaction([
      prisma.sensor.update({ where: { id: sensor.id }, data: { onlineStatus: "OFFLINE" } }),
      prisma.parkingSpace.update({
        where: { id: sensor.spaceId },
        data: { status: "OFFLINE", lastUpdated: now },
      }),
      // Only log a transition if the space wasn't already showing OFFLINE —
      // same idempotency rule as the ingest endpoint.
      ...(previousStatus !== "OFFLINE"
        ? [
            prisma.occupancyEvent.create({
              data: {
                spaceId: sensor.spaceId,
                facilityId: sensor.space.facilityId,
                previousStatus,
                newStatus: "OFFLINE",
                // Not a real sensor reading and not the simulator — the
                // sweeper is a system-initiated correction, closest to the
                // existing MANUAL source.
                source: "MANUAL",
                occurredAt: now,
              },
            }),
          ]
        : []),
    ]);
    affectedFacilityIds.add(sensor.space.facilityId);
  }

  for (const facilityId of affectedFacilityIds) {
    await publishFacilitySnapshot(facilityId).catch((err) => {
      console.error("sensor sweeper: failed to publish snapshot", err);
    });
  }
}

/** Returns a stop function; call once at process startup. */
export function startSensorSweeper(): () => void {
  const timer = setInterval(() => {
    sweepOnce().catch((err) => console.error("sensor sweeper failed", err));
  }, SWEEP_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
