"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/cn";
import {
  countLabel,
  formatDistance,
  formatMoney,
  formatRelative,
  formatTimeRemaining,
  formatWalkingTime,
} from "@/lib/format";
import {
  AMENITIES,
  PARKING_TYPES,
  VEHICLE_SIZES,
  type FreeParkingReport,
  type ListingSummary,
  type VehicleSize,
} from "@/lib/types";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { RatingStars } from "@/components/ui/feedback";
import { IconButton } from "@/components/ui/button";
import {
  IconAccessible,
  IconAlert,
  IconBolt,
  IconCar,
  IconCheckCircle,
  IconClock,
  IconHeart,
  IconImage,
  IconMapPin,
  IconRoof,
} from "@/components/ui/icons";

const SIZE_ORDER: VehicleSize[] = ["compact", "standard", "large", "oversized"];

const AMENITY_ICONS: Partial<Record<string, React.ReactNode>> = {
  covered: <IconRoof />,
  ev_charging: <IconBolt />,
  accessible: <IconAccessible />,
};

/* -------------------------------------------------------------------------
   Paid listing
   ------------------------------------------------------------------------- */

export function ListingResultCard({
  listing,
  selected,
  saved,
  onToggleSave,
  onHover,
  onFocusCard,
  /** Vehicle size the driver searched with, for the compatibility line. */
  searchVehicleSize,
  layout = "list",
}: {
  listing: ListingSummary;
  selected?: boolean;
  saved?: boolean;
  onToggleSave?: () => void;
  onHover?: (hovering: boolean) => void;
  onFocusCard?: () => void;
  searchVehicleSize?: VehicleSize;
  layout?: "list" | "grid";
}) {
  const typeLabel = PARKING_TYPES.find((t) => t.value === listing.parkingType)?.label ?? "Parking";
  const fits =
    searchVehicleSize === undefined
      ? null
      : SIZE_ORDER.indexOf(listing.maxVehicleSize) >= SIZE_ORDER.indexOf(searchVehicleSize);
  const maxSizeLabel = VEHICLE_SIZES.find((s) => s.value === listing.maxVehicleSize)?.label;

  return (
    <article
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={cn(
        "group relative overflow-hidden rounded-card border bg-white transition-all duration-200",
        selected
          ? "border-brand-500 shadow-e2 ring-1 ring-brand-500"
          : "border-ink-200 hover:border-ink-300 hover:shadow-e2",
        layout === "list" && "sm:flex",
      )}
    >
      <div
        className={cn(
          "relative shrink-0 bg-ink-100",
          layout === "list" ? "aspect-[16/10] sm:aspect-square sm:w-44 lg:w-52" : "aspect-[16/10]",
        )}
      >
        {listing.photo ? (
          <Image
            src={listing.photo.url}
            alt={listing.photo.alt}
            fill
            sizes="(max-width: 640px) 100vw, 220px"
            className="object-cover"
            placeholder={listing.photo.blurDataUrl ? "blur" : undefined}
            blurDataURL={listing.photo.blurDataUrl}
          />
        ) : (
          <div className="grid h-full place-items-center text-ink-400">
            <IconImage className="text-3xl" aria-hidden="true" />
            <span className="sr-only">No photo provided for this space</span>
          </div>
        )}

        {onToggleSave ? (
          <IconButton
            label={saved ? `Remove ${listing.title} from saved spaces` : `Save ${listing.title}`}
            aria-pressed={saved}
            icon={
              <IconHeart className={cn(saved && "fill-current animate-pop text-danger-600")} />
            }
            size="sm"
            onClick={onToggleSave}
            className="absolute right-2 top-2 bg-white/92 text-ink-700 shadow-e1 backdrop-blur-sm hover:bg-white"
          />
        ) : null}

        {listing.instantBook ? (
          <span className="absolute left-2 top-2">
            <Badge tone="brand" size="sm" icon={<IconBolt />}>
              Instant
            </Badge>
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-[0.9375rem] font-bold leading-snug text-ink-900">
            <Link
              href={`/spaces/${listing.slug}`}
              onFocus={onFocusCard}
              className="after:absolute after:inset-0 after:content-[''] hover:underline underline-offset-2"
            >
              {listing.title}
            </Link>
          </h3>
          <div className="shrink-0 text-right">
            <p className="text-base font-extrabold text-ink-950">
              {formatMoney(listing.pricePerHourCents, listing.currency)}
              <span className="text-xs font-semibold text-ink-500">/hr</span>
            </p>
            {listing.estimatedTotalCents !== undefined ? (
              <p className="text-2xs font-medium text-ink-500">
                ~{formatMoney(listing.estimatedTotalCents, listing.currency)} total
              </p>
            ) : null}
          </div>
        </div>

        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-600">
          <IconMapPin className="shrink-0 text-ink-400" aria-hidden="true" />
          <span className="truncate">{listing.location.label}</span>
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-600">
          {listing.distanceMeters !== undefined ? (
            <span className="font-semibold text-ink-800">
              {formatDistance(listing.distanceMeters)}
            </span>
          ) : null}
          {listing.walkingMinutes !== undefined ? (
            <span>{formatWalkingTime(listing.walkingMinutes)}</span>
          ) : null}
          <span>{typeLabel}</span>
          {listing.rating ? (
            <RatingStars value={listing.rating.average} count={listing.rating.count} />
          ) : (
            <span className="text-ink-500">No reviews yet</span>
          )}
        </div>

        {listing.amenities.length > 0 ? (
          <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
            {listing.amenities.slice(0, 4).map((amenity) => (
              <li key={amenity} className="inline-flex items-center gap-1.5 text-xs text-ink-600">
                <span className="text-ink-400" aria-hidden="true">
                  {AMENITY_ICONS[amenity] ?? <IconCheckCircle />}
                </span>
                {AMENITIES.find((a) => a.value === amenity)?.label}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <p
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold",
              fits === false ? "text-danger-700" : "text-ink-600",
            )}
          >
            <IconCar className="shrink-0" aria-hidden="true" />
            {fits === false
              ? `Too small for your ${VEHICLE_SIZES.find((s) => s.value === searchVehicleSize)?.label.toLowerCase()} vehicle`
              : `Fits up to ${maxSizeLabel?.toLowerCase()}`}
          </p>
          <span className="relative z-10 text-xs font-bold text-brand-700 group-hover:underline">
            View Space
          </span>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------
   Community free-parking report
   ------------------------------------------------------------------------- */

export function ReportResultCard({
  report,
  selected,
  onSelect,
  onConfirm,
  onMarkTaken,
  onHover,
  busy,
}: {
  report: FreeParkingReport;
  selected?: boolean;
  onSelect?: () => void;
  onConfirm?: () => void;
  onMarkTaken?: () => void;
  onHover?: (hovering: boolean) => void;
  busy?: boolean;
}) {
  const confidenceTone =
    report.confidence === "high" ? "success" : report.confidence === "medium" ? "warning" : "neutral";
  const expiringSoon =
    new Date(report.expiresAt).getTime() - Date.now() < 20 * 60_000 && report.status === "active";

  return (
    <article
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={cn(
        "overflow-hidden rounded-card border-l-4 border-l-accent-500 border bg-white transition-all duration-200",
        selected
          ? "border-accent-500 shadow-e2 ring-1 ring-accent-500"
          : "border-ink-200 hover:border-ink-300 hover:shadow-e2",
      )}
    >
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent" icon={<IconBolt />}>
            Recently reported free parking
          </Badge>
          {expiringSoon ? <StatusBadge status="expiring_soon" size="sm" /> : null}
          {report.status === "taken" ? <StatusBadge status="taken" size="sm" /> : null}
        </div>

        <h3 className="mt-2.5 text-[0.9375rem] font-bold leading-snug text-ink-900">
          {countLabel(report.spacesObserved, "space")} · {report.location.label}
        </h3>

        <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <dt className="text-ink-500">Observed</dt>
            <dd className="font-semibold text-ink-800">{formatRelative(report.observedAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Expires</dt>
            <dd className="font-semibold text-ink-800">{formatTimeRemaining(report.expiresAt)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Confirmations</dt>
            <dd className="font-semibold text-ink-800">
              {report.confirmations === 0 ? "None yet" : countLabel(report.confirmations, "person", "people")}
            </dd>
          </div>
          <div>
            <dt className="text-ink-500">Confidence</dt>
            <dd>
              <Badge tone={confidenceTone} size="sm">
                {report.confidence === "high" ? "High" : report.confidence === "medium" ? "Medium" : "Low"}
              </Badge>
            </dd>
          </div>
        </dl>

        {report.timeLimitMinutes || report.restrictions.length > 0 ? (
          <p className="mt-2.5 flex items-start gap-1.5 text-xs leading-relaxed text-ink-700">
            <IconClock className="mt-0.5 shrink-0 text-ink-400" aria-hidden="true" />
            <span>
              {report.timeLimitMinutes ? `${report.timeLimitMinutes} minute limit. ` : ""}
              {report.restrictions.length > 0
                ? report.restrictions
                    .map((r) => r.replace(/_/g, " "))
                    .join(", ")
                    .replace(/^\w/, (c) => c.toUpperCase())
                : ""}
            </span>
          </p>
        ) : null}

        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-warning-50 px-2.5 py-2 text-2xs leading-relaxed text-warning-800">
          <IconAlert className="mt-px shrink-0" aria-hidden="true" />
          Availability is not guaranteed. Check posted signs before you park.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {onSelect ? (
            <button
              type="button"
              onClick={onSelect}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-xs font-bold text-ink-700 transition-colors hover:bg-ink-50"
            >
              View on Map
            </button>
          ) : null}
          {onConfirm ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy || report.status !== "active"}
              className="rounded-lg border border-success-500 px-3 py-1.5 text-xs font-bold text-success-700 transition-colors hover:bg-success-50 disabled:opacity-50"
            >
              Still available
            </button>
          ) : null}
          {onMarkTaken ? (
            <button
              type="button"
              onClick={onMarkTaken}
              disabled={busy || report.status !== "active"}
              className="rounded-lg border border-ink-300 px-3 py-1.5 text-xs font-bold text-ink-700 transition-colors hover:bg-ink-50 disabled:opacity-50"
            >
              Taken
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
