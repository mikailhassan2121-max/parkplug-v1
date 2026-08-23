"use client";

import { useOwnerFacilities } from "@/lib/use-owner-facilities";
import { SpaceStatusBadge } from "@/components/sensor/space-status-badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { IconGarage, IconInfo } from "@/components/ui/icons";

export function OwnerSpacesView() {
  const state = useOwnerFacilities();
  const facilities = state.status === "ready" ? state.facilities : [];
  const totalSpaces = facilities.reduce((sum, f) => sum + f.spaces.length, 0);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">Parking spaces</h1>
      <p className="mt-1 text-sm text-ink-600">Every monitored space across your facilities.</p>

      <div className="mt-4 flex gap-2.5 rounded-xl border border-ink-200 bg-ink-50 p-3.5 text-xs leading-relaxed text-ink-600">
        <IconInfo className="mt-px shrink-0 text-ink-400" aria-hidden="true" />
        <span>
          Editing a space&apos;s availability type, accessibility, or reservation rules from here is not
          supported by the API yet — this view is read-only and reflects each space&apos;s current sensor
          status.
        </span>
      </div>

      <div className="mt-6">
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className="space-y-3">
            <span className="sr-only">Loading spaces</span>
            <Skeleton className="h-12 w-full" rounded="rounded-card" />
            <Skeleton className="h-12 w-full" rounded="rounded-card" />
          </div>
        ) : state.status === "error" ? (
          <ErrorState
            title="We could not load your spaces"
            description={state.error.message}
            actions={[{ label: "Try again", onClick: () => state.reload() }]}
          />
        ) : totalSpaces === 0 ? (
          <EmptyState icon={<IconGarage />} title="No spaces yet" description="Spaces will appear here once a facility is connected." />
        ) : (
          <div className="overflow-x-auto rounded-card border border-ink-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-3">Identifier</th>
                  <th scope="col" className="px-4 py-3">Facility</th>
                  <th scope="col" className="px-4 py-3">Sensor</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-200 bg-white">
                {facilities.flatMap((facility) =>
                  [...facility.spaces]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((space) => (
                      <tr key={space.id} className="transition-colors hover:bg-ink-50">
                        <td className="px-4 py-3 font-semibold text-ink-900">{space.displayName}</td>
                        <td className="px-4 py-3 text-ink-700">{facility.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-600">
                          {space.sensor?.sensorId ?? "Unassigned"}
                        </td>
                        <td className="px-4 py-3">
                          <SpaceStatusBadge status={space.status} size="sm" />
                        </td>
                      </tr>
                    )),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
