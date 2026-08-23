import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { OwnerSensorsView } from "./owner-sensors-view";

export const metadata: Metadata = buildMetadata({
  title: "Sensors",
  description: "Device health across every facility you manage.",
  noIndex: true,
});

export default function OwnerSensorsPage() {
  return <OwnerSensorsView />;
}
