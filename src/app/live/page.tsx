import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { LiveView } from "./live-view";

export const metadata: Metadata = buildMetadata({
  title: "Live Parking Map",
  description:
    "Real-time, sensor-verified parking availability. See exactly which spaces are open before you arrive.",
  path: "/live",
});

export default function LivePage() {
  return <LiveView />;
}
