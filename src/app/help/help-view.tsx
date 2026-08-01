"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { HELP_ARTICLES, HELP_AUDIENCES } from "@/content/help-articles";
import { Container, SectionHeading } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/form";
import { Accordion } from "@/components/ui/menu";
import { IconChevronRight, IconHelp, IconMessage, IconSearch } from "@/components/ui/icons";

type Audience = (typeof HELP_AUDIENCES)[number]["value"];

export function HelpView() {
  const params = useSearchParams();
  const initialAudience = params.get("audience");
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<Audience | "all">(
    HELP_AUDIENCES.some((a) => a.value === initialAudience)
      ? (initialAudience as Audience)
      : "all",
  );

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return HELP_ARTICLES.filter((article) => {
      if (audience !== "all" && article.audience !== audience) return false;
      if (!term) return true;
      const haystack = [
        article.title,
        article.summary,
        ...article.body.flatMap((b) => [b.heading ?? "", ...b.paragraphs, ...(b.bullets ?? [])]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [query, audience]);

  return (
    <>
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50/70 to-white">
        <Container size="default" className="py-10 lg:py-14">
          <SectionHeading
            as="h1"
            title="How can we help?"
            description="Search our guides, or browse by what you are trying to do."
            align="center"
          />

          <div className="mx-auto mt-7 max-w-xl">
            <label htmlFor="help-search" className="sr-only">
              Search help articles
            </label>
            <Input
              id="help-search"
              type="search"
              size="lg"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a topic, e.g. cancel a reservation"
              leadingIcon={<IconSearch />}
              enterKeyHint="search"
            />
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {[{ value: "all" as const, label: "All topics" }, ...HELP_AUDIENCES].map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={audience === item.value}
                onClick={() => setAudience(item.value)}
                className={cn(
                  "min-h-9 rounded-full border px-4 text-sm font-semibold transition-colors",
                  audience === item.value
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-ink-300 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Container>
      </section>

      <Container size="default" className="py-10 lg:py-14">
        <p className="text-sm text-ink-600" aria-live="polite">
          {results.length === 0
            ? "No articles match your search."
            : `${results.length} ${results.length === 1 ? "article" : "articles"}`}
        </p>

        {results.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={<IconHelp />}
            title="Nothing matched that search"
            description="Try a different word, browse all topics, or send us the details and we will help directly."
            actions={[
              { label: "Clear search", onClick: () => { setQuery(""); setAudience("all"); } },
              { label: "Contact Support", href: "/support", variant: "secondary" },
            ]}
          />
        ) : (
          <Accordion
            className="mt-5"
            items={results.map((article) => ({
              id: article.slug,
              question: (
                <span>
                  <span className="block">{article.title}</span>
                  <span className="mt-0.5 block text-xs font-normal text-ink-500">
                    {article.summary}
                  </span>
                </span>
              ),
              answer: (
                <div className="space-y-4">
                  {article.body.map((block, i) => (
                    <div key={i}>
                      {block.heading ? (
                        <h3 className="mb-1.5 text-sm font-bold text-ink-900">{block.heading}</h3>
                      ) : null}
                      {block.paragraphs.map((paragraph, j) => (
                        <p key={j} className="mt-2 first:mt-0">
                          {paragraph}
                        </p>
                      ))}
                      {block.bullets ? (
                        <ul className="mt-2.5 space-y-1.5">
                          {block.bullets.map((bullet) => (
                            <li key={bullet} className="ml-5 list-disc">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}

                  {article.related?.length ? (
                    <div className="border-t border-ink-200 pt-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
                        Related
                      </p>
                      <ul className="mt-2 space-y-1">
                        {article.related.map((slug) => {
                          const related = HELP_ARTICLES.find((a) => a.slug === slug);
                          if (!related) return null;
                          return (
                            <li key={slug}>
                              <button
                                type="button"
                                onClick={() => {
                                  setAudience("all");
                                  setQuery(related.title);
                                }}
                                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                              >
                                {related.title}
                                <IconChevronRight className="text-xs" aria-hidden="true" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ),
            }))}
          />
        )}

        <div className="mt-10 rounded-card border border-ink-200 bg-ink-50 p-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-xl text-brand-700 shadow-e1">
            <IconMessage aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-bold tracking-tight">Still stuck?</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-600">
            Send us the details and our team will pick it up. If you have a
            reservation reference, include it so we can look it up straight away.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/support">Contact Support</ButtonLink>
            <ButtonLink href="/safety" variant="secondary">
              Safety &amp; Trust Center
            </ButtonLink>
          </div>
          <p className="mt-4 text-xs text-ink-500">
            For immediate danger or emergencies, contact local emergency services.
          </p>
        </div>

        <p className="mt-8 text-center text-sm text-ink-600">
          Looking for policies?{" "}
          <Link href="/legal/terms" className="font-bold text-brand-700 underline underline-offset-2">
            Terms
          </Link>
          {" · "}
          <Link href="/legal/privacy" className="font-bold text-brand-700 underline underline-offset-2">
            Privacy
          </Link>
          {" · "}
          <Link href="/legal/cancellation" className="font-bold text-brand-700 underline underline-offset-2">
            Cancellation
          </Link>
        </p>
      </Container>
    </>
  );
}
