import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { ListingWizard } from "./listing-wizard";

export const metadata: Metadata = buildMetadata({
  title: "List your space",
  description:
    "Add your driveway, garage, or lot to ParkPlugs. Choose your own availability and price, and pause any time.",
  path: "/host/listings/new",
});

export default function NewListingPage() {
  return <ListingWizard />;
}
