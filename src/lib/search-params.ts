import {
  DEFAULT_FILTERS,
  type Amenity,
  type ParkingType,
  type SearchFilters,
  type SearchQuery,
  type SortOption,
  type VehicleSize,
} from "./types";

/**
 * The search URL is the source of truth for a query, so results are shareable,
 * bookmarkable, and survive a refresh or a back-navigation.
 */

const SORTS: SortOption[] = [
  "recommended",
  "closest",
  "price_low",
  "rating_high",
  "recently_reported",
  "available_soonest",
];

const VEHICLE_SIZES: VehicleSize[] = ["compact", "standard", "large", "oversized"];

function num(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function list<T extends string>(value: string | null, allowed: readonly T[]): T[] {
  if (!value) return [];
  return value.split(",").filter((v): v is T => (allowed as readonly string[]).includes(v));
}

const PARKING_TYPES: ParkingType[] = [
  "driveway",
  "garage",
  "private_lot",
  "apartment_space",
  "business_lot",
  "organization_lot",
  "other",
];

const AMENITY_VALUES: Amenity[] = [
  "covered",
  "ev_charging",
  "accessible",
  "lit",
  "gated",
  "camera_monitored",
  "attended",
  "paved",
  "level_entry",
];

export function parseSearchParams(params: URLSearchParams): SearchQuery {
  const lat = num(params.get("lat"));
  const lng = num(params.get("lng"));
  const sortParam = params.get("sort");
  const vehicleParam = params.get("vehicle");

  const filters: SearchFilters = {
    ...DEFAULT_FILTERS,
    // `free=1` narrows to community reports only; `paid=1` does the inverse.
    includeFree: params.get("paid") === "1" ? false : true,
    includePaid: params.get("free") === "1" ? false : true,
    availableNow: params.get("now") === "1",
    maxPriceCents: num(params.get("maxPrice")),
    maxDistanceMeters: num(params.get("dist")),
    parkingTypes: list(params.get("types"), PARKING_TYPES),
    amenities: list(params.get("amenities"), AMENITY_VALUES),
    vehicleSize: VEHICLE_SIZES.includes(vehicleParam as VehicleSize)
      ? (vehicleParam as VehicleSize)
      : undefined,
    minHeightClearanceCm: num(params.get("height")),
    instantBookOnly: params.get("instant") === "1",
    minRating: num(params.get("rating")),
  };

  return {
    destination: params.get("q") ?? "",
    center: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
    startAt: params.get("start") ?? undefined,
    endAt: params.get("end") ?? undefined,
    vehicleSize: filters.vehicleSize,
    sort: SORTS.includes(sortParam as SortOption) ? (sortParam as SortOption) : "recommended",
    filters,
  };
}

export function serializeSearchQuery(query: SearchQuery): string {
  const params = new URLSearchParams();
  if (query.destination) params.set("q", query.destination);
  if (query.center) {
    params.set("lat", query.center.lat.toFixed(6));
    params.set("lng", query.center.lng.toFixed(6));
  }
  if (query.startAt) params.set("start", query.startAt);
  if (query.endAt) params.set("end", query.endAt);
  if (query.sort !== "recommended") params.set("sort", query.sort);

  const f = query.filters;
  if (!f.includeFree) params.set("paid", "1");
  if (!f.includePaid) params.set("free", "1");
  if (f.availableNow) params.set("now", "1");
  if (f.maxPriceCents !== undefined) params.set("maxPrice", String(f.maxPriceCents));
  if (f.maxDistanceMeters !== undefined) params.set("dist", String(f.maxDistanceMeters));
  if (f.parkingTypes.length) params.set("types", f.parkingTypes.join(","));
  if (f.amenities.length) params.set("amenities", f.amenities.join(","));
  if (f.vehicleSize) params.set("vehicle", f.vehicleSize);
  if (f.minHeightClearanceCm !== undefined) params.set("height", String(f.minHeightClearanceCm));
  if (f.instantBookOnly) params.set("instant", "1");
  if (f.minRating !== undefined) params.set("rating", String(f.minRating));

  return params.toString();
}

/** Number of filters differing from the defaults, for the "Filters (n)" badge. */
export function countActiveFilters(filters: SearchFilters): number {
  let count = 0;
  if (!filters.includeFree || !filters.includePaid) count += 1;
  if (filters.availableNow) count += 1;
  if (filters.maxPriceCents !== undefined) count += 1;
  if (filters.maxDistanceMeters !== undefined) count += 1;
  count += filters.parkingTypes.length;
  count += filters.amenities.length;
  if (filters.vehicleSize) count += 1;
  if (filters.minHeightClearanceCm !== undefined) count += 1;
  if (filters.instantBookOnly) count += 1;
  if (filters.minRating !== undefined) count += 1;
  return count;
}

/** Validates the arrival/departure pair, returning a message when invalid. */
export function validateDateRange(
  startAt: string | undefined,
  endAt: string | undefined,
): string | null {
  if (!startAt || !endAt) return null;
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Enter a valid arrival and departure time.";
  }
  if (end <= start) return "Departure must be after arrival.";
  if (end.getTime() - start.getTime() > 30 * 24 * 3600_000) {
    return "Reservations can be at most 30 days long.";
  }
  return null;
}
