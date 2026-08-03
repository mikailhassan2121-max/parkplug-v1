import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { RequireAuth } from "@/components/dashboard/require-auth";
import { HostShell } from "@/components/host/host-shell";

export const metadata: Metadata = buildMetadata({
  title: "Host dashboard",
  description: "Manage your ParkPlugs listings, calendar, reservations, and earnings.",
  noIndex: true,
});

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <HostShell>{children}</HostShell>
    </RequireAuth>
  );
}
