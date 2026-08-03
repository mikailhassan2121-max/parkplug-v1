import { Suspense } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { RequireAuth } from "@/components/dashboard/require-auth";
import { Container } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { BookingFlow } from "./booking-flow";

type Props = { params: Promise<{ slug: string }> };

export const metadata: Metadata = buildMetadata({
  title: "Reserve a parking space",
  description: "Confirm your times, vehicle, and parking rules, then complete your reservation.",
  // Checkout contains personal details and must never be indexed.
  noIndex: true,
});

// Booking is tied to an account (POST /reservations requires auth) — gate it
// here so an anonymous visitor finds that out before filling in four steps,
// not at the final confirm click. Mirrors ReportParkingPage.
export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <Container size="default" className="py-10">
            <Skeleton className="h-96 w-full" rounded="rounded-card" />
          </Container>
        }
      >
        <BookingFlow slug={slug} />
      </Suspense>
    </RequireAuth>
  );
}
