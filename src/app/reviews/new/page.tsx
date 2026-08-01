import { Suspense } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { RequireAuth } from "@/components/dashboard/require-auth";
import { Container } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = buildMetadata({
  title: "Leave a review",
  description: "Share how your ParkPlug reservation went.",
  noIndex: true,
});

export default function NewReviewPage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <Container size="narrow" className="py-12">
            <Skeleton className="h-80 w-full" rounded="rounded-card" />
          </Container>
        }
      >
        <ReviewForm />
      </Suspense>
    </RequireAuth>
  );
}
