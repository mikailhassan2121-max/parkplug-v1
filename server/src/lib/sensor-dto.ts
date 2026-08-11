import type { ParkingFacility, ParkingSpace, Sensor, SpaceStatus, OccupancyEvent } from "@prisma/client";

const undef = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

export type FacilityCounts = {
  available: number;
  occupied: number;
  total: number;
  occupancyPct: number;
};

export function summarizeSpaces(spaces: Array<{ status: SpaceStatus }>): FacilityCounts {
  const total = spaces.length;
  const available = spaces.filter((s) => s.status === "AVAILABLE").length;
  const occupied = spaces.filter((s) => s.status === "OCCUPIED").length;
  const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
  return { available, occupied, total, occupancyPct };
}

export type SpaceWithSensor = ParkingSpace & { sensor: Sensor | null };

export function toSpaceDto(space: SpaceWithSensor) {
  return {
    id: space.id,
    spotId: space.spotId,
    displayName: space.displayName,
    status: space.status,
    lastUpdated: space.lastUpdated.toISOString(),
    lastSensorValue: undef(space.lastSensorValue),
    confidence: undef(space.confidence),
    sortOrder: space.sortOrder,
    sensor: space.sensor
      ? {
          sensorId: space.sensor.sensorId,
          deviceType: space.sensor.deviceType,
          onlineStatus: space.sensor.onlineStatus,
          lastSeen: space.sensor.lastSeen ? space.sensor.lastSeen.toISOString() : undefined,
          batteryLevel: undef(space.sensor.batteryLevel),
          signalStrength: undef(space.sensor.signalStrength),
        }
      : undefined,
  };
}

export type SpaceStatusOnly = { status: SpaceStatus };

export function toFacilityDto(facility: ParkingFacility, spaces: SpaceWithSensor[]) {
  const counts = summarizeSpaces(spaces);
  return {
    id: facility.id,
    facilityId: facility.facilityId,
    name: facility.name,
    address: facility.address,
    location: { lat: facility.latitude, lng: facility.longitude },
    totalSpaces: facility.totalSpaces,
    sensorEnabled: facility.sensorEnabled,
    listingId: undef(facility.listingId),
    ownerId: undef(facility.ownerId),
    ...counts,
    spaces: [...spaces].sort((a, b) => a.sortOrder - b.sortOrder).map(toSpaceDto),
    updatedAt: facility.updatedAt.toISOString(),
  };
}

export type FacilityDto = ReturnType<typeof toFacilityDto>;

export function toFacilitySummaryDto(facility: ParkingFacility, spaces: SpaceStatusOnly[]) {
  const counts = summarizeSpaces(spaces);
  return {
    id: facility.id,
    facilityId: facility.facilityId,
    name: facility.name,
    address: facility.address,
    location: { lat: facility.latitude, lng: facility.longitude },
    sensorEnabled: facility.sensorEnabled,
    listingId: undef(facility.listingId),
    ...counts,
  };
}

export type FacilitySummaryDto = ReturnType<typeof toFacilitySummaryDto>;

export function toOccupancyEventDto(event: OccupancyEvent & { space: ParkingSpace }) {
  return {
    id: event.id,
    spotId: event.space.spotId,
    displayName: event.space.displayName,
    previousStatus: event.previousStatus,
    newStatus: event.newStatus,
    source: event.source,
    occurredAt: event.occurredAt.toISOString(),
  };
}
