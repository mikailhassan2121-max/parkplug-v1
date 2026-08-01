"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/card";
import { HostNav } from "./host-nav";

/**
 * Multi-step flows own the full width — a sidebar beside a nine-step wizard
 * squeezes the form and competes with its own progress indicator.
 */
const FULL_WIDTH_ROUTES = ["/host/listings/new"];

export function HostShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fullWidth = FULL_WIDTH_ROUTES.some((route) => pathname.startsWith(route));

  if (fullWidth) return <>{children}</>;

  return (
    <Container size="wide" className="py-6 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <HostNav />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
