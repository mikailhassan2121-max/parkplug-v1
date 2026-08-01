import type { ApproximateLocation, Coordinates } from "./types";

/** Great-circle distance in metres. */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough walking time at a typical 1.35 m/s pace, with a detour allowance. */
export function walkingMinutes(meters: number): number {
  return Math.round((meters * 1.25) / 1.35 / 60);
}

/**
 * Offsets a precise point by a pseudo-random vector so public maps never
 * reveal which driveway a listing belongs to. The offset is derived from the
 * listing id, so it stays stable across page loads instead of jittering.
 */
export function obfuscate(
  point: Coordinates,
  seed: string,
  radiusMeters = 180,
): Coordinates {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const angle = ((hash >>> 0) % 3600) / 3600 * Math.PI * 2;
  const magnitude = radiusMeters * (0.45 + (((hash >>> 8) % 100) / 100) * 0.5);
  const dLat = (magnitude * Math.cos(angle)) / 111_320;
  const dLng =
    (magnitude * Math.sin(angle)) / (111_320 * Math.cos((point.lat * Math.PI) / 180));
  return { lat: point.lat + dLat, lng: point.lng + dLng };
}

/** Bounding box padded by `meters` around a centre point. */
export function boundsAround(center: Coordinates, meters: number) {
  const dLat = meters / 111_320;
  const dLng = meters / (111_320 * Math.cos((center.lat * Math.PI) / 180));
  return {
    south: center.lat - dLat,
    north: center.lat + dLat,
    west: center.lng - dLng,
    east: center.lng + dLng,
  };
}

export function withinBounds(
  point: Coordinates,
  bounds: { south: number; north: number; west: number; east: number },
): boolean {
  return (
    point.lat >= bounds.south &&
    point.lat <= bounds.north &&
    point.lng >= bounds.west &&
    point.lng <= bounds.east
  );
}

/**
 * Builds the public-safe location shown on maps and listing cards from a real
 * address. Street number is dropped and the point is offset.
 */
export function toApproximateLocation(input: {
  id: string;
  street: string;
  city: string;
  state: string;
  center: Coordinates;
  neighborhood?: string;
}): ApproximateLocation {
  // "142 Main St" -> "Main St"
  const streetNoNumber = input.street.replace(/^\s*[\d-]+\s+/, "").trim();
  const area = input.neighborhood ?? streetNoNumber;
  return {
    label: area ? `Near ${area}, ${input.city}` : `${input.city}, ${input.state}`,
    neighborhood: input.neighborhood ?? (streetNoNumber || undefined),
    city: input.city,
    state: input.state,
    center: obfuscate(input.center, input.id),
    radiusMeters: 200,
  };
}

/* ------------------------------ Geocoding -------------------------------- */

export type GeocodeMatch = {
  label: string;
  center: Coordinates;
  city?: string;
  state?: string;
};

/**
 * Address lookup. Defaults to the OpenStreetMap Nominatim service, which needs
 * no API key; point `NEXT_PUBLIC_GEOCODER_URL` at a commercial geocoder for
 * production traffic. Returns an empty list rather than throwing so callers can
 * show a "no matches" state.
 */
export async function geocode(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeMatch[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const base =
    process.env.NEXT_PUBLIC_GEOCODER_URL ?? "https://nominatim.openstreetmap.org/search";
  const url = `${base}?q=${encodeURIComponent(trimmed)}&format=jsonv2&addressdetails=1&limit=6`;

  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Geocoder responded ${response.status}`);

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((entry): GeocodeMatch[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const row = entry as Record<string, unknown>;
    const lat = Number(row.lat);
    const lon = Number(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    const address = (row.address ?? {}) as Record<string, string>;
    return [
      {
        label: String(row.display_name ?? trimmed),
        center: { lat, lng: lon },
        city: address.city ?? address.town ?? address.village ?? address.hamlet,
        state: address.state,
      },
    ];
  });
}

/** Wraps the browser geolocation API in a promise with a clear failure reason. */
export type LocationError = "denied" | "unavailable" | "timeout" | "unsupported";

export function getCurrentPosition(): Promise<
  { ok: true; center: Coordinates } | { ok: false; reason: LocationError }
> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, reason: "unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          ok: true,
          center: { lat: position.coords.latitude, lng: position.coords.longitude },
        }),
      (error) => {
        const reason: LocationError =
          error.code === error.PERMISSION_DENIED
            ? "denied"
            : error.code === error.TIMEOUT
              ? "timeout"
              : "unavailable";
        resolve({ ok: false, reason });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  });
}

export const LOCATION_ERROR_COPY: Record<LocationError, { title: string; description: string }> = {
  denied: {
    title: "Location access is turned off",
    description:
      "ParkPlug cannot see where you are. Search for an address instead, or enable location access for this site in your browser settings.",
  },
  unavailable: {
    title: "We could not determine your location",
    description: "Your device did not return a position. Try searching for an address instead.",
  },
  timeout: {
    title: "Finding your location took too long",
    description: "Try again, or search for an address instead.",
  },
  unsupported: {
    title: "This browser cannot share your location",
    description: "Search for an address instead.",
  },
};
