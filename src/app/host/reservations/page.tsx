"use client";

import { useState } from "react";
import { reservations as reservationsApi } from "@/lib/api";
import { feesConfigured } from "@/config/business";
import { formatMoney, formatRange } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import type { Reservation } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState, ErrorState, SkeletonRow } from "@/components/ui/feedback";
import { Tabs, TabPanel } from "@/components/ui/menu";
import { Overlay } from "@/components/ui/overlay";
import { IconCalendar, IconCar, IconFlag, IconMessage } from "@/components/ui/icons";

type TabId = "upcoming" | "in_progress" | "completed" | "canceled";

function bucket(r: Reservation): TabId {
  if (r.status === "canceled" || r.status === "refunded") return "canceled";
  if (r.status === "completed") return "completed";
  const now = Date.now();
  if (new Date(r.startAt).getTime() <= now && new Date(r.endAt).getTime() >= now) return "in_progress";
  return new Date(r.endAt).getTime() < now ? "completed" : "upcoming";
}

export default function HostReservationsPage() {
  const state = useAsync(() => reservationsApi.listForHost(), []);
  const [active, setActive] = useState<TabId>("upcoming");
  const [detail, setDetail] = useState<Reservation | null>(null);

  const all = state.status === "ready" ? state.data : [];
  const groups: Record<TabId, Reservation[]> = {
    upcoming: all.filter((r) => bucket(r) === "upcoming"),
    in_progress: all.filter((r) => bucket(r) === "in_progress"),
    completed: all.filter((r) => bucket(r) === "completed"),
    canceled: all.filter((r) => bucket(r) === "canceled"),
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Reservations</h1>
      <p className="mt-1.5 text-sm text-ink-600">
        Every booking across your listings, with the vehicle details you need on arrival.
      </p>

      <Tabs
        label="Reservation status"
        className="mt-6"
        active={active}
        onChange={(id) => setActive(id as TabId)}
        tabs={[
          { id: "upcoming", label: "Upcoming", count: groups.upcoming.length },
          { id: "in_progress", label: "In progress", count: groups.in_progress.length },
          { id: "completed", label: "Completed", count: groups.completed.length },
          { id: "canceled", label: "Canceled", count: groups.canceled.length },
        ]}
      />

      <div className="mt-6">
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className="space-y-3">
            <span className="sr-only">Loading reservations</span>
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : state.status === "error" ? (
          <ErrorState
            title="We could not load your reservations"
            description={state.error.message}
            actions={[{ label: "Try again", onClick: state.reload }]}
          />
        ) : (
          (Object.keys(groups) as TabId[]).map((id) => (
            <TabPanel key={id} id={id} active={active}>
              {groups[id].length === 0 ? (
                <EmptyState
                  icon={<IconCalendar />}
                  title={`No ${id.replace("_", " ")} reservations`}
                  description="Bookings for your spaces will appear here as drivers reserve them."
                />
              ) : (
                <ul className="space-y-3">
                  {groups[id].map((r) => (
                    <li key={r.id}>
                      <article className="rounded-card border border-ink-200 bg-white p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="text-base font-bold text-ink-900">{r.listing.title}</h2>
                            <p className="mt-0.5 text-xs text-ink-600">{formatRange(r.startAt, r.endAt)}</p>
                          </div>
                          <StatusBadge status={r.status} size="sm" />
                        </div>

                        <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
                          <div>
                            <dt className="text-ink-500">Driver</dt>
                            <dd className="font-semibold text-ink-800">
                              {/* Only a display name is shared with hosts. */}
                              Reservation {r.reference}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-ink-500">Vehicle</dt>
                            <dd className="flex items-center gap-1.5 font-semibold text-ink-800">
                              <IconCar className="text-ink-400" aria-hidden="true" />
                              {r.vehicle.color} {r.vehicle.make} {r.vehicle.model}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-ink-500">Your earnings</dt>
                            <dd className="font-semibold text-ink-800">
                              {feesConfigured && r.price.hostEarningsCents !== undefined
                                ? formatMoney(r.price.hostEarningsCents, r.price.currency)
                                : "—"}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => setDetail(r)}>
                            View details
                          </Button>
                          <ButtonLink href="/host/messages" variant="secondary" size="sm" leadingIcon={<IconMessage />}>
                            Contact driver
                          </ButtonLink>
                          <ButtonLink
                            href={`/support?ref=${r.reference}`}
                            variant="ghost"
                            size="sm"
                            leadingIcon={<IconFlag />}
                          >
                            Report an issue
                          </ButtonLink>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </TabPanel>
          ))
        )}
      </div>

      <Overlay
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="Reservation details"
        description={detail?.reference}
        variant="sheet"
        size="md"
      >
        {detail ? (
          <div className="space-y-5">
            <dl className="divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200">
              {[
                ["Listing", detail.listing.title],
                ["When", formatRange(detail.startAt, detail.endAt)],
                ["Vehicle", `${detail.vehicle.color} ${detail.vehicle.make} ${detail.vehicle.model}`],
                ["License plate", `${detail.vehicle.licensePlate} · ${detail.vehicle.plateRegion}`],
                ["Payment status", detail.status === "completed" ? "Paid out" : "Held until completion"],
                [
                  "Your earnings",
                  feesConfigured && detail.price.hostEarningsCents !== undefined
                    ? formatMoney(detail.price.hostEarningsCents, detail.price.currency)
                    : "Calculated once platform fees are set",
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-wrap justify-between gap-3 px-4 py-3">
                  <dt className="text-sm text-ink-600">{label}</dt>
                  <dd className="text-sm font-semibold text-ink-900">{value}</dd>
                </div>
              ))}
            </dl>

            <Alert tone="neutral">
              Plate and vehicle details are shared so you can identify the car on
              arrival. Please do not share them outside ParkPlug.
            </Alert>

            {detail.status === "completed" ? (
              <ButtonLink href={`/reviews/new?reservation=${detail.reference}&as=host`} fullWidth>
                Review this driver
              </ButtonLink>
            ) : null}
          </div>
        ) : null}
      </Overlay>
    </div>
  );
}
