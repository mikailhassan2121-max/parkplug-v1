import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { RequireAuth } from "@/components/dashboard/require-auth";
import { ReportFlow } from "./report-flow";

export const metadata: Metadata = buildMetadata({
  title: "Report free parking",
  description:
    "Spotted open public parking? Report where it is and what the signs say to help nearby drivers. Availability is not guaranteed — always follow posted signs.",
  path: "/report-parking",
});

// Reporting is tied to an account (POST /reports requires auth, and abuse
// prevention needs a real user behind every report) — gate it here so an
// anonymous visitor finds that out before filling in five steps, not after.
export default function ReportParkingPage() {
  return (
    <RequireAuth>
      <ReportFlow />
    </RequireAuth>
  );
}
