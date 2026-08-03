"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { listings as listingsApi, reviews as reviewsApi, saved as savedApi } from "@/lib/api";
import { ERROR_COPY } from "@/lib/api/result";
import { useAsync } from "@/lib/use-async";
import { useSession } from "@/lib/session";
import {
  AMENITIES,
  PARKING_TYPES,
  VEHICLE_SIZES,
  type Listing,
} from "@/lib/types";
import { DAY_SHORT, formatClock, formatDate, formatDuration } from "@/lib/format";
import { Avatar } from "@/components/layout/site-header";
import { Container } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState, ErrorState, RatingBar, RatingStars, Skeleton, SkeletonText } from "@/components/ui/feedback";
import { Overlay } from "@/components/ui/overlay";
import { Field, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import {
  IconAccessible,
  IconAlert,
  IconBolt,
  IconCar,
  IconChevronRight,
  IconFlag,
  IconHeart,
  IconLightbulb,
  IconLock,
  IconMapPin,
  IconRoof,
  IconShare,
  IconShield,
  IconStar,
} from "@/components/ui/icons";
import { ParkingMap } from "@/components/map/parking-map";
import { PhotoGallery } from "@/components/listing/photo-gallery";
import { BookingCard } from "@/components/listing/booking-card";

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  covered: <IconRoof />,
  ev_charging: <IconBolt />,
  accessible: <IconAccessible />,
  lit: <IconLightbulb />,
  gated: <IconLock />,
  camera_monitored: <IconShield />,
};

export function ListingView({ slug }: { slug: string }) {
  const params = useSearchParams();
  const state = useAsync(() => listingsApi.getBySlug(slug), [slug]);

  if (state.status === "loading") return <ListingSkeleton />;

  if (state.status === "error") {
    const copy = ERROR_COPY[state.error.code];
    return (
      <Container size="narrow" className="py-16">
        <ErrorState
          title={state.error.code === "not_found" ? "This space is not available" : copy.title}
          description={
            state.error.code === "not_found"
              ? "The listing may have been paused, archived, or removed by its host."
              : state.error.message || copy.description
          }
          actions={[
            { label: "Find other parking", href: "/search" },
            { label: "Return home", href: "/", variant: "secondary" },
          ]}
        />
      </Container>
    );
  }

  return (
    <ListingDetail
      listing={state.data}
      initialStart={params.get("start") ?? undefined}
      initialEnd={params.get("end") ?? undefined}
    />
  );
}

function ListingDetail({
  listing,
  initialStart,
  initialEnd,
}: {
  listing: Listing;
  initialStart?: string;
  initialEnd?: string;
}) {
  const session = useSession();
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const reviewsState = useAsync(() => reviewsApi.listForListing(listing.id), [listing.id]);
  const typeLabel = PARKING_TYPES.find((t) => t.value === listing.parkingType)?.label;
  const maxSize = VEHICLE_SIZES.find((s) => s.value === listing.maxVehicleSize);

  async function toggleSave() {
    if (session.status !== "authenticated") {
      toast({ tone: "info", title: "Sign in to save this space" });
      return;
    }
    const result = await savedApi.toggle(listing.id);
    if (result.ok) setSaved(result.data.saved);
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, url });
        return;
      } catch {
        // User dismissed the share sheet — fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ tone: "success", title: "Link copied" });
    } catch {
      toast({ tone: "error", title: "Could not copy the link" });
    }
  }

  return (
    <div className="pb-28 lg:pb-0">
      <Container size="wide" className="py-5 lg:py-8">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-500">
            <li>
              <Link href="/" className="hover:text-brand-700 hover:underline">Home</Link>
            </li>
            <li aria-hidden="true"><IconChevronRight className="text-[0.7rem]" /></li>
            <li>
              <Link href="/search" className="hover:text-brand-700 hover:underline">Find parking</Link>
            </li>
            <li aria-hidden="true"><IconChevronRight className="text-[0.7rem]" /></li>
            <li>
              <span className="font-medium text-ink-700">
                {listing.location.city}, {listing.location.state}
              </span>
            </li>
          </ol>
        </nav>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">
              {listing.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {listing.rating ? (
                <RatingStars value={listing.rating.average} count={listing.rating.count} size="md" />
              ) : (
                <span className="text-ink-500">No reviews yet</span>
              )}
              <span className="inline-flex items-center gap-1.5 text-ink-600">
                <IconMapPin className="text-ink-400" aria-hidden="true" />
                {listing.location.label}
              </span>
              {typeLabel ? <Badge tone="neutral">{typeLabel}</Badge> : null}
            </div>
          </div>

          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="sm" leadingIcon={<IconShare />} onClick={() => void share()}>
              Share
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={saved}
              leadingIcon={<IconHeart className={saved ? "fill-current text-danger-600" : ""} />}
              onClick={() => void toggleSave()}
            >
              {saved ? "Saved" : "Save"}
            </Button>
            <IconButton
              label="Report this listing"
              icon={<IconFlag />}
              size="sm"
              onClick={() => setReportOpen(true)}
            />
          </div>
        </div>

        <div className="mt-5">
          <PhotoGallery photos={listing.photos} title={listing.title} />
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
          <div className="min-w-0 space-y-10">
            {/* ------------------------------------------------- Description */}
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="text-xl font-bold tracking-tight">
                About this space
              </h2>
              <p className="mt-3 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink-700">
                {listing.description}
              </p>
            </section>

            {/* ----------------------------------------------------- Details */}
            <section aria-labelledby="details-heading">
              <h2 id="details-heading" className="text-xl font-bold tracking-tight">
                Space details
              </h2>
              <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <Detail label="Parking type" value={typeLabel ?? "—"} />
                <Detail label="Number of spaces" value={String(listing.spacesTotal)} />
                <Detail label="Largest vehicle" value={maxSize ? `${maxSize.label} — ${maxSize.hint}` : "—"} />
                {listing.heightClearanceCm ? (
                  <Detail
                    label="Height clearance"
                    value={`${listing.heightClearanceCm} cm (${(listing.heightClearanceCm / 30.48).toFixed(1)} ft)`}
                  />
                ) : null}
                {listing.surface ? (
                  <Detail label="Surface" value={listing.surface.replace(/^\w/, (c) => c.toUpperCase())} />
                ) : null}
                <Detail label="Minimum reservation" value={formatDuration(listing.minimumMinutes)} />
                <Detail label="Maximum reservation" value={formatDuration(listing.maximumMinutes)} />
                <Detail label="Advance notice" value={formatDuration(listing.advanceNoticeMinutes)} />
                {listing.entranceNotes ? (
                  <Detail label="Entrance" value={listing.entranceNotes} span />
                ) : null}
                {listing.accessibilityNotes ? (
                  <Detail label="Accessibility" value={listing.accessibilityNotes} span />
                ) : null}
              </dl>

              {listing.amenities.length > 0 ? (
                <>
                  <h3 className="mt-7 text-base font-bold">What this space offers</h3>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {listing.amenities.map((amenity) => (
                      <li key={amenity} className="flex items-center gap-2.5 text-sm text-ink-700">
                        <span className="text-lg text-brand-600" aria-hidden="true">
                          {AMENITY_ICONS[amenity] ?? <IconCar />}
                        </span>
                        {AMENITIES.find((a) => a.value === amenity)?.label}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </section>

            {/* ------------------------------------------------ Availability */}
            <section aria-labelledby="availability-heading">
              <h2 id="availability-heading" className="text-xl font-bold tracking-tight">
                When you can park here
              </h2>
              {listing.availability.length === 0 ? (
                <p className="mt-3 text-sm text-ink-600">
                  This host has not published a weekly schedule. Check availability
                  for your specific times using the booking form.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const windows = listing.availability.filter((w) => w.dayOfWeek === day);
                    return (
                      <li key={day} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                        <span className="font-semibold text-ink-800">{DAY_SHORT[day]}</span>
                        <span className={windows.length ? "text-ink-700" : "text-ink-400"}>
                          {windows.length
                            ? windows
                                .map((w) => `${formatClock(w.startTime)} – ${formatClock(w.endTime)}`)
                                .join(", ")
                            : "Unavailable"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ------------------------------------------------------- Rules */}
            <section aria-labelledby="rules-heading">
              <h2 id="rules-heading" className="text-xl font-bold tracking-tight">
                Parking rules
              </h2>
              {listing.rules.length > 0 ? (
                <ul className="mt-3 space-y-2.5">
                  {listing.rules.map((rule) => (
                    <li key={rule} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" />
                      {rule}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-600">
                  This host has not added specific rules beyond ParkPlugs&rsquo;s
                  standard expectations.
                </p>
              )}

              <div className="mt-5 rounded-card border border-ink-200 bg-ink-50 p-4">
                <h3 className="text-sm font-bold text-ink-900">Cancellation</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-700">
                  {listing.cancellationPolicy.summary}
                </p>
                <Link
                  href="/legal/cancellation"
                  className="mt-2 inline-block text-xs font-bold text-brand-700 underline underline-offset-2"
                >
                  Read the full cancellation policy
                </Link>
              </div>
            </section>

            {/* --------------------------------------------- Approximate map */}
            <section aria-labelledby="location-heading">
              <h2 id="location-heading" className="text-xl font-bold tracking-tight">
                Where you will park
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {listing.location.label}
              </p>
              <div className="mt-4 overflow-hidden rounded-card border border-ink-200">
                <ParkingMap
                  center={listing.location.center}
                  zoom={15}
                  privacyCircle={{
                    center: listing.location.center,
                    radiusMeters: listing.location.radiusMeters,
                  }}
                  className="h-64 sm:h-80"
                  showRecenter={false}
                  ariaLabel={`Approximate location of this space: ${listing.location.label}`}
                />
              </div>
              <Alert tone="info" className="mt-3" icon={<IconLock />}>
                To protect host privacy, the exact address and entry instructions
                are shown after your reservation is confirmed.
              </Alert>
            </section>

            {/* -------------------------------------------------------- Host */}
            <section aria-labelledby="host-heading">
              <h2 id="host-heading" className="text-xl font-bold tracking-tight">
                Your host
              </h2>
              <div className="mt-4 flex items-start gap-4 rounded-card border border-ink-200 p-5">
                <Avatar name={listing.host.displayName} url={listing.host.avatarUrl} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-ink-900">{listing.host.displayName}</p>
                  <p className="mt-0.5 text-sm text-ink-600">
                    Hosting since {formatDate(listing.host.joinedAt, true)}
                  </p>

                  {/* Only rendered when the platform has real numbers to show. */}
                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {listing.host.responseRatePercent !== undefined ? (
                      <div>
                        <dt className="text-xs text-ink-500">Response rate</dt>
                        <dd className="font-semibold text-ink-800">
                          {listing.host.responseRatePercent}%
                        </dd>
                      </div>
                    ) : null}
                    {listing.host.responseTimeMinutes !== undefined ? (
                      <div>
                        <dt className="text-xs text-ink-500">Responds in</dt>
                        <dd className="font-semibold text-ink-800">
                          {formatDuration(listing.host.responseTimeMinutes)}
                        </dd>
                      </div>
                    ) : null}
                    {listing.host.completedReservations !== undefined ? (
                      <div>
                        <dt className="text-xs text-ink-500">Reservations hosted</dt>
                        <dd className="font-semibold text-ink-800">
                          {listing.host.completedReservations}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  {listing.host.badges?.length ? (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {listing.host.badges.map((badge) => (
                        <li key={badge.id}>
                          <Badge tone="brand" size="sm">{badge.label}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <p className="mt-3 text-xs leading-relaxed text-ink-500">
                    You can message your host once a reservation is confirmed.
                  </p>
                </div>
              </div>
            </section>

            {/* ----------------------------------------------------- Reviews */}
            <section aria-labelledby="reviews-heading">
              <h2 id="reviews-heading" className="text-xl font-bold tracking-tight">
                Reviews
              </h2>

              {reviewsState.status === "loading" ? (
                <div className="mt-4 space-y-4" role="status" aria-busy="true">
                  <span className="sr-only">Loading reviews</span>
                  <Skeleton className="h-20 w-full" rounded="rounded-card" />
                  <Skeleton className="h-20 w-full" rounded="rounded-card" />
                </div>
              ) : reviewsState.status === "error" ? (
                <ErrorState
                  compact
                  className="mt-4"
                  title="Reviews could not be loaded"
                  description="Everything else on this page is up to date."
                  actions={[{ label: "Try again", onClick: reviewsState.reload }]}
                />
              ) : reviewsState.data.length === 0 ? (
                <EmptyState
                  compact
                  className="mt-4"
                  icon={<IconStar />}
                  title="No reviews yet"
                  description="Be the first driver to reserve and review this space."
                />
              ) : (
                <ReviewList reviews={reviewsState.data} rating={listing.rating} />
              )}
            </section>
          </div>

          {/* --------------------------------------------------- Booking card */}
          <div className="lg:min-w-0">
            <BookingCard listing={listing} initialStart={initialStart} initialEnd={initialEnd} />
          </div>
        </div>
      </Container>

      <ReportListingDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        listingTitle={listing.title}
      />
    </div>
  );
}

function Detail({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink-800">{value}</dd>
    </div>
  );
}

function ReviewList({
  reviews,
  rating,
}: {
  reviews: Array<import("@/lib/types").Review>;
  rating?: { average: number; count: number };
}) {
  const [visible, setVisible] = useState(6);
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    value: reviews.filter((r) => Math.round(r.rating) === stars).length,
  }));

  const categoryAverages = (["accuracy", "access", "safety", "value"] as const).map((key) => {
    const scored = reviews.filter((r) => r.categories);
    const average =
      scored.length > 0
        ? scored.reduce((sum, r) => sum + (r.categories?.[key] ?? 0), 0) / scored.length
        : null;
    return { key, average };
  });

  return (
    <>
      <div className="mt-4 grid gap-6 rounded-card border border-ink-200 p-5 sm:grid-cols-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tabular-nums text-ink-950">
              {(rating?.average ?? 0).toFixed(1)}
            </span>
            <RatingStars value={rating?.average ?? 0} showValue={false} size="md" />
          </div>
          <p className="mt-1 text-sm text-ink-600">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </p>
          <div className="mt-4 space-y-1.5">
            {distribution.map((d) => (
              <RatingBar key={d.stars} stars={d.stars} value={d.value} total={reviews.length} />
            ))}
          </div>
        </div>

        <dl className="space-y-3">
          {categoryAverages.map(({ key, average }) => (
            <div key={key} className="flex items-center justify-between gap-4 text-sm">
              <dt className="capitalize text-ink-700">
                {key === "access" ? "Ease of access" : key === "safety" ? "Safety & comfort" : key}
              </dt>
              <dd className="font-bold tabular-nums text-ink-900">
                {average === null ? "—" : average.toFixed(1)}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <ul className="mt-5 space-y-5">
        {reviews.slice(0, visible).map((review) => (
          <li key={review.id} className="border-b border-ink-200 pb-5 last:border-0">
            <div className="flex items-center gap-3">
              <Avatar name={review.author.displayName} url={review.author.avatarUrl} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink-900">{review.author.displayName}</p>
                <p className="text-xs text-ink-500">
                  {review.author.generalLocation ? `${review.author.generalLocation} · ` : ""}
                  {formatDate(review.createdAt, true)}
                </p>
              </div>
              <div className="ml-auto">
                <RatingStars value={review.rating} showValue={false} />
              </div>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-700">{review.body}</p>
            {review.response ? (
              <div className="mt-3 rounded-xl bg-ink-50 p-3.5">
                <p className="text-xs font-bold text-ink-800">Response from the host</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-700">{review.response.body}</p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {visible < reviews.length ? (
        <Button variant="secondary" className="mt-4" onClick={() => setVisible((v) => v + 6)}>
          Show more reviews
        </Button>
      ) : null}
    </>
  );
}

function ReportListingDialog({
  open,
  onClose,
  listingTitle,
}: {
  open: boolean;
  onClose: () => void;
  listingTitle: string;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason) {
      setError("Choose why you are reporting this listing.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { support } = await import("@/lib/api");
    const result = await support.createTicket({
      category: "Listing problem",
      reference: listingTitle,
      name: "",
      email: "",
      description: `Reason: ${reason}\n\n${details}`,
      preferredResponse: "email",
    });
    setSubmitting(false);
    if (result.ok) {
      toast({
        tone: "success",
        title: "Report received",
        description: `Reference ${result.data.ticketReference}. Our team will review this listing.`,
      });
      onClose();
      setReason("");
      setDetails("");
    } else {
      setError(result.error.message);
    }
  }

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title="Report this listing"
      description="Tell us what is wrong and our team will review it."
      variant="sheet"
      size="md"
      disableBackdropClose
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={submitting} loadingText="Sending…">
            Submit report
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Reason" required error={error}>
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Choose a reason"
          >
            <option value="inaccurate">Details are inaccurate</option>
            <option value="unavailable">The space does not exist or is unusable</option>
            <option value="unsafe">Safety concern</option>
            <option value="photos">Photos are misleading or show private information</option>
            <option value="permission">Host may not have permission to list this space</option>
            <option value="other">Something else</option>
          </Select>
        </Field>

        <Field label="What happened?" optional hint="Anything specific helps our team review faster.">
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            maxLength={1000}
            placeholder="Describe the problem"
          />
        </Field>

        <Alert tone="warning" icon={<IconAlert />}>
          If someone is in immediate danger, contact local emergency services
          rather than reporting here.
        </Alert>
      </div>
    </Overlay>
  );
}

function ListingSkeleton() {
  return (
    <Container size="wide" className="py-8" >
      <div role="status" aria-busy="true">
        <span className="sr-only">Loading this parking space</span>
        <Skeleton className="h-4 w-48" rounded="rounded-md" />
        <Skeleton className="mt-4 h-8 w-2/3" rounded="rounded-lg" />
        <Skeleton className="mt-5 aspect-[16/9] w-full sm:aspect-[2/1]" rounded="rounded-card" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <SkeletonText lines={4} />
            <SkeletonText lines={6} />
          </div>
          <Skeleton className="h-96 w-full" rounded="rounded-card" />
        </div>
      </div>
    </Container>
  );
}
