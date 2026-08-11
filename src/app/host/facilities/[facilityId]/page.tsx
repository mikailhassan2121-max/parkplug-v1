import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { HostFacilityView } from "./host-facility-view";

type Props = { params: Promise<{ facilityId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { facilityId } = await params;
  return buildMetadata({
    title: "Facility dashboard",
    description: "Live occupancy, sensor health, and recent activity for this facility.",
    path: `/host/facilities/${facilityId}`,
    noIndex: true,
  });
}

export default async function HostFacilityPage({ params }: Props) {
  const { facilityId } = await params;
  return <HostFacilityView facilityId={facilityId} />;
}
