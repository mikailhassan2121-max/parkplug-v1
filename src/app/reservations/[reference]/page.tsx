import { Suspense } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { RequireAuth } from "@/components/dashboard/require-auth";
import { Container } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { ReservationView } from "./reservation-view";

export const metadata: Metadata = buildMetadata({
  title: "Your reservation",
  description: "Reservation details, parking address, host instructions, and receipt.",
  // Contains an exact address and vehicle details — never indexed.
  noIndex: true,
});

// This is the driver's own record (exact address, vehicle, price, host
// instructions) — gate it the same way /book and /report-parking are, so an
// anonymous visitor is asked to sign in rather than shown a bare error.
export default async function ReservationPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <Container size="default" className="py-10">
            <Skeleton className="h-96 w-full" rounded="rounded-card" />
          </Container>
        }
      >
        <ReservationView reference={reference} />
      </Suspense>
    </RequireAuth>
  );
}
