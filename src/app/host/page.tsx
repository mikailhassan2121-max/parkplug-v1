"use client";

import Link from "next/link";
import { host as hostApi, listings as listingsApi, reservations as reservationsApi } from "@/lib/api";
import { feesConfigured } from "@/config/business";
import { formatMoney, formatRange } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { useSession } from "@/lib/session";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState, ErrorState, SkeletonRow, Skeleton } from "@/components/ui/feedback";
import {
  IconCalendar,
  IconList,
  IconPlus,
  IconStar,
  IconWallet,
} from "@/components/ui/icons";

export default function HostOverviewPage() {
  const session = useSession();
  const listingsState = useAsync(() => listingsApi.listForHost(), []);
  const reservationsState = useAsync(() => reservationsApi.listForHost(), []);
  const earningsState = useAsync(() => hostApi.earnings(), []);

  const allListings = listingsState.status === "ready" ? listingsState.data : [];
  const activeListings = allListings.filter((l) => l.status === "active");
  const upcoming =
    reservationsState.status === "ready"
      ? reservationsState.data.filter(
          (r) => new Date(r.startAt).getTime() > Date.now() && r.status !== "canceled",
        )
      : [];

  const firstName = session.user?.fullName.split(" ")[0] ?? "there";
  const isNewHost = listingsState.status === "ready" && allListings.length === 0;

  if (isNewHost) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Hosting on ParkPlug
        </h1>
        <EmptyState
          className="mt-6"
          icon={<IconList />}
          title="You have not listed a parking space yet."
          description="Add your driveway, garage, or lot, choose when it is available, and set your own price. You can pause or edit it at any time."
          actions={[
            { label: "Create Your First Listing", href: "/host/listings/new" },
            { label: "Learn How Hosting Works", href: "/hosting-guide", variant: "secondary" },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Hosting overview
          </h1>
          <p className="mt-1.5 text-sm text-ink-600">Welcome back, {firstName}.</p>
        </div>
        {/* The sidebar carries this action from `lg` upwards. */}
        <span className="lg:hidden">
          <ButtonLink href="/host/listings/new" leadingIcon={<IconPlus />}>
            New Listing
          </ButtonLink>
        </span>
      </div>

      {/* ------------------------------------------------------------ Stats */}
      <section aria-label="Summary">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active listings"
            value={listingsState.status === "ready" ? String(activeListings.length) : null}
            hint={`${allListings.length} total`}
          />
          <StatCard
            label="Upcoming reservations"
            value={reservationsState.status === "ready" ? String(upcoming.length) : null}
          />
          <StatCard
            label="Pending earnings"
            value={
              earningsState.status === "ready"
                ? feesConfigured
                  ? formatMoney(earningsState.data.pendingCents, earningsState.data.currency)
                  : "—"
                : null
            }
            hint={feesConfigured ? "From confirmed reservations" : "Set platform fees to calculate"}
          />
          <StatCard
            label="Total earned"
            value={
              earningsState.status === "ready"
                ? feesConfigured
                  ? formatMoney(earningsState.data.lifetimeCents, earningsState.data.currency)
                  : "—"
                : null
            }
            hint={feesConfigured ? "From completed reservations" : "Set platform fees to calculate"}
          />
        </ul>
      </section>

      {/* ------------------------------------------------- Payout reminder */}
      <Alert
        tone="info"
        title="Set up payouts before your first reservation"
        action={
          <ButtonLink href="/host/payouts" size="sm" variant="secondary">
            Continue payout setup
          </ButtonLink>
        }
      >
        Payout information is handled securely by our payment provider. You will
        not be paid out until setup is complete.
      </Alert>

      {/* ---------------------------------------------------- Reservations */}
      <section aria-labelledby="upcoming-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="upcoming-heading" className="text-lg font-bold tracking-tight">
            Upcoming reservations
          </h2>
          <Link href="/host/reservations" className="text-sm font-bold text-brand-700 underline-offset-2 hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-4">
          {reservationsState.status === "loading" ? (
            <SkeletonRow />
          ) : reservationsState.status === "error" ? (
            <ErrorState
              compact
              title="Reservations unavailable"
              description={reservationsState.error.message}
              actions={[{ label: "Try again", onClick: reservationsState.reload }]}
            />
          ) : upcoming.length === 0 ? (
            <EmptyState
              compact
              icon={<IconCalendar />}
              title="No upcoming reservations"
              description="When a driver books one of your spaces it will appear here with their vehicle details."
            />
          ) : (
            <ul className="divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200 bg-white">
              {upcoming.slice(0, 5).map((reservation) => (
                <li key={reservation.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">
                      {reservation.listing.title}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-600">
                      {formatRange(reservation.startAt, reservation.endAt)} ·{" "}
                      {reservation.vehicle.make} {reservation.vehicle.model}
                    </p>
                  </div>
                  <StatusBadge status={reservation.status} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* --------------------------------------------------------- Listings */}
      <section aria-labelledby="listings-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="listings-heading" className="text-lg font-bold tracking-tight">
            Your listings
          </h2>
          <Link href="/host/listings" className="text-sm font-bold text-brand-700 underline-offset-2 hover:underline">
            Manage listings
          </Link>
        </div>
        <div className="mt-4">
          {listingsState.status === "loading" ? (
            <SkeletonRow />
          ) : (
            <ul className="divide-y divide-ink-200 overflow-hidden rounded-card border border-ink-200 bg-white">
              {allListings.slice(0, 4).map((listing) => (
                <li key={listing.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{listing.title}</p>
                    <p className="mt-0.5 text-xs text-ink-600">
                      {formatMoney(listing.pricePerHourCents, listing.currency)}/hr ·{" "}
                      {listing.viewCount} {listing.viewCount === 1 ? "view" : "views"}
                    </p>
                  </div>
                  <StatusBadge status={listing.status} size="sm" />
                  <ButtonLink href={`/host/listings/${listing.id}/edit`} size="sm" variant="secondary">
                    Edit
                  </ButtonLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------- Reviews */}
      <section aria-labelledby="reviews-heading">
        <h2 id="reviews-heading" className="text-lg font-bold tracking-tight">
          Recent reviews
        </h2>
        <EmptyState
          compact
          className="mt-4"
          icon={<IconStar />}
          title="No reviews yet"
          description="Drivers can review a space after their reservation is complete."
        />
      </section>

      {/* -------------------------------------------------- Quick actions */}
      <section aria-label="Quick actions" className="rounded-card border border-ink-200 bg-ink-50 p-5">
        <h2 className="text-base font-bold">Things you can do</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <ButtonLink href="/host/calendar" variant="secondary" size="sm" leadingIcon={<IconCalendar />}>
            Manage availability
          </ButtonLink>
          <ButtonLink href="/host/earnings" variant="secondary" size="sm" leadingIcon={<IconWallet />}>
            View earnings
          </ButtonLink>
          <ButtonLink href="/hosting-guide" variant="secondary" size="sm">
            Hosting guide
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string;
}) {
  return (
    <li className="rounded-card border border-ink-200 bg-white p-4">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      {value === null ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink-950">{value}</p>
      )}
      {hint ? <p className="mt-0.5 text-2xs text-ink-500">{hint}</p> : null}
    </li>
  );
}
