"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LiveBadge } from "@/components/sensor/live-badge";
import { SpaceGrid } from "@/components/sensor/space-grid";
import { ActivityLog } from "@/components/sensor/activity-log";
import { AnalyticsPanel } from "@/components/sensor/analytics-panel";
import { SensorHealthTable } from "@/components/owner/sensor-health-table";
import { Tabs, TabPanel } from "@/components/ui/menu";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { IconBolt, IconSettings } from "@/components/ui/icons";
import { useFacilityLiveStatus } from "@/lib/use-facility-live-status";
import { fetchFacilityAnalytics, fetchFacilityEvents } from "@/lib/api/sensors";
import type { FacilityAnalytics, OccupancyEvent } from "@/lib/sensor-types";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "spaces", label: "Spaces" },
  { id: "sensors", label: "Sensors" },
  { id: "activity", label: "Activity" },
  { id: "configuration", label: "Configuration" },
];

export function OwnerFacilityView({ facilityId }: { facilityId: string }) {
  const [tab, setTab] = useState("overview");
  const state = useFacilityLiveStatus(facilityId);
  const [events, setEvents] = useState<OccupancyEvent[]>([]);
  const [analytics, setAnalytics] = useState<FacilityAnalytics | null>(null);
  const lastEventAt = state.status === "ready" ? state.lastEvent?.occurredAt : undefined;

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchFacilityEvents(facilityId), fetchFacilityAnalytics(facilityId)]).then(
      ([eventsResult, analyticsResult]) => {
        if (cancelled) return;
        if (eventsResult.ok) setEvents(eventsResult.data);
        if (analyticsResult.ok) setAnalytics(analyticsResult.data);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [facilityId, lastEventAt]);

  if (state.status === "unconfigured") {
    return (
      <EmptyState
        icon={<IconBolt />}
        title="Live sensor data is not connected"
        description="This environment does not have a live sensor API configured."
      />
    );
  }
  if (state.status === "loading") {
    return (
      <div className="grid min-h-[40dvh] place-items-center">
        <Spinner label="Loading facility" />
      </div>
    );
  }
  if (state.status === "error") {
    return <ErrorState title="We could not load this facility" description={state.error.message} />;
  }

  const { facility, live } = state;
  const sensorsOnline = facility.spaces.filter((s) => s.sensor?.onlineStatus === "ONLINE").length;
  const sensorsTotal = facility.spaces.filter((s) => s.sensor).length;

  return (
    <div>
      <Link href="/owner/facilities" className="text-xs font-semibold text-ink-500 hover:text-teal">
        ← All facilities
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">{facility.name}</h1>
          <p className="mt-1 text-sm text-ink-600">{facility.address}</p>
        </div>
        <LiveBadge live={live} updatedAt={facility.updatedAt} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Available now" value={`${facility.available}/${facility.total}`} />
        <StatCard label="Occupancy" value={`${facility.occupancyPct}%`} />
        <StatCard label="Sensors online" value={`${sensorsOnline}/${sensorsTotal}`} />
      </div>

      <Tabs label="Facility sections" tabs={TABS} active={tab} onChange={setTab} className="mt-8" />

      <TabPanel id="overview" active={tab}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            <h2 className="text-sm font-bold text-ink-900">Spaces</h2>
            <div className="mt-3">
              <SpaceGrid spaces={facility.spaces} />
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink-900">Recent activity</h2>
            <div className="mt-3">
              <ActivityLog events={events.slice(0, 6)} />
            </div>
          </div>
        </div>
      </TabPanel>

      <TabPanel id="spaces" active={tab}>
        <SpaceGrid spaces={facility.spaces} />
      </TabPanel>

      <TabPanel id="sensors" active={tab}>
        <SensorHealthTable facilityName={facility.name} spaces={facility.spaces} events={events} />
      </TabPanel>

      <TabPanel id="activity" active={tab}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ActivityLog events={events} />
          {analytics ? (
            <AnalyticsPanel analytics={analytics} />
          ) : (
            <div className="grid h-40 place-items-center rounded-card border border-ink-200 bg-ink-50">
              <Spinner label="Loading analytics" size="sm" />
            </div>
          )}
        </div>
      </TabPanel>

      <TabPanel id="configuration" active={tab}>
        <div className="rounded-card border border-dashed border-ink-300 bg-ink-50/50 p-6 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-xl text-ink-400">
            <IconSettings aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink-800">Facility configuration is not yet available</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ink-500">
            Renaming this facility, editing its address, or reassigning sensors from here is not
            supported by the API yet. Contact support if something needs to change in the meantime.
          </p>
        </div>
      </TabPanel>
    </div>
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
