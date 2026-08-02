/**
 * Ported from src/lib/geo.ts on the frontend so distance, walking time, and
 * address-privacy offsetting behave identically wherever they run.
 */

export type Coordinates = { lat: number; lng: number };

export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function walkingMinutes(meters: number): number {
  return Math.round((meters * 1.25) / 1.35 / 60);
}

/**
 * Offsets a precise point by a pseudo-random vector derived from a seed (the
 * listing id), so the same listing always gets the same offset but the real
 * coordinate is never derivable from the public one.
 */
export function obfuscate(point: Coordinates, seed: string, radiusMeters = 200): Coordinates {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const angle = (((hash >>> 0) % 3600) / 3600) * Math.PI * 2;
  const magnitude = radiusMeters * (0.45 + (((hash >>> 8) % 100) / 100) * 0.5);
  const dLat = (magnitude * Math.cos(angle)) / 111_320;
  const dLng = (magnitude * Math.sin(angle)) / (111_320 * Math.cos((point.lat * Math.PI) / 180));
  return { lat: point.lat + dLat, lng: point.lng + dLng };
}

/** Bounding box padded by `meters` around a centre point — used to keep the
 *  search SQL query narrow before the exact haversine filter is applied. */
export function boundingBox(center: Coordinates, meters: number) {
  const dLat = meters / 111_320;
  const dLng = meters / (111_320 * Math.cos((center.lat * Math.PI) / 180));
  return {
    south: center.lat - dLat,
    north: center.lat + dLat,
    west: center.lng - dLng,
    east: center.lng + dLng,
  };
}
