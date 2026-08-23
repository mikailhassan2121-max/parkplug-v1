import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { OwnerFacilitiesView } from "./owner-facilities-view";

export const metadata: Metadata = buildMetadata({
  title: "Facilities",
  description: "Every sensor-monitored facility connected to your account.",
  noIndex: true,
});

export default function OwnerFacilitiesPage() {
  return <OwnerFacilitiesView />;
}
