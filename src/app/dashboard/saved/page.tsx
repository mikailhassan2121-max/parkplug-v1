"use client";

import { saved as savedApi } from "@/lib/api";
import { useAsync } from "@/lib/use-async";
import { EmptyState, ErrorState, SkeletonListingCard } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { IconHeart } from "@/components/ui/icons";
import { ListingResultCard } from "@/components/search/result-card";

export default function SavedSpacesPage() {
  const state = useAsync(() => savedApi.list(), []);
  const { toast } = useToast();

  async function remove(listingId: string, title: string) {
    const result = await savedApi.toggle(listingId);
    if (result.ok) {
      toast({
        tone: "success",
        title: "Removed from saved spaces",
        description: title,
        action: {
          label: "Undo",
          onClick: () => void savedApi.toggle(listingId).then(() => state.reload()),
        },
      });
      state.reload();
    } else {
      toast({ tone: "error", title: "Could not update saved spaces", description: result.error.message });
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Saved spaces</h1>
      <p className="mt-1.5 text-sm text-ink-600">
        Spaces you have kept for later. Check availability before you travel.
      </p>

      <div className="mt-6">
        {state.status === "loading" ? (
          <div role="status" aria-busy="true" className="grid gap-4 sm:grid-cols-2">
            <span className="sr-only">Loading your saved spaces</span>
            <SkeletonListingCard />
            <SkeletonListingCard />
          </div>
        ) : state.status === "error" ? (
          <ErrorState
            title="We could not load your saved spaces"
            description={state.error.message}
            actions={[{ label: "Try again", onClick: state.reload }]}
          />
        ) : state.data.length === 0 ? (
          <EmptyState
            icon={<IconHeart />}
            title="Save spaces to quickly find them later."
            description="Tap the heart on any listing and it will show up here."
            actions={[{ label: "Explore Parking", href: "/parking" }]}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {state.data.map((listing) => (
              <li key={listing.id}>
                <ListingResultCard
                  listing={listing}
                  layout="grid"
                  saved
                  onToggleSave={() => void remove(listing.id, listing.title)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
