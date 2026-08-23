import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { RequireAuth } from "@/components/dashboard/require-auth";
import { OwnerShell } from "@/components/owner/owner-shell";

export const metadata: Metadata = buildMetadata({
  title: "Property owner dashboard",
  description: "Monitor your facilities, spaces, and sensors in real time.",
  noIndex: true,
});

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <OwnerShell>{children}</OwnerShell>
    </RequireAuth>
  );
}
