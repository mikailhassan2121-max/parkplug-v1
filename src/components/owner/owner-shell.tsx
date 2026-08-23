"use client";

import type { ReactNode } from "react";
import { Container } from "@/components/ui/card";
import { OwnerNav } from "./owner-nav";

export function OwnerShell({ children }: { children: ReactNode }) {
  return (
    <Container size="wide" className="py-6 lg:py-10">
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-teal">Property Owner</p>
      <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <OwnerNav />
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
