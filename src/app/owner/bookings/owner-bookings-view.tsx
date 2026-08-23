"use client";

import { useEffect, useState } from "react";
import { reservations as reservationsApi } from "@/lib/api";
import { formatMoney, formatRange } from "@/lib/format";
import { useOwnerFacilities } from "@/lib/use-owner-facilities";
import type { Reservation } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { IconCalendar, IconCar } from "@/components/ui/icons";

type ReservationWithListing = Reservation & { listingId: string };

export function OwnerBookingsView() {
  const facilitiesState = useOwnerFacilities();
  const [bookings, setBookings] = useState<ReservationWithListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const facilities = facilitiesState.status === "ready" ? facilitiesState.facilities : [];
  const listingIds = new Set(facilities.map((f) => f.listingId).filter((id): id is string => Boolean(id)));

  useEffect(() => {
    if (facilitiesState.status !== "ready") return;
    let cancelled = false;
    void reservationsApi.listForHost().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setBookings(result.data as ReservationWithListing[]);
    });
    return () => {
      cancelled = true;
    };
  }, [facilitiesState.status]);

  const facilityBookings = (bookings ?? []).filter((r) => listingIds.has(r.listingId));

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">Bookings</h1>
      <p className="mt-1 text-sm text-ink-600">Marketplace reservations for facilities linked to a listing.</p>

      <div className="mt-6">
        {facilitiesState.status === "loading" || (facilitiesState.status === "ready" && bookings === null && !error) ? (
          <div role="status" aria-busy="true" className="space-y-3">
            <span className="sr-only">Loading bookings</span>
            <Skeleton className="h-16 w-full" rounded="rounded-card" />
            <Skeleton className="h-16 w-full" rounded="rounded-card" />
          </div>
        ) : facilitiesState.status === "error" ? (
          <ErrorState
            title="We could not load your facilities"
            description={facilitiesState.error.message}
            actions={[{ label: "Try again", onClick: () => facilitiesState.reload() }]}
          />
        ) : error ? (
          <ErrorState title="We could not load bookings" description={error} />
        ) : listingIds.size === 0 ? (
          <EmptyState
            icon={<IconCalendar />}
            title="No facilities are linked to a marketplace listing"
            description="Bookings only apply to facilities that are also listed on the marketplace. Facility occupancy on its own isn't a reservation."
          />
        ) : facilityBookings.length === 0 ? (
          <EmptyState
            icon={<IconCalendar />}
            title="No bookings yet"
            description="Reservations for your listed facilities will appear here as drivers book them."
          />
        ) : (
          <ul className="space-y-3">
            {facilityBookings.map((r) => (
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
                      <dt className="text-ink-500">Reservation</dt>
                      <dd className="font-semibold text-ink-800">{r.reference}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Vehicle</dt>
                      <dd className="flex items-center gap-1.5 font-semibold text-ink-800">
                        <IconCar className="text-ink-400" aria-hidden="true" />
                        {r.vehicle.color} {r.vehicle.make} {r.vehicle.model}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Amount</dt>
                      <dd className="font-semibold text-ink-800">{formatMoney(r.price.totalCents, r.price.currency)}</dd>
                    </div>
                  </dl>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
