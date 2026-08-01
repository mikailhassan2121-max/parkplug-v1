import type { Metadata } from "next";
import { Container } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <Container size="narrow" className="flex flex-1 items-center py-16 lg:py-24">
      <div className="w-full text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-brand-50">
          <LogoMark className="h-11 w-11" />
        </span>

        <p className="mt-6 text-sm font-bold uppercase tracking-[0.08em] text-brand-700">
          404
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
          This spot is not available.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-ink-600">
          The page may have moved, expired, or never existed. Community parking
          reports expire on their own, so an old link to one will land here too.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/" size="lg">
            Return Home
          </ButtonLink>
          <ButtonLink href="/search" variant="secondary" size="lg">
            Find Parking
          </ButtonLink>
          <ButtonLink href="/help" variant="ghost" size="lg">
            Visit Help Center
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
