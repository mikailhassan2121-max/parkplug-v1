/**
 * Fetch helpers for the live sensor platform. Unlike the rest of src/lib/api
 * (which falls back to a browser-local adapter when no backend is
 * configured), this talks to the Railway API directly and only — sensor
 * data is inherently live/hardware-backed, so there is no meaningful
 * local-storage simulation of it. Every live surface uses these plus
 * useFacilityLiveStatus for the SSE subscription itself.
 */
import { fail, ok, type ApiResult } from "./result";
import { getSessionToken } from "./index";
import type { Facility, FacilityAnalytics, FacilitySummary, OccupancyEvent } from "@/lib/sensor-types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

/** True once a Railway API is configured — gates every live-sensor surface's "connected" state. */
export const sensorApiConfigured = Boolean(API_BASE);

async function getJson<T>(path: string, opts: { auth?: boolean; timeoutMs?: number } = {}): Promise<ApiResult<T>> {
  if (!API_BASE) {
    return fail("network", "The live sensor API is not configured.", { retryable: false });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  try {
    const token = opts.auth ? getSessionToken() : null;
    const response = await fetch(`${API_BASE}${path}`, {
      signal: controller.signal,
      credentials: opts.auth ? "include" : "same-origin",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}) as Record<string, unknown>);
      const message = typeof body.message === "string" ? body.message : response.statusText;
      const code =
        response.status === 401
          ? "unauthorized"
          : response.status === 403
            ? "forbidden"
            : response.status === 404
              ? "not_found"
              : response.status >= 500
                ? "server"
                : "unknown";
      return fail(code, message);
    }
    return ok((await response.json()) as T);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return fail("timeout", "The request timed out.");
    }
    return fail("network", "We could not reach the live sensor API.");
  } finally {
    clearTimeout(timer);
  }
}

async function patchJson<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  if (!API_BASE) {
    return fail("network", "The live sensor API is not configured.", { retryable: false });
  }
  const token = getSessionToken();
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const responseBody = await response.json().catch(() => ({}) as Record<string, unknown>);
      const message = typeof responseBody.message === "string" ? responseBody.message : response.statusText;
      const code =
        response.status === 401
          ? "unauthorized"
          : response.status === 403
            ? "forbidden"
            : response.status === 404
              ? "not_found"
              : response.status >= 500
                ? "server"
                : response.status === 400
                  ? "validation"
                  : "unknown";
      return fail(code, message);
    }
    return ok((await response.json()) as T);
  } catch {
    return fail("network", "We could not reach the live sensor API.");
  }
}

export function fetchFacilitySnapshot(facilityId: string): Promise<ApiResult<Facility>> {
  return getJson<Facility>(`/api/v1/facilities/${encodeURIComponent(facilityId)}`);
}

export function updateFacilityConfig(
  facilityId: string,
  patch: { name?: string; address?: string },
): Promise<ApiResult<Facility>> {
  return patchJson<Facility>(`/api/v1/facilities/${encodeURIComponent(facilityId)}`, patch);
}

export function updateSpaceConfig(
  facilityId: string,
  spaceId: string,
  patch: { active?: boolean; reservable?: boolean; accessible?: boolean; restrictions?: string | null },
): Promise<ApiResult<Facility>> {
  return patchJson<Facility>(
    `/api/v1/facilities/${encodeURIComponent(facilityId)}/spaces/${encodeURIComponent(spaceId)}`,
    patch,
  );
}

export type FacilityBbox = { minLat: number; maxLat: number; minLng: number; maxLng: number };

export function fetchFacilitiesList(bbox?: FacilityBbox): Promise<ApiResult<FacilitySummary[]>> {
  const query = bbox
    ? `?minLat=${bbox.minLat}&maxLat=${bbox.maxLat}&minLng=${bbox.minLng}&maxLng=${bbox.maxLng}`
    : "";
  return getJson<FacilitySummary[]>(`/api/v1/facilities${query}`);
}

export function facilityStreamUrl(facilityId: string): string | null {
  if (!API_BASE) return null;
  return `${API_BASE}/api/v1/facilities/${encodeURIComponent(facilityId)}/stream`;
}

/** Facilities the signed-in host manages (plus any unclaimed demo facility) — powers /host/facilities. */
export function fetchMyFacilities(): Promise<ApiResult<Facility[]>> {
  return getJson<Facility[]>("/api/v1/facilities/mine", { auth: true });
}

export function fetchFacilityEvents(facilityId: string): Promise<ApiResult<OccupancyEvent[]>> {
  return getJson<OccupancyEvent[]>(`/api/v1/facilities/${encodeURIComponent(facilityId)}/events`, { auth: true });
}

export function fetchFacilityAnalytics(facilityId: string): Promise<ApiResult<FacilityAnalytics>> {
  return getJson<FacilityAnalytics>(`/api/v1/facilities/${encodeURIComponent(facilityId)}/analytics`, { auth: true });
}
