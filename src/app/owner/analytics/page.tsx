import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { OwnerAnalyticsView } from "./owner-analytics-view";

export const metadata: Metadata = buildMetadata({
  title: "Analytics",
  description: "Occupancy trends for your facilities, derived from real sensor activity.",
  noIndex: true,
});

export default function OwnerAnalyticsPage() {
  return <OwnerAnalyticsView />;
}
