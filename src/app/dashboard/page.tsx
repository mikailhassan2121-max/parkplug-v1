"use client";

import Link from "next/link";
import { notifications as notificationsApi, reservations as reservationsApi, saved as savedApi } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { useSession } from "@/lib/session";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState, ErrorState, SkeletonRow } from "@/components/ui/feedback";
import { Alert } from "@/components/ui/alert";
import {
  IconBell,
  IconCalendar,
  IconHeart,
  IconSearch,
  IconStar,
} from "@/components/ui/icons";
import { ReservationCard } from "@/components/dashboard/reservation-card";
import { SearchModule } from "@/components/search/search-module";

export default function DashboardPage() {
  const session = useSession();
  const reservationsState = useAsync(() => reservationsApi.list(), []);
  const savedState = useAsync(() => savedApi.list(), []);
  const notificationsState = useAsync(() => notificationsApi.list(), []);

  const now = Date.now();
  const all = reservationsState.status === "ready" ? reservationsState.data : [];
  const upcoming = all
    .filter((r) => new Date(r.endAt).getTime() > now && r.status !== "canceled")
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const nextUp = upcoming[0];
  const awaitingReview = all.filter((r) => r.canReview);

  const firstName = session.user?.fullName.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1.5 text-sm text-ink-600">
          Here is what is happening with your parking.
        </p>
      </div>

      {session.user && !session.user.emailVerified ? (
        <Alert
          tone="warning"
          title="Verify your email address"
          action={
            <ButtonLink href="/verify-email" size="sm" variant="secondary">
              Verify now
            </ButtonLink>
          }
        >
          You need a verified email before you can reserve a space or publish a
          listing.
        </Alert>
      ) : null}

      {/* --------------------------------------------- Upcoming reservation */}
      <section aria-labelledby="upcoming-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="upcoming-heading" className="text-lg font-bold tracking-tight">
            Your next reservation
          </h2>
          {upcoming.length > 1 ? (
            <Link
              href="/dashboard/reservations"
              className="text-sm font-bold text-brand-700 underline-offset-2 hover:underline"
            >
              See all {upcoming.length}
            </Link>
          ) : null}
        </div>

        <div className="mt-4">
          {reservationsState.status === "loading" ? (
            <SkeletonRow />
          ) : reservationsState.status === "error" ? (
            <ErrorState
              compact
              title="We could not load your reservations"
              description={reservationsState.error.message}
              actions={[{ label: "Try again", onClick: reservationsState.reload }]}
            />
          ) : nextUp ? (
            <ReservationCard reservation={nextUp} />
          ) : (
            <EmptyState
              compact
              icon={<IconCalendar />}
              title="You have no upcoming reservations."
              description="Search for parking near where you are heading next."
              actions={[{ label: "Find Parking", href: "/parking" }]}
            />
          )}
        </div>
      </section>

      {/* ---------------------------------------------------- Quick search */}
      <section aria-labelledby="quick-search-heading">
        <h2 id="quick-search-heading" className="text-lg font-bold tracking-tight">
          Find parking
        </h2>
        <div className="mt-4">
          <SearchModule layout="compact" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ------------------------------------------------- Saved spaces */}
        <section aria-labelledby="saved-heading">
          <div className="flex items-center justify-between gap-4">
            <h2 id="saved-heading" className="text-lg font-bold tracking-tight">
              Saved spaces
            </h2>
            <Link
              href="/dashboard/saved"
              className="text-sm font-bold text-brand-700 underline-offset-2 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="mt-4">
            {savedState.status === "loading" ? (
              <SkeletonRow />
            ) : savedState.status === "error" ? (
              <ErrorState
                compact
                title="Saved spaces unavailable"
                description={savedState.error.message}
                actions={[{ label: "Try again", onClick: savedState.reload }]}
              />
            ) : savedState.data.length === 0 ? (
              <EmptyState
                compact
                icon={<IconHeart />}
                title="Save spaces to quickly find them later."
                actions={[{ label: "Explore Parking", href: "/parking" }]}
              />
            ) : (
              <ul className="space-y-3">
                {savedState.data.slice(0, 3).map((listing) => (
                  <li key={listing.id}>
                    <Card interactive>
                      <CardBody className="flex items-center justify-between gap-4 p-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-ink-900">{listing.title}</p>
                          <p className="truncate text-xs text-ink-600">{listing.location.label}</p>
                        </div>
                        <ButtonLink href={`/spaces/${listing.slug}`} size="sm" variant="secondary">
                          View
                        </ButtonLink>
                      </CardBody>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* -------------------------------------------------- Notifications */}
        <section aria-labelledby="activity-heading">
          <div className="flex items-center justify-between gap-4">
            <h2 id="activity-heading" className="text-lg font-bold tracking-tight">
              Recent activity
            </h2>
            <Link
              href="/notifications"
              className="text-sm font-bold text-brand-700 underline-offset-2 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="mt-4">
            {notificationsState.status === "loading" ? (
              <SkeletonRow />
            ) : notificationsState.status === "error" ? (
              <ErrorState
                compact
                title="Activity unavailable"
                description={notificationsState.error.message}
                actions={[{ label: "Try again", onClick: notificationsState.reload }]}
              />
            ) : notificationsState.data.length === 0 ? (
              <EmptyState
                compact
                icon={<IconBell />}
                title="No activity yet"
                description="Reservation updates and messages will appear here."
              />
            ) : (
              <ul className="divide-y divide-ink-200 rounded-card border border-ink-200 bg-white">
                {notificationsState.data.slice(0, 4).map((notification) => (
                  <li key={notification.id} className="px-4 py-3">
                    <p className="text-sm font-semibold text-ink-900">{notification.title}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-600">{notification.body}</p>
                    <p className="mt-0.5 text-2xs text-ink-500">
                      {formatRelative(notification.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* ------------------------------------------------ Review reminders */}
      {awaitingReview.length > 0 ? (
        <section aria-labelledby="review-heading">
          <h2 id="review-heading" className="text-lg font-bold tracking-tight">
            Share your experience
          </h2>
          <ul className="mt-4 space-y-3">
            {awaitingReview.map((reservation) => (
              <li key={reservation.id}>
                <Card>
                  <CardBody className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
                        <IconStar className="text-accent-500" aria-hidden="true" />
                        How was {reservation.listing.title}?
                      </p>
                      <p className="mt-0.5 text-xs text-ink-600">
                        Your review helps other drivers choose with confidence.
                      </p>
                    </div>
                    <ButtonLink
                      href={`/reviews/new?reservation=${reservation.reference}`}
                      size="sm"
                    >
                      Leave a review
                    </ButtonLink>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- Support */}
      <section className="rounded-card border border-ink-200 bg-ink-50 p-5">
        <h2 className="text-base font-bold">Need a hand?</h2>
        <p className="mt-1 text-sm text-ink-600">
          Browse common questions, or send our team the details and we will help.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink href="/help" variant="secondary" size="sm" leadingIcon={<IconSearch />}>
            Help Center
          </ButtonLink>
          <ButtonLink href="/support" variant="secondary" size="sm">
            Contact Support
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
