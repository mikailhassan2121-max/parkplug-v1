import { Suspense } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Container } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { ReservationView } from "./reservation-view";

export const metadata: Metadata = buildMetadata({
  title: "Your reservation",
  description: "Reservation details, parking address, host instructions, and receipt.",
  // Contains an exact address and vehicle details — never indexed.
  noIndex: true,
});

export default async function ReservationPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <Suspense
      fallback={
        <Container size="default" className="py-10">
          <Skeleton className="h-96 w-full" rounded="rounded-card" />
        </Container>
      }
    >
      <ReservationView reference={reference} />
    </Suspense>
  );
}
