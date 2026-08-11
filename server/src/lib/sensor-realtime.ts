/**
 * In-process pub/sub for live facility updates, consumed by the SSE endpoint
 * in facilities.routes.ts. Deliberately not Supabase Realtime — this Railway
 * service already owns auth and writes for sensor data, so a second realtime
 * channel would mean a second auth model (and RLS we don't otherwise use)
 * for no real benefit. A single Node process is enough for the current
 * deployment; if this API ever runs multiple instances, this would need to
 * move to a shared broker (e.g. Redis pub/sub) instead.
 */
import { EventEmitter } from "node:events";
import { prisma } from "../db.js";
import { toFacilityDto, type FacilityDto } from "./sensor-dto.js";

const bus = new EventEmitter();
bus.setMaxListeners(0);

export type FacilityUpdateEvent = {
  spotId: string;
  previousStatus: string;
  newStatus: string;
  source: string;
  occurredAt: string;
};

export type FacilityUpdate = {
  facility: FacilityDto;
  event?: FacilityUpdateEvent;
};

function channel(facilityPk: string) {
  return `facility:${facilityPk}`;
}

/** `facilityPk` is the facility's internal id (ParkingFacility.id), not its public facilityId string. */
export function subscribeFacility(facilityPk: string, handler: (update: FacilityUpdate) => void) {
  const name = channel(facilityPk);
  bus.on(name, handler);
  return () => bus.off(name, handler);
}

/**
 * Re-reads the facility fresh from the database and publishes the full
 * snapshot. Called after any write that can change a facility's live state
 * (occupancy ingest, heartbeat, offline sweep) — always publishing a whole
 * snapshot instead of a diff keeps subscribers trivially consistent even if
 * an event is missed.
 */
export async function publishFacilitySnapshot(facilityPk: string, event?: FacilityUpdateEvent) {
  const facility = await prisma.parkingFacility.findUnique({
    where: { id: facilityPk },
    include: { spaces: { include: { sensor: true } } },
  });
  if (!facility) return;

  const dto = toFacilityDto(facility, facility.spaces);
  bus.emit(channel(facilityPk), { facility: dto, event } satisfies FacilityUpdate);
}
