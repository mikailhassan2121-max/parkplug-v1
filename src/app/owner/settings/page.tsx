import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { OwnerSettingsView } from "./owner-settings-view";

export const metadata: Metadata = buildMetadata({
  title: "Owner settings",
  description: "Account settings for the property owner dashboard.",
  noIndex: true,
});

export default function OwnerSettingsPage() {
  return <OwnerSettingsView />;
}
