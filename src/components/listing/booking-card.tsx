"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { quote } from "@/lib/api/pricing";
import { formatDuration, formatMoney, minutesBetween, toDateInput, toIso, toTimeInput } from "@/lib/format";
import { validateDateRange } from "@/lib/search-params";
import { isWithinAvailability, nextAvailableWindow } from "@/lib/availability";
import type { Listing } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { Overlay } from "@/components/ui/overlay";
import { IconBolt, IconCheckCircle, IconClock } from "@/components/ui/icons";
import { PriceBreakdown } from "./price-breakdown";

function defaultWindow(listing: Listing) {
  const earliest = new Date();
  earliest.setMinutes(0, 0, 0);
  earliest.setHours(earliest.getHours() + Math.max(1, Math.ceil(listing.advanceNoticeMinutes / 60)));
  const duration = Math.max(listing.minimumMinutes, 120);

  // Prefer the next slot that actually falls within the listing's posted
  // hours; only fall back to the naive "earliest + duration" guess when
  // nothing fits in the next week (an unusually restrictive schedule) —
  // validation below still catches that case rather than silently booking it.
  const found = nextAvailableWindow(earliest, duration, listing.availability);
  if (found) return found;
  return { start: earliest, end: new Date(earliest.getTime() + duration * 60_000) };
}

export function BookingCard({
  listing,
  initialStart,
  initialEnd,
}: {
  listing: Listing;
  initialStart?: string;
  initialEnd?: string;
}) {
  const router = useRouter();
  const fallback = defaultWindow(listing);

  const [startDate, setStartDate] = useState(toDateInput(initialStart ?? fallback.start.toISOString()));
  const [startTime, setStartTime] = useState(toTimeInput(initialStart ?? fallback.start.toISOString()));
  const [endDate, setEndDate] = useState(toDateInput(initialEnd ?? fallback.end.toISOString()));
  const [endTime, setEndTime] = useState(toTimeInput(initialEnd ?? fallback.end.toISOString()));
  const [mobileOpen, setMobileOpen] = useState(false);

  const startAt = toIso(startDate, startTime);
  const endAt = toIso(endDate, endTime);
  const rangeError = validateDateRange(startAt, endAt);
  const minutes = startAt && endAt && !rangeError ? minutesBetween(startAt, endAt) : 0;

  const tooShort = minutes > 0 && minutes < listing.minimumMinutes;
  const tooLong = minutes > listing.maximumMinutes;
  const durationError = tooShort
    ? `This space has a ${formatDuration(listing.minimumMinutes)} minimum.`
    : tooLong
      ? `This space allows at most ${formatDuration(listing.maximumMinutes)}.`
      : null;

  const availabilityError =
    minutes > 0 && !durationError && startAt && endAt && !isWithinAvailability(startAt, endAt, listing.availability)
      ? "This time falls outside the space's posted availability. Check the hours below and choose a time within them."
      : null;

  const price =
    minutes > 0
      ? quote({
          pricePerHourCents: listing.pricePerHourCents,
          dailyMaxCents: listing.dailyMaxCents,
          minutes,
          currency: listing.currency,
        })
      : null;

  // Only an explicit `false` blocks — `undefined` (the local-storage demo
  // adapter, which has no payout concept) behaves exactly as before.
  const payoutNotReady = listing.hostPayoutReady === false;
  const blocked = Boolean(rangeError || durationError || availabilityError) || minutes === 0 || payoutNotReady;

  function reserve() {
    if (blocked || !startAt || !endAt) return;
    const params = new URLSearchParams({ start: startAt, end: endAt });
    router.push(`/book/${listing.slug}?${params.toString()}`);
  }

  const form = (
    <>
      {payoutNotReady ? (
        <Alert tone="warning" title="This space cannot be booked right now" className="mb-4">
          The host has not finished setting up payouts yet, so reservations are not being accepted.
        </Alert>
      ) : null}

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-2xl font-extrabold tracking-tight text-ink-950">
          {formatMoney(listing.pricePerHourCents, listing.currency)}
          <span className="text-sm font-semibold text-ink-500"> /hour</span>
        </p>
        {listing.instantBook ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-700">
            <IconBolt aria-hidden="true" /> Instant booking
          </span>
        ) : null}
      </div>

      {listing.dailyMaxCents ? (
        <p className="mt-1 text-xs text-ink-500">
          Daily maximum {formatMoney(listing.dailyMaxCents, listing.currency)}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3">
        <fieldset>
          <legend className="text-sm font-semibold text-ink-800">Arrival</legend>
          <div className="mt-1.5 grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-2">
            <Input
              type="date"
              aria-label="Arrival date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="time"
              aria-label="Arrival time"
              step={900}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold text-ink-800">Departure</legend>
          <div className="mt-1.5 grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-2">
            <Input
              type="date"
              aria-label="Departure date"
              min={startDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Input
              type="time"
              aria-label="Departure time"
              step={900}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </fieldset>
      </div>

      {rangeError || durationError || availabilityError ? (
        <Alert tone="danger" live className="mt-3">
          {rangeError ?? durationError ?? availabilityError}
        </Alert>
      ) : null}

      {price && !blocked ? (
        <div className="mt-4 rounded-xl bg-ink-50 p-4">
          <PriceBreakdown
            price={price}
            minutes={minutes}
            hourlyRateCents={listing.pricePerHourCents}
          />
        </div>
      ) : null}

      <Button
        fullWidth
        size="lg"
        className="mt-4"
        disabled={blocked}
        onClick={reserve}
      >
        Reserve
      </Button>

      <p className="mt-2.5 text-center text-xs text-ink-500">
        You will not be charged until you confirm on the next screens.
      </p>

      <div className="mt-4 space-y-2 border-t border-ink-200 pt-4 text-xs text-ink-600">
        <p className="flex items-start gap-2">
          <IconCheckCircle className="mt-0.5 shrink-0 text-success-600" aria-hidden="true" />
          <span>{listing.cancellationPolicy.summary}</span>
        </p>
        <p className="flex items-start gap-2">
          <IconClock className="mt-0.5 shrink-0 text-ink-400" aria-hidden="true" />
          <span>
            Book at least {formatDuration(listing.advanceNoticeMinutes)} ahead of arrival.
          </span>
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: sticky alongside the listing content */}
      <div className="hidden lg:block">
        <div className="sticky top-24 rounded-card border border-ink-200 bg-white p-5 shadow-e2">
          {form}
        </div>
      </div>

      {/* Mobile: persistent bar with price and action, form opens in a sheet */}
      <div className="fixed inset-x-0 bottom-0 z-60 border-t border-ink-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(32,36,46,0.08)] safe-bottom lg:hidden">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold text-ink-950">
              {formatMoney(listing.pricePerHourCents, listing.currency)}
              <span className="text-xs font-semibold text-ink-500"> /hr</span>
            </p>
            {payoutNotReady ? (
              <p className="truncate text-xs text-warning-700">Not accepting reservations right now</p>
            ) : price && !blocked ? (
              <p className="truncate text-xs text-ink-600">
                {formatMoney(price.totalCents, price.currency)} total · {formatDuration(minutes)}
              </p>
            ) : (
              <p className="truncate text-xs text-ink-500">Choose your times</p>
            )}
          </div>
          <Button size="lg" disabled={payoutNotReady} onClick={() => setMobileOpen(true)} className="shrink-0">
            Reserve
          </Button>
        </div>
      </div>

      <Overlay
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="Reserve this space"
        description={listing.title}
        variant="sheet"
        size="md"
      >
        {form}
      </Overlay>
    </>
  );
}
