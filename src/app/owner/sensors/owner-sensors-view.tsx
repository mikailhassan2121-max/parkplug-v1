"use client";

import { useEffect, useState } from "react";
import { fetchFacilityEvents } from "@/lib/api/sensors";
import { useOwnerFacilities } from "@/lib/use-owner-facilities";
import { buildAllSensorRows } from "@/lib/owner-sensors";
import { SensorHealthTable } from "@/components/owner/sensor-health-table";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { IconBolt } from "@/components/ui/icons";
import type { OccupancyEvent } from "@/lib/sensor-types";

export function OwnerSensorsView() {
  const state = useOwnerFacilities();
  const [events, setEvents] = useState<OccupancyEvent[]>([]);

  const facilities = state.status === "ready" ? state.facilities : [];

  useEffect(() => {
    if (facilities.length === 0) return;
    let cancelled = false;
    void Promise.all(facilities.map((f) => fetchFacilityEvents(f.facilityId))).then((results) => {
      if (cancelled) return;
      setEvents(results.flatMap((r) => (r.ok ? r.data : [])));
    });
    return () => {
      cancelled = true;
    };
    // Re-fetch whenever the set of facilities changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilities.map((f) => f.facilityId).join(",")]);

  const rows = buildAllSensorRows(facilities);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">Sensors</h1>
      <p className="mt-1 text-sm text-ink-600">Every device across your facilities, and its current health.</p>

      <div className="mt-6">
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className="space-y-3">
            <span className="sr-only">Loading sensors</span>
            <Skeleton className="h-12 w-full" rounded="rounded-card" />
            <Skeleton className="h-12 w-full" rounded="rounded-card" />
          </div>
        ) : state.status === "error" ? (
          <ErrorState
            title="We could not load your sensors"
            description={state.error.message}
            actions={[{ label: "Try again", onClick: () => state.reload() }]}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<IconBolt />}
            title="No sensors installed yet"
            description="Sensors will show up here as soon as a device reports in for one of your facilities."
          />
        ) : (
          <SensorHealthTable rows={rows} events={events} showFacilityColumn />
        )}
      </div>
    </div>
  );
}
