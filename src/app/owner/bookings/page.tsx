import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { OwnerBookingsView } from "./owner-bookings-view";

export const metadata: Metadata = buildMetadata({
  title: "Bookings",
  description: "Marketplace reservations for facilities linked to a listing.",
  noIndex: true,
});

export default function OwnerBookingsPage() {
  return <OwnerBookingsView />;
}
