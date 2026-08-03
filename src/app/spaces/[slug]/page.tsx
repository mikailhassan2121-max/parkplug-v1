import { Suspense } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Container } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { ListingView } from "./listing-view";

type Props = { params: Promise<{ slug: string }> };

/**
 * Listing metadata deliberately carries no street address — not in the title,
 * the description, or the canonical URL — so an exact residential location can
 * never leak through search results or link previews.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return buildMetadata({
    title: "Reservable parking space",
    description:
      "View photos, parking rules, availability, and pricing for this space on ParkPlugs. The exact address is shared only after a reservation is confirmed.",
    path: `/spaces/${slug}`,
  });
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params;
  return (
    <Suspense
      fallback={
        <Container size="wide" className="py-8">
          <Skeleton className="aspect-[2/1] w-full" rounded="rounded-card" />
        </Container>
      }
    >
      <ListingView slug={slug} />
    </Suspense>
  );
}
