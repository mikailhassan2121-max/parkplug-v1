"use client";

import Image from "next/image";
import Link from "next/link";
import { formatDuration, formatMoney, formatRange, minutesBetween } from "@/lib/format";
import type { Reservation } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { IconCar, IconImage, IconMapPin } from "@/components/ui/icons";

export function ReservationCard({
  reservation,
  onCancel,
}: {
  reservation: Reservation;
  onCancel?: () => void;
}) {
  const minutes = minutesBetween(reservation.startAt, reservation.endAt);
  const addressReleased =
    Boolean(reservation.exactAddress) &&
    (reservation.status === "confirmed" || reservation.status === "in_progress");

  return (
    <article className="overflow-hidden rounded-card border border-ink-200 bg-white transition-shadow hover:shadow-e2 sm:flex">
      <div className="relative aspect-[16/10] shrink-0 bg-ink-100 sm:aspect-square sm:w-40">
        {reservation.listing.photo ? (
          <Image
            src={reservation.listing.photo.url}
            alt={reservation.listing.photo.alt}
            fill
            sizes="160px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-400">
            <IconImage className="text-2xl" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-snug text-ink-900">
              <Link
                href={`/reservations/${reservation.reference}`}
                className="hover:underline underline-offset-2"
              >
                {reservation.listing.title}
              </Link>
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-600">
              <IconMapPin className="shrink-0 text-ink-400" aria-hidden="true" />
              <span className="truncate">
                {addressReleased && reservation.exactAddress
                  ? `${reservation.exactAddress.line1}, ${reservation.exactAddress.city}`
                  : reservation.listing.location.label}
              </span>
            </p>
          </div>
          <StatusBadge status={reservation.status} />
        </div>

        <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-ink-500">When</dt>
            <dd className="font-semibold text-ink-800">
              {formatRange(reservation.startAt, reservation.endAt)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-500">Duration</dt>
            <dd className="font-semibold text-ink-800">{formatDuration(minutes)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Vehicle</dt>
            <dd className="flex items-center gap-1.5 font-semibold text-ink-800">
              <IconCar className="text-ink-400" aria-hidden="true" />
              {reservation.vehicle.make} {reservation.vehicle.model} ·{" "}
              {reservation.vehicle.licensePlate}
            </dd>
          </div>
          <div>
            <dt className="text-ink-500">Total paid</dt>
            <dd className="font-semibold text-ink-800">
              {formatMoney(reservation.price.totalCents, reservation.price.currency)}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href={`/reservations/${reservation.reference}`} size="sm">
            View Details
          </ButtonLink>

          {addressReleased && reservation.exactAddress ? (
            <ButtonLink
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                `${reservation.exactAddress.line1}, ${reservation.exactAddress.city}, ${reservation.exactAddress.state}`,
              )}`}
              target="_blank"
              rel="noreferrer noopener"
              variant="secondary"
              size="sm"
            >
              Directions
            </ButtonLink>
          ) : null}

          <ButtonLink href="/messages" variant="secondary" size="sm">
            Contact Host
          </ButtonLink>

          {reservation.canReview ? (
            <ButtonLink
              href={`/reviews/new?reservation=${reservation.reference}`}
              variant="tertiary"
              size="sm"
            >
              Leave Review
            </ButtonLink>
          ) : null}

          {reservation.canCancel && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-danger-700 transition-colors hover:bg-danger-50"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
