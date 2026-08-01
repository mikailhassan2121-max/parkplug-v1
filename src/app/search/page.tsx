import { Suspense } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { SkeletonListingCard } from "@/components/ui/feedback";
import { SearchView } from "./search-view";

export const metadata: Metadata = buildMetadata({
  title: "Find parking near your destination",
  description:
    "Search reservable private parking and recently reported free public spaces. Compare price, distance, and walking time on an interactive map.",
  path: "/search",
});

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchView />
    </Suspense>
  );
}

function SearchSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex min-h-[60dvh] flex-col lg:flex-row">
      <span className="sr-only">Loading search</span>
      <div className="space-y-4 p-4 sm:p-6 lg:w-[clamp(24rem,42%,34rem)] lg:border-r lg:border-ink-200">
        {[0, 1, 2].map((i) => (
          <SkeletonListingCard key={i} />
        ))}
      </div>
      <div className="skeleton min-h-[40dvh] flex-1" aria-hidden="true" />
    </div>
  );
}
