"use client";

import { useEffect, useState } from "react";
import { fetchFacilityAnalytics } from "@/lib/api/sensors";
import { useOwnerFacilities } from "@/lib/use-owner-facilities";
import { AnalyticsPanel } from "@/components/sensor/analytics-panel";
import { Select } from "@/components/ui/form";
import { EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui/feedback";
import { IconChart } from "@/components/ui/icons";
import type { FacilityAnalytics } from "@/lib/sensor-types";

export function OwnerAnalyticsView() {
  const state = useOwnerFacilities();
  const facilities = state.status === "ready" ? state.facilities : [];
  const firstFacilityId = facilities[0]?.facilityId;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<FacilityAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (!selectedId && firstFacilityId) setSelectedId(firstFacilityId);
  }, [firstFacilityId, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoadingAnalytics(true);
    void fetchFacilityAnalytics(selectedId).then((result) => {
      if (cancelled) return;
      setAnalytics(result.ok ? result.data : null);
      setLoadingAnalytics(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-ink-600">Occupancy trends derived from real sensor activity.</p>
        </div>
        {facilities.length > 1 ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-ink-700">Facility</span>
            <Select value={selectedId ?? undefined} onChange={(e) => setSelectedId(e.target.value)} className="w-auto">
              {facilities.map((f) => (
                <option key={f.facilityId} value={f.facilityId}>
                  {f.name}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
      </div>

      <div className="mt-6">
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className="space-y-3">
            <span className="sr-only">Loading analytics</span>
            <Skeleton className="h-48 w-full" rounded="rounded-card" />
          </div>
        ) : state.status === "error" ? (
          <ErrorState
            title="We could not load your facilities"
            description={state.error.message}
            actions={[{ label: "Try again", onClick: () => state.reload() }]}
          />
        ) : facilities.length === 0 ? (
          <EmptyState
            icon={<IconChart />}
            title="No facilities to analyze yet"
            description="Occupancy trends will appear here once a facility is connected and sensors start reporting."
          />
        ) : loadingAnalytics || !analytics ? (
          <div className="grid h-48 place-items-center rounded-card border border-ink-200 bg-ink-50">
            <Spinner label="Loading analytics" />
          </div>
        ) : (
          <AnalyticsPanel analytics={analytics} />
        )}
      </div>
    </div>
  );
}
