"use client";

import { ButtonLink } from "@/components/ui/button";
import { IconButton } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";
import { IconNavigation, IconX } from "@/components/ui/icons";
import { LiveBadge } from "./live-badge";
import { SpaceGrid } from "./space-grid";
import type { FacilityLiveState } from "@/lib/use-facility-live-status";

/**
 * The detail view a facility marker click (or the facility page itself)
 * shows: identity, live availability, occupancy bar, Navigate deep link, and
 * the full space grid. Used as a desktop side panel and a mobile bottom
 * sheet on /live, and embedded directly on /facilities/[facilityId].
 */
export function FacilityDetailsPanel({
  state,
  onClose,
}: {
  state: FacilityLiveState;
  onClose?: () => void;
}) {
  if (state.status === "unconfigured") {
    return (
      <div className="p-5">
        <p className="text-sm leading-relaxed text-ink-500">
          Live sensor data is not connected in this environment.
        </p>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="grid h-40 place-items-center">
        <Spinner label="Loading facility" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="p-5">
        <p className="text-sm leading-relaxed text-danger-700">{state.error.message}</p>
      </div>
    );
  }

  const { facility, live } = state;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${facility.location.lat},${facility.location.lng}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-ink-200 p-4 sm:p-5">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pp-border bg-pp-bg-elevated px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-pp-live">
            Sensor-powered
          </span>
          <h2 className="mt-1.5 truncate text-lg font-extrabold tracking-tight text-ink-950">{facility.name}</h2>
          <p className="text-sm text-ink-600">{facility.address}</p>
        </div>
        {onClose ? (
          <IconButton label="Close facility details" icon={<IconX />} size="sm" onClick={onClose} className="shrink-0" />
        ) : null}
      </div>

      <div className="border-b border-ink-200 p-4 sm:p-5">
        <LiveBadge live={live} updatedAt={facility.updatedAt} />

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <span className="text-2xl font-extrabold tracking-tight text-ink-950">
            {facility.available}/{facility.total}
          </span>
          <span className="text-sm text-ink-600">spaces available</span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={facility.occupancyPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Occupancy"
          className="mt-2 h-2 overflow-hidden rounded-full bg-ink-200"
        >
          <div
            className="h-full rounded-full bg-pp-live transition-[width] duration-300 ease-out"
            style={{ width: `${facility.occupancyPct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-ink-500">{facility.occupancyPct}% occupied</p>

        <ButtonLink
          href={mapsHref}
          target="_blank"
          rel="noreferrer noopener"
          fullWidth
          className="mt-4"
          leadingIcon={<IconNavigation />}
        >
          Navigate
        </ButtonLink>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        <h3 className="text-sm font-bold text-ink-900">
          Spaces ({facility.totalSpaces} monitored)
        </h3>
        <div className="mt-3">
          <SpaceGrid spaces={facility.spaces} />
        </div>
      </div>
    </div>
  );
}
