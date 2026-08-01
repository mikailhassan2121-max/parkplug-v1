import { Suspense } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Container } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { HelpView } from "./help-view";

export const metadata: Metadata = buildMetadata({
  title: "Help Center",
  description:
    "Guides for drivers, hosts, and account questions — finding parking, reserving a space, payments, cancellations, listing, payouts, and safety.",
  path: "/help",
});

export default function HelpPage() {
  return (
    <Suspense
      fallback={
        <Container size="default" className="py-14">
          <Skeleton className="h-96 w-full" rounded="rounded-card" />
        </Container>
      }
    >
      <HelpView />
    </Suspense>
  );
}
