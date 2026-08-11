import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { HostFacilitiesView } from "./host-facilities-view";

export const metadata: Metadata = buildMetadata({
  title: "Your Facilities",
  description: "Live occupancy and sensor health for the facilities you manage.",
  path: "/host/facilities",
  noIndex: true,
});

export default function HostFacilitiesPage() {
  return <HostFacilitiesView />;
}
