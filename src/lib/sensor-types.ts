/**
 * Mirrors the DTOs the Railway API returns from /api/v1/facilities/* — see
 * server/src/lib/sensor-dto.ts. Field-for-field with that file on purpose,
 * same as src/lib/types.ts does for the marketplace models.
 */

export type SpaceStatus = "AVAILABLE" | "OCCUPIED" | "UNKNOWN" | "OFFLINE";
export type SensorOnlineStatus = "ONLINE" | "OFFLINE";
export type OccupancyEventSource = "SENSOR" | "SIMULATOR" | "MANUAL";

export type FacilitySensorInfo = {
  sensorId: string;
  deviceType: string;
  onlineStatus: SensorOnlineStatus;
  lastSeen?: string;
  batteryLevel?: number;
  signalStrength?: number;
};

export type FacilitySpace = {
  id: string;
  spotId: string;
  displayName: string;
  status: SpaceStatus;
  lastUpdated: string;
  lastSensorValue?: number;
  confidence?: number;
  sortOrder: number;
  /** Owner-editable configuration — separate from `status`, which is sensor-reported. */
  active: boolean;
  reservable: boolean;
  accessible: boolean;
  restrictions?: string;
  sensor?: FacilitySensorInfo;
};

export type FacilityCounts = {
  available: number;
  occupied: number;
  total: number;
  occupancyPct: number;
};

export type Facility = FacilityCounts & {
  id: string;
  facilityId: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  totalSpaces: number;
  sensorEnabled: boolean;
  listingId?: string;
  ownerId?: string;
  spaces: FacilitySpace[];
  updatedAt: string;
};

export type FacilitySummary = FacilityCounts & {
  id: string;
  facilityId: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  sensorEnabled: boolean;
  listingId?: string;
};

export type FacilityUpdateEvent = {
  spotId: string;
  previousStatus: SpaceStatus;
  newStatus: SpaceStatus;
  source: OccupancyEventSource;
  occurredAt: string;
};

export type OccupancyEvent = {
  id: string;
  spotId: string;
  displayName: string;
  previousStatus: SpaceStatus;
  newStatus: SpaceStatus;
  source: OccupancyEventSource;
  occurredAt: string;
};

export const SPACE_STATUS_LABEL: Record<SpaceStatus, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  UNKNOWN: "Unknown",
  OFFLINE: "Offline",
};

export type SparklinePoint = { at: string; occupancyPct: number };
export type BusiestHour = { hour: number; label: string; eventCount: number } | null;

export type FacilityAnalytics = {
  timezone: string;
  hasData: boolean;
  sparkline: SparklinePoint[];
  busiestHour: BusiestHour;
};
