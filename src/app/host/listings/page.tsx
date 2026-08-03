"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { listings as listingsApi, type StoredListing } from "@/lib/api";
import { business } from "@/config/business";
import { formatMoney } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import type { ListingStatus } from "@/lib/types";
import { StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState, ErrorState, SkeletonRow, Spinner } from "@/components/ui/feedback";
import { Tabs, TabPanel } from "@/components/ui/menu";
import { ConfirmDialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import {
  IconArchive,
  IconCopy,
  IconEdit,
  IconEye,
  IconImage,
  IconList,
  IconPause,
  IconPlus,
  IconTrash,
} from "@/components/ui/icons";

type TabId = "active" | "draft" | "in_review" | "paused" | "archived";

const TABS: Array<{ id: TabId; label: string; statuses: ListingStatus[] }> = [
  { id: "active", label: "Active", statuses: ["active"] },
  { id: "draft", label: "Drafts", statuses: ["draft"] },
  { id: "in_review", label: "In review", statuses: ["in_review", "needs_changes"] },
  { id: "paused", label: "Paused", statuses: ["paused"] },
  { id: "archived", label: "Archived", statuses: ["archived"] },
];

export default function HostListingsPage() {
  return (
    <Suspense fallback={<div className="py-10"><Spinner size="lg" /></div>}>
      <HostListingsView />
    </Suspense>
  );
}

function HostListingsView() {
  const params = useSearchParams();
  const state = useAsync(() => listingsApi.listForHost(), []);
  const { toast } = useToast();
  const [active, setActive] = useState<TabId>("active");
  const [archiveTarget, setArchiveTarget] = useState<StoredListing | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoredListing | null>(null);
  const [busy, setBusy] = useState(false);

  const all = state.status === "ready" ? state.data : [];
  const justSubmitted = params.get("submitted") === "1";

  async function setStatus(listing: StoredListing, status: ListingStatus, message: string) {
    setBusy(true);
    const result = await listingsApi.update(listing.id, { status });
    setBusy(false);
    setArchiveTarget(null);
    if (result.ok) {
      toast({ tone: "success", title: message });
      state.reload();
    } else {
      toast({ tone: "error", title: "Could not update the listing", description: result.error.message });
    }
  }

  async function deleteListing(listing: StoredListing) {
    setBusy(true);
    const result = await listingsApi.remove(listing.id);
    setBusy(false);
    setDeleteTarget(null);
    if (result.ok) {
      // A listing with reservation history can't be hard-deleted — the
      // server archives it instead so bookings already made stay honoured.
      toast({
        tone: "success",
        title: result.data.archived ? "Listing archived" : "Listing deleted",
        description: result.data.archived
          ? "It has reservation history, so it was archived rather than deleted."
          : undefined,
      });
      state.reload();
    } else {
      toast({ tone: "error", title: "Could not delete the listing", description: result.error.message });
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Your listings</h1>
          <p className="mt-1.5 text-sm text-ink-600">
            Manage availability, pricing, and status for each space.
          </p>
        </div>
        <ButtonLink href="/host/listings/new" leadingIcon={<IconPlus />}>
          New Listing
        </ButtonLink>
      </div>

      {justSubmitted ? (
        <Alert
          tone="success"
          className="mt-6"
          title={business.listingsAutoPublish ? "Listing published" : "Listing submitted for review"}
        >
          {business.listingsAutoPublish
            ? "Your listing is live and visible in search now. You can pause or edit it at any time."
            : "We will confirm that it meets marketplace requirements and let you know when it is published."}
        </Alert>
      ) : null}

      <Tabs
        label="Listing status"
        className="mt-6"
        active={active}
        onChange={(id) => setActive(id as TabId)}
        tabs={TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
          count: all.filter((l) => tab.statuses.includes(l.status)).length,
        }))}
      />

      <div className="mt-6">
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className="space-y-3">
            <span className="sr-only">Loading your listings</span>
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : state.status === "error" ? (
          <ErrorState
            title="We could not load your listings"
            description={state.error.message}
            actions={[{ label: "Try again", onClick: state.reload }]}
          />
        ) : (
          TABS.map((tab) => {
            const items = all.filter((l) => tab.statuses.includes(l.status));
            return (
              <TabPanel key={tab.id} id={tab.id} active={active}>
                {items.length === 0 ? (
                  <EmptyState
                    icon={<IconList />}
                    title={
                      all.length === 0
                        ? "You have not listed a parking space yet."
                        : `No ${tab.label.toLowerCase()} listings`
                    }
                    description={
                      all.length === 0
                        ? "Add your driveway, garage, or lot and choose exactly when it is available."
                        : "Listings will appear here when they reach this status."
                    }
                    actions={
                      all.length === 0
                        ? [
                            { label: "Create Your First Listing", href: "/host/listings/new" },
                            { label: "Learn How Hosting Works", href: "/hosting-guide", variant: "secondary" },
                          ]
                        : []
                    }
                  />
                ) : (
                  <ul className="space-y-4">
                    {items.map((listing) => (
                      <li key={listing.id}>
                        <article className="overflow-hidden rounded-card border border-ink-200 bg-white sm:flex">
                          <div className="relative aspect-[16/10] shrink-0 bg-ink-100 sm:aspect-square sm:w-40">
                            {listing.photos[0] ? (
                              <Image
                                src={listing.photos[0].url}
                                alt={listing.photos[0].alt}
                                fill
                                sizes="160px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="grid h-full place-items-center text-ink-400">
                                <IconImage className="text-2xl" aria-hidden="true" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 p-4 sm:p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <h2 className="min-w-0 text-base font-bold text-ink-900">
                                {listing.title}
                              </h2>
                              <StatusBadge status={listing.status} size="sm" />
                            </div>

                            <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
                              <div>
                                <dt className="text-ink-500">Price</dt>
                                <dd className="font-semibold text-ink-800">
                                  {formatMoney(listing.pricePerHourCents, listing.currency)}/hr
                                </dd>
                              </div>
                              <div>
                                <dt className="text-ink-500">Availability</dt>
                                <dd className="font-semibold text-ink-800">
                                  {listing.availability.length} {listing.availability.length === 1 ? "day" : "days"} a week
                                </dd>
                              </div>
                              <div>
                                <dt className="text-ink-500">Views</dt>
                                <dd className="font-semibold text-ink-800">{listing.viewCount}</dd>
                              </div>
                            </dl>

                            {listing.status === "needs_changes" ? (
                              <Alert tone="warning" className="mt-3">
                                This listing needs changes before it can be published.
                                Check your notifications for details.
                              </Alert>
                            ) : null}

                            <div className="mt-4 flex flex-wrap gap-2">
                              <ButtonLink
                                href={`/host/listings/${listing.id}/edit`}
                                size="sm"
                                leadingIcon={<IconEdit />}
                              >
                                Edit
                              </ButtonLink>
                              <ButtonLink
                                href={`/spaces/${listing.slug}`}
                                variant="secondary"
                                size="sm"
                                leadingIcon={<IconEye />}
                              >
                                Preview
                              </ButtonLink>
                              {listing.status === "active" ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leadingIcon={<IconPause />}
                                  disabled={busy}
                                  onClick={() => void setStatus(listing, "paused", "Listing paused")}
                                >
                                  Pause
                                </Button>
                              ) : null}
                              {listing.status === "paused" ? (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => void setStatus(listing, "active", "Listing is active again")}
                                >
                                  Resume
                                </Button>
                              ) : null}
                              <Button variant="ghost" size="sm" leadingIcon={<IconCopy />} disabled={busy}>
                                Duplicate
                              </Button>
                              {listing.status !== "archived" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  leadingIcon={<IconArchive />}
                                  className="text-danger-700 hover:bg-danger-50"
                                  onClick={() => setArchiveTarget(listing)}
                                >
                                  Archive
                                </Button>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="sm"
                                leadingIcon={<IconTrash />}
                                className="text-danger-700 hover:bg-danger-50"
                                onClick={() => setDeleteTarget(listing)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>
                )}
              </TabPanel>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() =>
          archiveTarget && void setStatus(archiveTarget, "archived", "Listing archived")
        }
        loading={busy}
        title="Archive this listing?"
        description="It will stop appearing in search and cannot be booked. Existing confirmed reservations are not canceled — you still need to honour them."
        confirmLabel="Archive listing"
        destructive
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && void deleteListing(deleteTarget)}
        loading={busy}
        title="Delete this listing?"
        description="This permanently removes the listing and cannot be undone. If it has any reservation history, it will be archived instead so those bookings stay honoured."
        confirmLabel="Delete listing"
        destructive
      />
    </div>
  );
}
