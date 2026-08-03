"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSession } from "@/lib/session";
import { Container } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { IconLock } from "@/components/ui/icons";

/**
 * Gate for signed-in areas. Renders a real sign-in prompt rather than
 * redirecting, so a shared link explains itself instead of bouncing.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession();
  const pathname = usePathname();

  if (session.status === "loading") {
    return (
      <Container size="default" className="py-10">
        <div role="status" aria-busy="true">
          <span className="sr-only">Loading your account</span>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-6 h-40 w-full" rounded="rounded-card" />
        </div>
      </Container>
    );
  }

  if (session.status === "anonymous") {
    return (
      <Container size="narrow" className="py-16 lg:py-24">
        <div className="rounded-card border border-ink-200 bg-white p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-2xl text-brand-700">
            <IconLock aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Sign in to continue</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-600">
            This page is part of your ParkPlugs account. Sign in to see your
            reservations, saved spaces, vehicles, and listings.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href={`/signin?next=${encodeURIComponent(pathname)}`} size="lg">
              Sign In
            </ButtonLink>
            <ButtonLink href={`/signup?next=${encodeURIComponent(pathname)}`} variant="secondary" size="lg">
              Create Account
            </ButtonLink>
          </div>
        </div>
      </Container>
    );
  }

  return <>{children}</>;
}
