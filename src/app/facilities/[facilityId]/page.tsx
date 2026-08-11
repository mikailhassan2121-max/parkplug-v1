import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { FacilityView } from "./facility-view";

type Props = { params: Promise<{ facilityId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { facilityId } = await params;
  return buildMetadata({
    title: "Live parking facility",
    description: "Real-time, sensor-verified space-by-space parking availability.",
    path: `/facilities/${facilityId}`,
  });
}

export default async function FacilityPage({ params }: Props) {
  const { facilityId } = await params;
  return <FacilityView facilityId={facilityId} />;
}
