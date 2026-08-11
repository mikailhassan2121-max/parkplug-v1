"use client";

import { useEffect, useRef, useState } from "react";
import { fetchFacilitySnapshot, facilityStreamUrl, sensorApiConfigured } from "./api/sensors";
import type { Facility, FacilityUpdateEvent } from "./sensor-types";
import type { ApiError } from "./api/result";

export type FacilityLiveState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "error"; error: ApiError }
  | { status: "ready"; facility: Facility; live: boolean; lastEvent?: FacilityUpdateEvent };

const POLL_INTERVAL_MS = 5000;
const MAX_BACKOFF_MS = 16000;
// After this many failed SSE (re)connect attempts, stop retrying the stream
// and settle on polling instead.
const MAX_SSE_ATTEMPTS = 4;

/**
 * The one hook every live surface uses (/live, /facilities/[id],
 * /host/facilities/[id]): fetches the snapshot, subscribes to the SSE
 * stream, reconciles updates, reconnects the stream with backoff, and falls
 * back to 5s polling if EventSource fails or is blocked (some corporate
 * proxies and privacy extensions kill long-lived connections outright).
 */
export function useFacilityLiveStatus(facilityId: string | null): FacilityLiveState {
  const [state, setState] = useState<FacilityLiveState>(
    sensorApiConfigured ? { status: "loading" } : { status: "unconfigured" },
  );
  const facilityRef = useRef<Facility | null>(null);

  useEffect(() => {
    facilityRef.current = null;

    if (!facilityId || !sensorApiConfigured) {
      setState({ status: "unconfigured" });
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let es: EventSource | null = null;
    let backoffMs = 1000;
    let sseAttempts = 0;

    setState({ status: "loading" });

    function applyFacility(facility: Facility, live: boolean, lastEvent?: FacilityUpdateEvent) {
      if (cancelled) return;
      facilityRef.current = facility;
      setState({ status: "ready", facility, live, lastEvent });
    }

    async function loadSnapshot() {
      const result = await fetchFacilitySnapshot(facilityId!);
      if (cancelled) return;
      if (!result.ok) {
        // Keep showing the last good snapshot through a transient failure —
        // only surface a hard error state if we never had one.
        if (!facilityRef.current) setState({ status: "error", error: result.error });
        return;
      }
      applyFacility(result.data, false);
    }

    function schedulePoll() {
      if (cancelled) return;
      pollTimer = setTimeout(async () => {
        await loadSnapshot();
        schedulePoll();
      }, POLL_INTERVAL_MS);
    }

    function startPolling() {
      es?.close();
      es = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollTimer) return; // already polling
      void loadSnapshot();
      schedulePoll();
    }

    function connectSSE() {
      const url = facilityStreamUrl(facilityId!);
      if (!url || typeof EventSource === "undefined") {
        startPolling();
        return;
      }

      sseAttempts += 1;
      es = new EventSource(url);

      es.addEventListener("update", (rawEvent) => {
        backoffMs = 1000;
        sseAttempts = 0;
        try {
          const payload = JSON.parse((rawEvent as MessageEvent).data) as {
            facility: Facility;
            event?: FacilityUpdateEvent;
          };
          applyFacility(payload.facility, true, payload.event);
        } catch {
          // Malformed payload for this one tick — the next tick (or the
          // polling fallback, if this keeps happening) will resync.
        }
      });

      es.onerror = () => {
        es?.close();
        es = null;
        if (cancelled) return;

        if (sseAttempts >= MAX_SSE_ATTEMPTS) {
          startPolling();
          return;
        }
        reconnectTimer = setTimeout(() => {
          backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
          connectSSE();
        }, backoffMs);
      };
    }

    // Fetch the initial snapshot immediately so the UI has real data even
    // before the stream (or first poll tick) lands, then open the stream.
    void loadSnapshot().then(() => {
      if (!cancelled) connectSSE();
    });

    return () => {
      cancelled = true;
      es?.close();
      if (pollTimer) clearTimeout(pollTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [facilityId]);

  return state;
}
