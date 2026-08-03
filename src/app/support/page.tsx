import { Suspense } from "react";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Container } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { SupportForm } from "./support-form";

export const metadata: Metadata = buildMetadata({
  title: "Contact Support",
  description: "Get help with a booking, a payment, a listing, or a safety concern on ParkPlugs.",
  path: "/support",
});

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <Container size="narrow" className="py-14">
          <Skeleton className="h-96 w-full" rounded="rounded-card" />
        </Container>
      }
    >
      <SupportForm />
    </Suspense>
  );
}
