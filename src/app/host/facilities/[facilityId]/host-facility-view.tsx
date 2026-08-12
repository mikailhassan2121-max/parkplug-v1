"use client";

import { useEffect, useState } from "react";
import { Container, SectionHeading } from "@/components/ui/card";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { IconBolt } from "@/components/ui/icons";
import { LiveBadge } from "@/components/sensor/live-badge";
import { SpaceGrid } from "@/components/sensor/space-grid";
import { ActivityLog } from "@/components/sensor/activity-log";
import { AnalyticsPanel } from "@/components/sensor/analytics-panel";
import { useFacilityLiveStatus } from "@/lib/use-facility-live-status";
import { fetchFacilityAnalytics, fetchFacilityEvents } from "@/lib/api/sensors";
import type { FacilityAnalytics, OccupancyEvent } from "@/lib/sensor-types";

export function HostFacilityView({ facilityId }: { facilityId: string }) {
  const state = useFacilityLiveStatus(facilityId);
  const [events, setEvents] = useState<OccupancyEvent[]>([]);
  const [analytics, setAnalytics] = useState<FacilityAnalytics | null>(null);
  const lastEventAt = state.status === "ready" ? state.lastEvent?.occurredAt : undefined;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [eventsResult, analyticsResult] = await Promise.all([
        fetchFacilityEvents(facilityId),
        fetchFacilityAnalytics(facilityId),
      ]);
      if (cancelled) return;
      if (eventsResult.ok) setEvents(eventsResult.data);
      if (analyticsResult.ok) setAnalytics(analyticsResult.data);
    })();
    return () => {
      cancelled = true;
    };
    // Refetch whenever the live hook reports a new occupancy transition, so
    // both panels update without a page refresh — same trigger the rest of
    // the dashboard reacts to.
  }, [facilityId, lastEventAt]);

  if (state.status === "unconfigured") {
    return (
      <Container size="default" className="py-10">
        <EmptyState icon={<IconBolt />} title="Live sensor data is not connected" description="This environment does not have a live sensor API configured." />
      </Container>
    );
  }

  if (state.status === "loading") {
    return (
      <Container size="default" className="grid min-h-[40dvh] place-items-center py-10">
        <Spinner label="Loading facility" />
      </Container>
    );
  }

  if (state.status === "error") {
    return (
      <Container size="default" className="py-10">
        <ErrorState title="We could not load this facility" description={state.error.message} />
      </Container>
    );
  }

  const { facility, live } = state;
  const sensorsOnline = facility.spaces.filter((s) => s.sensor?.onlineStatus === "ONLINE").length;
  const sensorsTotal = facility.spaces.filter((s) => s.sensor).length;

  return (
    <Container size="default" className="py-8 lg:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeading eyebrow="Sensor platform" title={facility.name} description={facility.address} />
        <LiveBadge live={live} updatedAt={facility.updatedAt} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Available now" value={`${facility.available}/${facility.total}`} />
        <StatCard label="Occupancy" value={`${facility.occupancyPct}%`} />
        <StatCard label="Sensors online" value={`${sensorsOnline}/${sensorsTotal}`} />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Spaces</h2>
          <div className="mt-4">
            <SpaceGrid spaces={facility.spaces} />
          </div>
        </div>
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-bold text-ink-900">Analytics</h2>
            <div className="mt-4">
              {analytics ? (
                <AnalyticsPanel analytics={analytics} />
              ) : (
                <div className="grid h-40 place-items-center rounded-card border border-ink-200 bg-ink-50">
                  <Spinner label="Loading analytics" size="sm" />
                </div>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink-900">Recent activity</h2>
            <div className="mt-4">
              <ActivityLog events={events} />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-ink-200 bg-ink-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-ink-950">{value}</p>
    </div>
  );
}
