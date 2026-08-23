import type { Facility, FacilitySpace } from "@/lib/sensor-types";

export type SensorRowStatus = "ONLINE" | "OFFLINE" | "ATTENTION";

export type SensorRow = {
  sensorId: string;
  deviceType: string;
  facilityId: string;
  facilityName: string;
  spaceId: string;
  spotId: string;
  spaceName: string;
  spaceStatus: FacilitySpace["status"];
  status: SensorRowStatus;
  lastSeen?: string;
  batteryLevel?: number;
  signalStrength?: number;
};

/**
 * ONLINE/OFFLINE comes straight from the server's heartbeat sweep. ATTENTION
 * is the one client-side judgment call layered on top, and only for a signal
 * we can interpret confidently: battery level is a documented 0-1 fraction,
 * so under 20% while still checking in is a real thing an owner should see.
 * signalStrength's unit isn't documented anywhere in the API, so it's shown
 * as-is and never used to compute status.
 */
function rowStatus(space: FacilitySpace): SensorRowStatus {
  const sensor = space.sensor!;
  if (sensor.onlineStatus === "OFFLINE") return "OFFLINE";
  if (sensor.batteryLevel !== undefined && sensor.batteryLevel < 0.2) return "ATTENTION";
  return "ONLINE";
}

export function buildSensorRows(facility: {
  facilityId: string;
  name: string;
  spaces: FacilitySpace[];
}): SensorRow[] {
  return facility.spaces
    .filter((space) => space.sensor)
    .map((space) => ({
      sensorId: space.sensor!.sensorId,
      deviceType: space.sensor!.deviceType,
      facilityId: facility.facilityId,
      facilityName: facility.name,
      spaceId: space.id,
      spotId: space.spotId,
      spaceName: space.displayName,
      spaceStatus: space.status,
      status: rowStatus(space),
      lastSeen: space.sensor!.lastSeen,
      batteryLevel: space.sensor!.batteryLevel,
      signalStrength: space.sensor!.signalStrength,
    }));
}

export function buildAllSensorRows(facilities: Facility[]): SensorRow[] {
  return facilities.flatMap(buildSensorRows);
}
