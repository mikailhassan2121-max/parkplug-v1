import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { RequireAuth } from "@/components/dashboard/require-auth";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Container } from "@/components/ui/card";

export const metadata: Metadata = buildMetadata({
  title: "Dashboard",
  description: "Your ParkPlugs reservations, saved spaces, vehicles, and account settings.",
  noIndex: true,
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Container size="wide" className="py-6 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
          <DashboardNav />
          <div className="min-w-0">{children}</div>
        </div>
      </Container>
    </RequireAuth>
  );
}
