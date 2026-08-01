import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { ReportFlow } from "./report-flow";

export const metadata: Metadata = buildMetadata({
  title: "Report free parking",
  description:
    "Spotted open public parking? Report where it is and what the signs say to help nearby drivers. Availability is not guaranteed — always follow posted signs.",
  path: "/report-parking",
});

export default function ReportParkingPage() {
  return <ReportFlow />;
}
