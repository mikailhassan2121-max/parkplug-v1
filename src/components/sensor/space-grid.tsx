"use client";

import { cn } from "@/lib/cn";
import { formatSecondsAgo } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { SpaceStatusBadge } from "./space-status-badge";
import type { FacilitySpace } from "@/lib/sensor-types";

const CARD_TONE: Record<FacilitySpace["status"], string> = {
  AVAILABLE: "border-success-100 bg-success-50/40",
  OCCUPIED: "border-danger-100 bg-danger-50/40",
  UNKNOWN: "border-ink-200 bg-ink-50",
  OFFLINE: "border-ink-200 bg-ink-50 opacity-70",
};

/** The one space-grid component every live surface (facility page + owner dashboard) shares. */
export function SpaceGrid({ spaces }: { spaces: FacilitySpace[] }) {
  const now = useNow(1000);

  if (spaces.length === 0) {
    return <p className="text-sm leading-relaxed text-ink-600">No spaces are set up for this facility yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {[...spaces]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((space) => (
          <div
            key={space.id}
            className={cn("rounded-card border p-4 transition-colors duration-300 ease-out", CARD_TONE[space.status])}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-extrabold tracking-tight text-ink-950">{space.displayName}</span>
              <SpaceStatusBadge status={space.status} size="sm" />
            </div>
            <dl className="mt-3 space-y-1 text-2xs text-ink-500">
              {space.sensor ? (
                <div className="flex items-center justify-between gap-2">
                  <dt>Sensor</dt>
                  <dd className="font-mono text-ink-700">{space.sensor.sensorId}</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2">
                <dt>Updated</dt>
                <dd aria-live="polite">{formatSecondsAgo(space.lastUpdated, now)}</dd>
              </div>
            </dl>
          </div>
        ))}
    </div>
  );
}
