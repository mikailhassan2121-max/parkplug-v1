"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchFacilityEvents } from "@/lib/api/sensors";
import { useOwnerFacilities } from "@/lib/use-owner-facilities";
import type { Facility, OccupancyEvent } from "@/lib/sensor-types";
import { ActivityLog } from "@/components/sensor/activity-log";
import { SpaceGrid } from "@/components/sensor/space-grid";
import { ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { IconBuilding, IconWifi, IconWifiOff } from "@/components/ui/icons";

export function OwnerOverview() {
  const state = useOwnerFacilities();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const facilities = state.status === "ready" ? state.facilities : [];
  const selected: Facility | undefined =
    facilities.find((f) => f.facilityId === selectedId) ?? facilities[0];
  const firstFacilityId = facilities[0]?.facilityId;

  useEffect(() => {
    if (!selectedId && firstFacilityId) setSelectedId(firstFacilityId);
  }, [firstFacilityId, selectedId]);

  if (state.status === "loading") {
    return (
      <div role="status" aria-busy="true" className="space-y-4">
        <span className="sr-only">Loading your facilities</span>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" rounded="rounded-card" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <ErrorState
        title="We could not load your facilities"
        description={state.error.message}
        actions={[{ label: "Try again", onClick: () => state.reload() }]}
      />
    );
  }

  if (facilities.length === 0) {
    return (
      <EmptyState
        icon={<IconBuilding />}
        title="No facilities connected yet"
        description="Once a sensor-monitored facility is set up under your account, its live occupancy, sensor health, and activity will show up here."
        actions={[{ label: "Learn about sensor setup", href: "/for-property-owners" }]}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">Overview</h1>
          <p className="mt-1 text-sm text-ink-600">What is happening across your parking right now.</p>
        </div>
        {facilities.length > 1 ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-ink-700">Facility</span>
            <Select value={selected?.facilityId} onChange={(e) => setSelectedId(e.target.value)} className="w-auto">
              {facilities.map((f) => (
                <option key={f.facilityId} value={f.facilityId}>
                  {f.name}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
      </div>

      {selected ? <FacilityOverview facility={selected} /> : null}
    </div>
  );
}

function FacilityOverview({ facility }: { facility: Facility }) {
  const [events, setEvents] = useState<OccupancyEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEvents(null);
    void fetchFacilityEvents(facility.facilityId).then((result) => {
      if (!cancelled) setEvents(result.ok ? result.data : []);
    });
    return () => {
      cancelled = true;
    };
  }, [facility.facilityId]);

  const sensorsTotal = facility.spaces.filter((s) => s.sensor).length;
  const sensorsOnline = facility.spaces.filter((s) => s.sensor?.onlineStatus === "ONLINE").length;
  const sensorsOffline = sensorsTotal - sensorsOnline;

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-card border border-ink-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink-950">{facility.name}</h2>
            <p className="text-sm text-ink-600">{facility.address}</p>
          </div>
          <ButtonLink href={`/owner/facilities/${facility.facilityId}`} variant="secondary" size="sm">
            View facility
          </ButtonLink>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Available" value={facility.available} tone="text-success-700" />
          <Stat label="Occupied" value={facility.occupied} tone="text-danger-700" />
          <Stat label="Occupancy" value={`${facility.occupancyPct}%`} tone="text-ink-950" />
          <Stat
            label="Sensors online"
            value={sensorsTotal > 0 ? `${sensorsOnline}/${sensorsTotal}` : "None"}
            tone={sensorsOffline > 0 ? "text-warning-700" : "text-ink-950"}
            icon={sensorsOffline > 0 ? <IconWifiOff /> : <IconWifi />}
          />
        </dl>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-card border border-ink-200 bg-white p-5 sm:p-6">
          <h3 className="text-sm font-bold text-ink-900">Spaces ({facility.totalSpaces})</h3>
          <div className="mt-3">
            <SpaceGrid spaces={facility.spaces} />
          </div>
        </div>

        <div className="rounded-card border border-ink-200 bg-white p-5 sm:p-6">
          <h3 className="text-sm font-bold text-ink-900">Recent activity</h3>
          <div className="mt-3">
            {events === null ? (
              <div role="status" aria-busy="true" className="space-y-2">
                <span className="sr-only">Loading activity</span>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <ActivityLog events={events} />
            )}
          </div>
        </div>
      </div>

      <div className="rounded-card border border-ink-200 bg-white p-5 text-sm text-ink-600 sm:p-6">
        Bookings and occupancy analytics for this facility live under{" "}
        <Link href="/owner/analytics" className="font-semibold text-teal hover:underline">
          Analytics
        </Link>
        .
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string | number;
  tone: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-500">{label}</dt>
      <dd className={`mt-1 flex items-center gap-1.5 text-xl font-extrabold tracking-tight ${tone}`}>
        {icon ? <span className="text-base" aria-hidden="true">{icon}</span> : null}
        {value}
      </dd>
    </div>
  );
}
