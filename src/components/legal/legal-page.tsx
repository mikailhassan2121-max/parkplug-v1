import Link from "next/link";
import type { ReactNode } from "react";
import { business, PLACEHOLDER } from "@/config/business";
import { Container } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export type LegalSection = {
  id: string;
  heading: string;
  body: ReactNode;
};

/**
 * Shared frame for policy pages: table of contents, readable measure, and a
 * visible effective date. Values ParkPlug has not confirmed render as explicit
 * placeholders rather than plausible-looking inventions.
 */
export function LegalPage({
  title,
  summary,
  sections,
  relatedLinks = [],
}: {
  title: string;
  summary: string;
  sections: LegalSection[];
  relatedLinks?: Array<{ href: string; label: string }>;
}) {
  const effectiveDate = business.policyEffectiveDate ?? PLACEHOLDER.effectiveDate;

  return (
    <Container size="wide" className="py-8 lg:py-14">
      <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-16">
        {/* ------------------------------------------------ Table of contents */}
        <nav aria-labelledby="toc-heading" className="lg:sticky lg:top-24 lg:self-start">
          <h2 id="toc-heading" className="text-xs font-bold uppercase tracking-wider text-ink-500">
            On this page
          </h2>
          <ul className="mt-3 space-y-1.5 border-l border-ink-200 pl-4">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block py-0.5 text-sm text-ink-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ul>

          {relatedLinks.length > 0 ? (
            <>
              <h2 className="mt-8 text-xs font-bold uppercase tracking-wider text-ink-500">
                Related
              </h2>
              <ul className="mt-3 space-y-1.5 border-l border-ink-200 pl-4">
                {relatedLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block py-0.5 text-sm text-ink-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </nav>

        {/* -------------------------------------------------------- Document */}
        <article className="min-w-0 max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-ink-600">{summary}</p>
          <p className="mt-4 text-sm text-ink-500">
            Effective date: <strong className="font-semibold text-ink-700">{effectiveDate}</strong>
          </p>

          {!business.legalName ? (
            <Alert tone="neutral" className="mt-6">
              Where this page refers to {PLACEHOLDER.legalName}, that is the
              operator of ParkPlug. Contact details are on the{" "}
              <Link href="/support" className="font-semibold underline underline-offset-2">
                support page
              </Link>
              .
            </Alert>
          ) : null}

          <div className="mt-10 space-y-10">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
                <h2
                  id={`${section.id}-heading`}
                  className="text-xl font-bold tracking-tight text-ink-950"
                >
                  <span className="mr-2 text-ink-400">{index + 1}.</span>
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3 text-[0.9375rem] leading-relaxed text-ink-700 [&_a]:font-semibold [&_a]:text-brand-700 [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
                  {section.body}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-card border border-ink-200 bg-ink-50 p-5">
            <h2 className="text-base font-bold">Questions about this policy?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
              Our support team can help.{" "}
              <Link href="/support" className="font-semibold text-brand-700 underline underline-offset-2">
                Contact support
              </Link>
              {business.supportEmail ? (
                <>
                  {" "}
                  or email{" "}
                  <a
                    href={`mailto:${business.supportEmail}`}
                    className="font-semibold text-brand-700 underline underline-offset-2"
                  >
                    {business.supportEmail}
                  </a>
                </>
              ) : null}
              .
            </p>
          </div>
        </article>
      </div>
    </Container>
  );
}
