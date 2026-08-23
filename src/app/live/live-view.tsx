"use client";

import { useEffect, useState } from "react";
import { fetchFacilitiesList } from "@/lib/api/sensors";
import { useFacilityLiveStatus } from "@/lib/use-facility-live-status";
import { FacilityLiveMap } from "@/components/sensor/facility-live-map";
import { FacilityDetailsPanel } from "@/components/sensor/facility-details-panel";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { IconMapPin } from "@/components/ui/icons";
import type { FacilitySummary } from "@/lib/sensor-types";

// Falls back to a reasonable US-wide view when there is nothing to center on yet.
const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 };
const DEFAULT_ZOOM = 4;

export function LiveView() {
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "unconfigured">("loading");
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchFacilitiesList();
      if (cancelled) return;
      if (!result.ok) {
        setStatus(result.error.code === "network" && result.error.retryable === false ? "unconfigured" : "error");
        return;
      }
      setFacilities(result.data);
      setStatus("ready");
      if (result.data.length > 0) setSelectedId(result.data[0]!.facilityId);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const liveState = useFacilityLiveStatus(selectedId);
  const center = facilities[0]?.location ?? DEFAULT_CENTER;
  const zoom = facilities.length > 0 ? 15 : DEFAULT_ZOOM;

  if (status === "unconfigured") {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center p-6">
        <EmptyState
          icon={<IconMapPin />}
          title="Live sensor data is not connected"
          description="This environment does not have a live sensor API configured. Set NEXT_PUBLIC_API_BASE_URL to enable /live."
        />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center p-6">
        <ErrorState title="We could not load the live map" description="Check your connection and try again." />
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="grid min-h-[70dvh] place-items-center">
        <Spinner label="Loading live facilities" />
      </div>
    );
  }

  if (facilities.length === 0) {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center p-6">
        <EmptyState
          icon={<IconMapPin />}
          title="No live facilities yet"
          description="Sensor-monitored facilities will appear here as soon as they come online."
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4.5rem)]">
      <div className="relative flex-1">
        <FacilityLiveMap
          facilities={facilities}
          selectedFacilityId={selectedId}
          onSelect={setSelectedId}
          center={center}
          zoom={zoom}
        />
        <MapLegend />
      </div>

      {/* Desktop: persistent side panel. */}
      <aside className="hidden w-96 shrink-0 border-l border-ink-200 bg-pp-bg-elevated lg:block">
        <FacilityDetailsPanel state={liveState} />
      </aside>

      {/* Mobile: bottom sheet. */}
      {selectedId ? (
        <div className="fixed inset-x-0 bottom-0 z-40 max-h-[65dvh] overflow-hidden rounded-t-sheet border-t border-ink-200 bg-pp-bg-elevated shadow-e3 animate-sheet-up lg:hidden">
          <FacilityDetailsPanel state={liveState} onClose={() => setSelectedId(null)} />
        </div>
      ) : null}
    </div>
  );
}

function MapLegend() {
  return (
    <div className="absolute left-3 top-3 z-20 rounded-lg border border-pp-border bg-white/95 p-3 text-xs text-ink-700 shadow-e1">
      <p className="mb-2 text-2xs font-bold uppercase tracking-wider text-ink-500">Legend</p>
      <ul className="space-y-1.5">
        <li className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inset-0 rounded-full bg-pp-live/15" />
            <span className="relative h-3 w-3 rounded-full border border-pp-live" />
          </span>
          Sensor-monitored facility
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-success-500" />
          Spaces available
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger-500" />
          Fully occupied
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-400" />
          Offline / no data
        </li>
      </ul>
    </div>
  );
}
