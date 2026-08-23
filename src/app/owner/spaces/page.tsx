import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { OwnerSpacesView } from "./owner-spaces-view";

export const metadata: Metadata = buildMetadata({
  title: "Parking spaces",
  description: "Every monitored parking space across your facilities.",
  noIndex: true,
});

export default function OwnerSpacesPage() {
  return <OwnerSpacesView />;
}
