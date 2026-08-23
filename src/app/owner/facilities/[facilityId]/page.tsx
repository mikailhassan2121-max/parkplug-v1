import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { OwnerFacilityView } from "./owner-facility-view";

export const metadata: Metadata = buildMetadata({
  title: "Facility",
  description: "Live occupancy, sensors, and activity for this facility.",
  noIndex: true,
});

export default async function OwnerFacilityPage({
  params,
}: {
  params: Promise<{ facilityId: string }>;
}) {
  const { facilityId } = await params;
  return <OwnerFacilityView facilityId={facilityId} />;
}
