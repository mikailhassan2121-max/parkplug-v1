"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { IconAlert, IconRefresh } from "@/components/ui/icons";

/**
 * Route-level error boundary. Shows what happened and how to recover, and
 * never exposes a stack trace to the user.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced for the browser console and any error reporter that is wired up.
    console.error("ParkPlug route error:", error);
  }, [error]);

  return (
    <Container size="narrow" className="flex flex-1 items-center py-16 lg:py-24">
      <div className="w-full text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-danger-50 text-3xl text-danger-600">
          <IconAlert aria-hidden="true" />
        </span>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
          Something went wrong on our end
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-ink-600">
          This is not your fault. The page failed to load properly — trying again
          usually fixes it.
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-600">
          If you were part-way through a booking or a listing, nothing has been
          submitted and your draft is still saved.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" leadingIcon={<IconRefresh />} onClick={reset}>
            Try again
          </Button>
          <ButtonLink href="/" variant="secondary" size="lg">
            Return Home
          </ButtonLink>
          <ButtonLink href="/support" variant="ghost" size="lg">
            Contact Support
          </ButtonLink>
        </div>

        {error.digest ? (
          <p className="mt-8 font-mono text-2xs text-ink-500">
            Error reference: {error.digest}
          </p>
        ) : null}
      </div>
    </Container>
  );
}
