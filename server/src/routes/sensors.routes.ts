import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { requireSensorToken } from "../middleware/sensor-auth.js";
import { sensorLimiter } from "../middleware/rate-limit.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { summarizeSpaces } from "../lib/sensor-dto.js";
import { publishFacilitySnapshot } from "../lib/sensor-realtime.js";

export const sensorsRouter = Router();

// Every write below authenticates with the same Bearer SENSOR_INGEST_TOKEN —
// real ESP32 hardware and the admin simulator's server-side proxy hit this
// exact same endpoint with the exact same auth, never a separate code path.
sensorsRouter.use(requireSensorToken);

const SPACE_STATUSES = ["AVAILABLE", "OCCUPIED", "UNKNOWN", "OFFLINE"] as const;

const occupancySchema = z
  .object({
    sensor_id: z.string().min(1),
    spot_id: z.string().min(1),
    // A device normally reports simple occupancy...
    occupied: z.boolean().optional(),
    // ...but an explicit status is how a device (or the simulator) reports
    // UNKNOWN/OFFLINE, which `occupied` alone can't express.
    status: z.enum(SPACE_STATUSES).optional(),
    sensor_value: z.number().optional(),
    confidence: z.number().min(0).max(1).optional(),
    // Omitted by real hardware, which is always a live sensor reading. The
    // simulator sets this explicitly so simulated traffic is distinguishable
    // in the activity feed from a real device.
    source: z.enum(["SENSOR", "SIMULATOR"]).optional().default("SENSOR"),
  })
  .refine((d) => d.occupied !== undefined || d.status !== undefined, {
    message: "Provide either `occupied` or `status`.",
    path: ["occupied"],
  });

sensorsRouter.post(
  "/occupancy",
  sensorLimiter({ windowMs: 60_000, limit: 60, message: "Too many reports from this sensor. Try again shortly." }),
  asyncRoute(async (req, res) => {
    const parsed = occupancySchema.safeParse(req.body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "body";
        fieldErrors[key] = issue.message;
      }
      throw badRequest("Check the occupancy report and try again.", fieldErrors);
    }
    const d = parsed.data;

    const sensor = await prisma.sensor.findUnique({
      where: { sensorId: d.sensor_id },
      include: { space: true },
    });
    if (!sensor) throw notFound(`Unknown sensor "${d.sensor_id}".`);
    if (sensor.space.spotId !== d.spot_id) {
      throw forbidden(`Sensor "${d.sensor_id}" is not bound to spot "${d.spot_id}".`);
    }

    const newStatus = d.status ?? (d.occupied ? "OCCUPIED" : "AVAILABLE");
    const previousStatus = sensor.space.status;
    const changed = previousStatus !== newStatus;
    const now = new Date();

    const [updatedSpace] = await prisma.$transaction([
      prisma.parkingSpace.update({
        where: { id: sensor.spaceId },
        data: {
          status: newStatus,
          lastUpdated: now,
          lastSensorValue: d.sensor_value ?? undefined,
          confidence: d.confidence ?? undefined,
        },
      }),
      prisma.sensor.update({
        where: { id: sensor.id },
        data: { lastSeen: now, onlineStatus: "ONLINE" },
      }),
      // Idempotent: a status-unchanged report (a heartbeat-style re-report of
      // the same state) still refreshes lastUpdated/lastSeen above, but does
      // not append a duplicate event — otherwise a device polling every few
      // seconds floods the activity feed with entries that carry no new
      // information.
      ...(changed
        ? [
            prisma.occupancyEvent.create({
              data: {
                spaceId: sensor.spaceId,
                facilityId: sensor.space.facilityId,
                previousStatus,
                newStatus,
                source: d.source,
                sensorValue: d.sensor_value ?? undefined,
                confidence: d.confidence ?? undefined,
                occurredAt: now,
              },
            }),
          ]
        : []),
    ]);

    const spaces = await prisma.parkingSpace.findMany({
      where: { facilityId: sensor.space.facilityId },
      select: { status: true },
    });
    const counts = summarizeSpaces(spaces);

    void publishFacilitySnapshot(
      sensor.space.facilityId,
      changed
        ? {
            spotId: d.spot_id,
            previousStatus,
            newStatus,
            source: d.source,
            occurredAt: now.toISOString(),
          }
        : undefined,
    );

    res.json({
      ok: true,
      spot_id: d.spot_id,
      status: newStatus,
      last_updated: updatedSpace.lastUpdated.toISOString(),
      facility: {
        available: counts.available,
        occupied: counts.occupied,
        total: counts.total,
        occupancy_pct: counts.occupancyPct,
      },
    });
  }),
);

const heartbeatSchema = z.object({
  sensor_id: z.string().min(1),
  battery_level: z.number().min(0).max(1).optional(),
  signal_strength: z.number().optional(),
});

sensorsRouter.post(
  "/heartbeat",
  sensorLimiter({ windowMs: 60_000, limit: 60, message: "Too many heartbeats from this sensor. Try again shortly." }),
  asyncRoute(async (req, res) => {
    const parsed = heartbeatSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Check the heartbeat payload and try again.");
    const d = parsed.data;

    const sensor = await prisma.sensor.findUnique({ where: { sensorId: d.sensor_id }, include: { space: true } });
    if (!sensor) throw notFound(`Unknown sensor "${d.sensor_id}".`);

    const now = new Date();
    const wasOffline = sensor.onlineStatus !== "ONLINE";
    await prisma.sensor.update({
      where: { id: sensor.id },
      data: {
        lastSeen: now,
        onlineStatus: "ONLINE",
        batteryLevel: d.battery_level ?? undefined,
        signalStrength: d.signal_strength ?? undefined,
      },
    });

    // A heartbeat never changes occupancy, but coming back online after a
    // sweeper offline-flip is worth telling live subscribers about (sensor
    // health on the owner dashboard).
    if (wasOffline) void publishFacilitySnapshot(sensor.space.facilityId);

    res.json({ ok: true, sensor_id: d.sensor_id, last_seen: now.toISOString() });
  }),
);
