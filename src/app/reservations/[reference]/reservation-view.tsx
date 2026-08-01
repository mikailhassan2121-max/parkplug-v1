"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { reservations as reservationsApi } from "@/lib/api";
import { ERROR_COPY } from "@/lib/api/result";
import { formatDate, formatDateTime, formatDuration, formatMoneyExact, formatRange, minutesBetween } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import type { ExactAddress, Reservation } from "@/lib/types";
import { Container } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import {
  IconCalendar,
  IconCar,
  IconCheckCircle,
  IconCopy,
  IconDownload,
  IconHelp,
  IconMapPin,
  IconMessage,
  IconNavigation,
  IconShare,
} from "@/components/ui/icons";
import { ParkingMap } from "@/components/map/parking-map";
import { PriceBreakdown } from "@/components/listing/price-breakdown";

function formatAddress(address: ExactAddress): string {
  return [
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.postalCode}`,
  ]
    .filter(Boolean)
    .join(", ");
}

export function ReservationView({ reference }: { reference: string }) {
  const params = useSearchParams();
  const isNew = params.get("new") === "1";
  const state = useAsync(() => reservationsApi.get(reference), [reference]);

  if (state.status === "loading") {
    return (
      <Container size="default" className="py-10">
        <div role="status" aria-busy="true">
          <span className="sr-only">Loading your reservation</span>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="mt-6 h-64 w-full" rounded="rounded-card" />
        </div>
      </Container>
    );
  }

  if (state.status === "error") {
    const copy = ERROR_COPY[state.error.code];
    return (
      <Container size="narrow" className="py-16">
        <ErrorState
          title={state.error.code === "not_found" ? "We could not find that reservation" : copy.title}
          description={
            state.error.code === "not_found"
              ? "Check the reference, or open it from your reservations list."
              : state.error.message || copy.description
          }
          actions={[
            { label: "My reservations", href: "/dashboard/reservations" },
            { label: "Contact support", href: "/support", variant: "secondary" },
          ]}
        />
      </Container>
    );
  }

  return <ReservationDetail reservation={state.data} isNew={isNew} onChanged={state.reload} />;
}

function ReservationDetail({
  reservation,
  isNew,
  onChanged,
}: {
  reservation: Reservation;
  isNew: boolean;
  onChanged: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const minutes = minutesBetween(reservation.startAt, reservation.endAt);
  const address = reservation.exactAddress;
  const addressReleased =
    Boolean(address) && (reservation.status === "confirmed" || reservation.status === "in_progress");

  async function cancel() {
    setCanceling(true);
    const result = await reservationsApi.cancel(reservation.reference);
    setCanceling(false);
    setCancelOpen(false);
    if (result.ok) {
      toast({
        tone: "success",
        title: "Reservation canceled",
        description: "Any refund follows the cancellation policy on this booking.",
      });
      onChanged();
    } else {
      toast({ tone: "error", title: "Could not cancel", description: result.error.message });
    }
  }

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(reservation.reference);
      toast({ tone: "success", title: "Reference copied" });
    } catch {
      toast({ tone: "error", title: "Could not copy the reference" });
    }
  }

  async function shareArrival() {
    const text = addressReleased && address
      ? `I'm parking at ${formatAddress(address)} on ${formatRange(reservation.startAt, reservation.endAt)}. ParkPlug reference ${reservation.reference}.`
      : `I have a ParkPlug reservation (${reservation.reference}) on ${formatRange(reservation.startAt, reservation.endAt)}.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My parking details", text });
        return;
      } catch {
        /* Dismissed — fall through to clipboard. */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ tone: "success", title: "Arrival details copied" });
    } catch {
      toast({ tone: "error", title: "Could not share arrival details" });
    }
  }

  const directionsHref =
    addressReleased && address
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatAddress(address))}`
      : null;

  return (
    <Container size="default" className="py-6 lg:py-10">
      {isNew ? (
        <div className="mb-8 rounded-card border-2 border-success-500 bg-success-50 p-6 text-center animate-scale-in">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-500 text-2xl text-white">
            <IconCheckCircle aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-950">
            Your parking is reserved
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-700">
            We have sent a confirmation to your email. The exact address and
            entry instructions are below — bring them with you.
          </p>
        </div>
      ) : (
        <nav aria-label="Breadcrumb" className="mb-4">
          <Link
            href="/dashboard/reservations"
            className="text-xs font-semibold text-ink-600 underline-offset-2 hover:text-brand-700 hover:underline"
          >
            ← All reservations
          </Link>
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {!isNew ? (
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {reservation.listing.title}
            </h1>
          ) : (
            <h2 className="text-xl font-bold tracking-tight">{reservation.listing.title}</h2>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusBadge status={reservation.status} />
            <button
              type="button"
              onClick={() => void copyReference()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink-100 px-2.5 py-1 font-mono text-xs font-bold text-ink-800 transition-colors hover:bg-ink-200"
            >
              {reservation.reference}
              <IconCopy aria-hidden="true" />
              <span className="sr-only">Copy reservation reference</span>
            </button>
          </div>
        </div>
      </div>

      {reservation.status === "canceled" ? (
        <Alert tone="neutral" className="mt-6" title="This reservation was canceled">
          Canceled on {formatDateTime(reservation.canceledAt ?? reservation.createdAt)}. Any refund
          follows the cancellation policy that applied at the time.
        </Alert>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="min-w-0 space-y-8">
          {/* -------------------------------------------------------- When */}
          <section aria-labelledby="when-heading" className="rounded-card border border-ink-200 p-5">
            <h2 id="when-heading" className="flex items-center gap-2 text-base font-bold">
              <IconCalendar className="text-brand-600" aria-hidden="true" /> When
            </h2>
            <p className="mt-2.5 text-lg font-bold text-ink-950">
              {formatRange(reservation.startAt, reservation.endAt)}
            </p>
            <p className="mt-0.5 text-sm text-ink-600">{formatDuration(minutes)}</p>
          </section>

          {/* ----------------------------------------------------- Location */}
          <section aria-labelledby="where-heading">
            <h2 id="where-heading" className="flex items-center gap-2 text-base font-bold">
              <IconMapPin className="text-brand-600" aria-hidden="true" /> Where to park
            </h2>

            {addressReleased && address ? (
              <>
                <address className="mt-2.5 not-italic">
                  <p className="text-lg font-bold text-ink-950">{address.line1}</p>
                  {address.line2 ? <p className="text-sm text-ink-700">{address.line2}</p> : null}
                  <p className="text-sm text-ink-700">
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                </address>

                <div className="mt-4 overflow-hidden rounded-card border border-ink-200">
                  <ParkingMap
                    center={reservation.listing.location.center}
                    zoom={16}
                    destination={reservation.listing.location.center}
                    className="h-56 sm:h-72"
                    showRecenter={false}
                    ariaLabel={`Map showing ${formatAddress(address)}`}
                  />
                </div>

                {directionsHref ? (
                  <ButtonLink
                    href={directionsHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-4"
                    leadingIcon={<IconNavigation />}
                  >
                    Get directions
                  </ButtonLink>
                ) : null}
              </>
            ) : (
              <Alert tone="info" className="mt-2.5">
                The exact address appears here once the reservation is confirmed.
              </Alert>
            )}
          </section>

          {/* ------------------------------------------- Host instructions */}
          {reservation.hostInstructions && addressReleased ? (
            <section aria-labelledby="instructions-heading" className="rounded-card border border-brand-200 bg-brand-50 p-5">
              <h2 id="instructions-heading" className="text-base font-bold">
                Instructions from your host
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-800">
                {reservation.hostInstructions}
              </p>
            </section>
          ) : null}

          {/* ------------------------------------------------------ Vehicle */}
          <section aria-labelledby="vehicle-heading" className="rounded-card border border-ink-200 p-5">
            <h2 id="vehicle-heading" className="flex items-center gap-2 text-base font-bold">
              <IconCar className="text-brand-600" aria-hidden="true" /> Your vehicle
            </h2>
            <p className="mt-2.5 text-sm font-semibold text-ink-900">
              {reservation.vehicle.color} {reservation.vehicle.make} {reservation.vehicle.model}
            </p>
            <p className="mt-0.5 text-sm text-ink-600">
              {reservation.vehicle.licensePlate} · {reservation.vehicle.plateRegion}
            </p>
          </section>

          {/* ----------------------------------------------------- Timeline */}
          {reservation.timeline.length > 0 ? (
            <section aria-labelledby="timeline-heading">
              <h2 id="timeline-heading" className="text-base font-bold">
                Reservation history
              </h2>
              <ol className="mt-3 space-y-4 border-l-2 border-ink-200 pl-5">
                {reservation.timeline.map((entry, i) => (
                  <li key={`${entry.at}-${i}`} className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white"
                    />
                    <p className="text-sm font-semibold text-ink-900">{entry.label}</p>
                    <p className="text-xs text-ink-500">{formatDateTime(entry.at)}</p>
                    {entry.description ? (
                      <p className="mt-0.5 text-xs text-ink-600">{entry.description}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {/* ------------------------------------------------ What's next */}
          {isNew ? (
            <section aria-labelledby="next-heading" className="rounded-card border border-ink-200 bg-ink-50 p-5">
              <h2 id="next-heading" className="text-base font-bold">What happens next</h2>
              <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-700">
                <li>1. We email your confirmation and receipt.</li>
                <li>2. You get a reminder before your arrival time.</li>
                <li>3. Arrive within your booked window and park in the described space.</li>
                <li>4. Leave by your departure time, then review your host.</li>
              </ol>
            </section>
          ) : null}
        </div>

        {/* ------------------------------------------------------- Sidebar */}
        <aside aria-label="Reservation actions">
          <div className="space-y-5 lg:sticky lg:top-24">
            <div className="rounded-card border border-ink-200 p-5">
              <h2 className="text-base font-bold">Payment</h2>
              <div className="mt-3">
                <PriceBreakdown
                  price={reservation.price}
                  minutes={minutes}
                  hourlyRateCents={reservation.listing.pricePerHourCents}
                />
              </div>
              <p className="mt-3 text-xs text-ink-500">
                Paid {formatMoneyExact(reservation.price.totalCents, reservation.price.currency)} on{" "}
                {formatDate(reservation.createdAt, true)}
              </p>
              <Button variant="secondary" size="sm" fullWidth className="mt-3" leadingIcon={<IconDownload />}>
                Download receipt
              </Button>
            </div>

            <div className="space-y-2.5">
              <Button variant="secondary" fullWidth leadingIcon={<IconShare />} onClick={() => void shareArrival()}>
                Share arrival details
              </Button>
              <ButtonLink href="/messages" variant="secondary" fullWidth leadingIcon={<IconMessage />}>
                Contact host
              </ButtonLink>
              <ButtonLink
                href={`/support?ref=${reservation.reference}`}
                variant="secondary"
                fullWidth
                leadingIcon={<IconHelp />}
              >
                Contact support
              </ButtonLink>
              {reservation.canReview ? (
                <ButtonLink href={`/reviews/new?reservation=${reservation.reference}`} fullWidth>
                  Leave a review
                </ButtonLink>
              ) : null}
            </div>

            <div className="rounded-card border border-ink-200 p-5">
              <h2 className="text-sm font-bold">Cancellation</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-600">
                {reservation.cancellationPolicy.summary}
              </p>
              {reservation.canCancel && reservation.status !== "canceled" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  className="mt-3 text-danger-700 hover:bg-danger-50"
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel reservation
                </Button>
              ) : null}
            </div>

            <Button
              variant="ghost"
              fullWidth
              onClick={() => router.push("/dashboard/reservations")}
            >
              Back to my reservations
            </Button>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => void cancel()}
        loading={canceling}
        title="Cancel this reservation?"
        description={
          <>
            <p>{reservation.cancellationPolicy.summary}</p>
            <p className="mt-2">
              Your host will be notified, and the space will be released for other
              drivers. This cannot be undone.
            </p>
          </>
        }
        confirmLabel="Cancel reservation"
        cancelLabel="Keep reservation"
        destructive
      />
    </Container>
  );
}
