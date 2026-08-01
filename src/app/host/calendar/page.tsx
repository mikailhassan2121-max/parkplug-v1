"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { listings as listingsApi, reservations as reservationsApi } from "@/lib/api";
import { DAY_SHORT, formatDate, formatRange } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Button, IconButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { Overlay } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@/components/ui/icons";

type View = "month" | "week" | "list";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthGrid(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export default function HostCalendarPage() {
  const listingsState = useAsync(() => listingsApi.listForHost(), []);
  const reservationsState = useAsync(() => reservationsApi.listForHost(), []);
  const { toast } = useToast();

  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<View>("month");
  const [listingFilter, setListingFilter] = useState("all");
  const [blocked, setBlocked] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const listings = listingsState.status === "ready" ? listingsState.data : [];
  const reservations = useMemo(() => {
    const all = reservationsState.status === "ready" ? reservationsState.data : [];
    return listingFilter === "all" ? all : all.filter((r) => r.listingId === listingFilter);
  }, [reservationsState, listingFilter]);

  const grid = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const monthLabel = anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function reservationsOn(day: Date) {
    return reservations.filter((r) => sameDay(new Date(r.startAt), day));
  }

  function isBlocked(day: Date) {
    return blocked.includes(day.toDateString());
  }

  function toggleBlocked(day: Date) {
    const key = day.toDateString();
    const nowBlocked = !blocked.includes(key);
    setBlocked((prev) => (nowBlocked ? [...prev, key] : prev.filter((d) => d !== key)));
    toast({
      tone: "success",
      title: nowBlocked ? "Date blocked" : "Date opened",
      description: `${formatDate(day.toISOString(), true)} is now ${nowBlocked ? "unavailable" : "available"}.`,
    });
    setSelectedDay(null);
  }

  const loading = listingsState.status === "loading" || reservationsState.status === "loading";
  const failed = listingsState.status === "error" || reservationsState.status === "error";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Calendar</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            See bookings and block dates when a space is not available.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------ Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <IconButton
            label="Previous month"
            icon={<IconChevronLeft />}
            size="sm"
            variant="secondary"
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
          />
          <IconButton
            label="Next month"
            icon={<IconChevronRight />}
            size="sm"
            variant="secondary"
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
          />
        </div>
        <p className="text-base font-bold text-ink-900" aria-live="polite">
          {monthLabel}
        </p>
        <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
          Today
        </Button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label htmlFor="listing-filter" className="sr-only">
            Filter by listing
          </label>
          <Select
            id="listing-filter"
            size="sm"
            value={listingFilter}
            onChange={(e) => setListingFilter(e.target.value)}
          >
            <option value="all">All listings</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.title}
              </option>
            ))}
          </Select>

          <div role="group" aria-label="Calendar view" className="inline-flex rounded-xl border border-ink-300 p-0.5">
            {(["month", "week", "list"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors",
                  view === v ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-ink-100",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------- Body */}
      <div className="mt-6">
        {loading ? (
          <Skeleton className="h-96 w-full" rounded="rounded-card" />
        ) : failed ? (
          <ErrorState
            title="Calendar could not be loaded"
            description="We could not reach your listings or reservations."
            actions={[
              { label: "Try again", onClick: () => { listingsState.reload(); reservationsState.reload(); } },
            ]}
          />
        ) : listings.length === 0 ? (
          <EmptyState
            icon={<IconCalendar />}
            title="No listings to schedule yet"
            description="Once you publish a space, its bookings and blocked dates appear here."
            actions={[{ label: "Create a listing", href: "/host/listings/new" }]}
          />
        ) : view === "list" ? (
          <ListView reservations={reservations} />
        ) : (
          <>
            <div className="overflow-hidden rounded-card border border-ink-200 bg-white">
              <div className="grid grid-cols-7 border-b border-ink-200 bg-ink-50">
                {DAY_SHORT.map((day) => (
                  <div key={day} className="px-1 py-2 text-center text-2xs font-bold uppercase tracking-wide text-ink-600">
                    <span aria-hidden="true">{day}</span>
                    <span className="sr-only">{day}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {(view === "week" ? grid.slice(0, 7) : grid).map((day) => {
                  const inMonth = day.getMonth() === anchor.getMonth();
                  const today = sameDay(day, new Date());
                  const dayReservations = reservationsOn(day);
                  const dayBlocked = isBlocked(day);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      aria-label={`${formatDate(day.toISOString(), true)}${
                        dayReservations.length ? `, ${dayReservations.length} reservations` : ""
                      }${dayBlocked ? ", blocked" : ""}`}
                      className={cn(
                        "min-h-20 border-b border-r border-ink-200 p-1.5 text-left transition-colors last:border-r-0 sm:min-h-24",
                        inMonth ? "bg-white hover:bg-ink-50" : "bg-ink-50/60 text-ink-400",
                        dayBlocked && "bg-ink-100",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-grid h-6 w-6 place-items-center rounded-full text-xs font-bold",
                          today ? "bg-brand-600 text-white" : inMonth ? "text-ink-800" : "text-ink-400",
                        )}
                      >
                        {day.getDate()}
                      </span>

                      {dayBlocked ? (
                        <span className="mt-1 block truncate rounded bg-ink-300 px-1 py-0.5 text-2xs font-bold text-ink-800">
                          Blocked
                        </span>
                      ) : null}

                      {dayReservations.slice(0, 2).map((r) => (
                        <span
                          key={r.id}
                          className={cn(
                            "mt-1 block truncate rounded px-1 py-0.5 text-2xs font-semibold",
                            r.status === "confirmed"
                              ? "bg-success-100 text-success-700"
                              : "bg-warning-100 text-warning-700",
                          )}
                        >
                          {r.listing.title}
                        </span>
                      ))}
                      {dayReservations.length > 2 ? (
                        <span className="mt-0.5 block text-2xs text-ink-500">
                          +{dayReservations.length - 2} more
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
              {[
                { color: "bg-success-100 ring-success-300", label: "Confirmed booking" },
                { color: "bg-warning-100 ring-warning-300", label: "Pending booking" },
                { color: "bg-ink-300 ring-ink-400", label: "Blocked by you" },
                { color: "bg-white ring-ink-300", label: "Available" },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-1.5 text-ink-600">
                  <span aria-hidden="true" className={cn("h-3 w-3 rounded ring-1", item.color)} />
                  {item.label}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <Overlay
        open={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? formatDate(selectedDay.toISOString(), true) : ""}
        variant="sheet"
        size="md"
      >
        {selectedDay ? (
          <div className="space-y-5">
            {reservationsOn(selectedDay).length > 0 ? (
              <div>
                <h3 className="text-sm font-bold text-ink-900">Reservations</h3>
                <ul className="mt-3 space-y-3">
                  {reservationsOn(selectedDay).map((r) => (
                    <li key={r.id} className="rounded-xl border border-ink-200 p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink-900">{r.listing.title}</p>
                          <p className="mt-0.5 text-xs text-ink-600">{formatRange(r.startAt, r.endAt)}</p>
                          <p className="mt-0.5 text-xs text-ink-600">
                            {r.vehicle.make} {r.vehicle.model} · {r.vehicle.licensePlate}
                          </p>
                        </div>
                        <StatusBadge status={r.status} size="sm" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-ink-600">No reservations on this date.</p>
            )}

            <div className="border-t border-ink-200 pt-5">
              <Button
                variant={isBlocked(selectedDay) ? "secondary" : "destructive"}
                fullWidth
                onClick={() => toggleBlocked(selectedDay)}
              >
                {isBlocked(selectedDay) ? "Open this date" : "Block this date"}
              </Button>
              <p className="mt-2 text-xs text-ink-500">
                Blocking a date stops new reservations. Bookings that are already
                confirmed are not canceled.
              </p>
            </div>
          </div>
        ) : null}
      </Overlay>
    </div>
  );
}

function ListView({
  reservations,
}: {
  reservations: Array<import("@/lib/types").Reservation>;
}) {
  if (reservations.length === 0) {
    return (
      <EmptyState
        icon={<IconCalendar />}
        title="No reservations to show"
        description="Bookings for your spaces will be listed here."
      />
    );
  }
  return (
    <ul className="divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200 bg-white">
      {reservations.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink-900">{r.listing.title}</p>
            <p className="mt-0.5 text-xs text-ink-600">{formatRange(r.startAt, r.endAt)}</p>
          </div>
          <StatusBadge status={r.status} size="sm" />
        </li>
      ))}
    </ul>
  );
}
