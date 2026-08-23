"use client";

import Link from "next/link";
import { useOwnerFacilities } from "@/lib/use-owner-facilities";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { IconGarage, IconWifi, IconWifiOff } from "@/components/ui/icons";

export function OwnerFacilitiesView() {
  const state = useOwnerFacilities();

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">Facilities</h1>
      <p className="mt-1 text-sm text-ink-600">Every sensor-monitored facility connected to your account.</p>

      <div className="mt-6">
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className="space-y-3">
            <span className="sr-only">Loading facilities</span>
            <Skeleton className="h-16 w-full" rounded="rounded-card" />
            <Skeleton className="h-16 w-full" rounded="rounded-card" />
          </div>
        ) : state.status === "error" ? (
          <ErrorState
            title="We could not load your facilities"
            description={state.error.message}
            actions={[{ label: "Try again", onClick: () => state.reload() }]}
          />
        ) : state.facilities.length === 0 ? (
          <EmptyState
            icon={<IconGarage />}
            title="No facilities yet"
            description="Sensor-monitored facilities connected to your account will appear here."
          />
        ) : (
          <>
            {/* Table on wide screens */}
            <div className="hidden overflow-hidden rounded-card border border-ink-200 lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Facility</th>
                    <th scope="col" className="px-4 py-3">Spaces</th>
                    <th scope="col" className="px-4 py-3">Occupancy</th>
                    <th scope="col" className="px-4 py-3">Sensor health</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200 bg-white">
                  {state.facilities.map((facility) => {
                    const sensorsTotal = facility.spaces.filter((s) => s.sensor).length;
                    const sensorsOnline = facility.spaces.filter((s) => s.sensor?.onlineStatus === "ONLINE").length;
                    return (
                      <tr key={facility.id} className="transition-colors hover:bg-ink-50">
                        <td className="px-4 py-3">
                          <Link
                            href={`/owner/facilities/${facility.facilityId}`}
                            className="font-bold text-ink-950 hover:text-teal hover:underline"
                          >
                            {facility.name}
                          </Link>
                          <p className="text-xs text-ink-500">{facility.address}</p>
                        </td>
                        <td className="px-4 py-3 text-ink-800">{facility.totalSpaces}</td>
                        <td className="px-4 py-3 text-ink-800">
                          {facility.available}/{facility.total} available
                          <span className="ml-1.5 text-xs text-ink-500">({facility.occupancyPct}%)</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                              sensorsTotal > 0 && sensorsOnline === sensorsTotal ? "text-ink-700" : "text-warning-700"
                            }`}
                          >
                            {sensorsTotal > 0 && sensorsOnline === sensorsTotal ? (
                              <IconWifi aria-hidden="true" />
                            ) : (
                              <IconWifiOff aria-hidden="true" />
                            )}
                            {sensorsOnline}/{sensorsTotal} online
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-teal">
                            Live
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Structured cards on small screens — the table's columns don't
                fit without either overflow or unreadable truncation. */}
            <ul className="space-y-3 lg:hidden">
              {state.facilities.map((facility) => {
                const sensorsTotal = facility.spaces.filter((s) => s.sensor).length;
                const sensorsOnline = facility.spaces.filter((s) => s.sensor?.onlineStatus === "ONLINE").length;
                return (
                  <li key={facility.id}>
                    <Link
                      href={`/owner/facilities/${facility.facilityId}`}
                      className="block rounded-card border border-ink-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-ink-950">{facility.name}</p>
                          <p className="truncate text-xs text-ink-500">{facility.address}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-teal">
                          Live
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-ink-500">Spaces</dt>
                          <dd className="font-semibold text-ink-800">{facility.totalSpaces}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-500">Occupancy</dt>
                          <dd className="font-semibold text-ink-800">{facility.occupancyPct}%</dd>
                        </div>
                        <div>
                          <dt className="text-ink-500">Sensors</dt>
                          <dd
                            className={`font-semibold ${
                              sensorsTotal > 0 && sensorsOnline === sensorsTotal ? "text-ink-800" : "text-warning-700"
                            }`}
                          >
                            {sensorsOnline}/{sensorsTotal}
                          </dd>
                        </div>
                      </dl>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
