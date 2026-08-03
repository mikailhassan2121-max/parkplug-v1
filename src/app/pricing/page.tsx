import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { business, feesConfigured, formatBps, PLACEHOLDER } from "@/config/business";
import { Container, SectionHeading } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Accordion } from "@/components/ui/menu";
import { IconCheckCircle, IconWallet } from "@/components/ui/icons";

export const metadata: Metadata = buildMetadata({
  title: "Pricing & Fees",
  description:
    "Exactly what a driver pays, what a host receives, and how ParkPlugs's fees work. No fee is introduced at the last step.",
  path: "/pricing",
});

export default function PricingPage() {
  const serviceFee = formatBps(business.serviceFeeBps, PLACEHOLDER.serviceFee);
  const hostFee = formatBps(business.hostFeeBps, PLACEHOLDER.hostFee);

  return (
    <>
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50/70 to-white">
        <Container size="default" className="py-12 lg:py-16">
          <SectionHeading
            as="h1"
            eyebrow="Pricing & fees"
            title="You see the whole price before you pay."
            description="ParkPlugs shows the full breakdown from the first step of booking — never a low number up front and a surprise at checkout."
          />
        </Container>
      </section>

      <Container size="default" className="py-12 lg:py-16">
        <div className="max-w-3xl space-y-14">
          {!feesConfigured ? (
            <Alert tone="warning" title="Fee rates are not yet published">
              ParkPlugs&rsquo;s service and host fee rates have not been confirmed for
              this environment, so they appear below as placeholders rather than as
              numbers we cannot stand behind. The real rate is always shown in your
              price breakdown before you pay.
            </Alert>
          ) : null}

          {/* -------------------------------------------------- Driver side */}
          <section aria-labelledby="drivers-pay">
            <h2 id="drivers-pay" className="text-2xl font-extrabold tracking-tight">
              What a driver pays
            </h2>
            <div className="mt-5 overflow-hidden rounded-card border border-ink-200 bg-white">
              <dl>
                {[
                  {
                    label: "Parking subtotal",
                    value: "Set by the host",
                    hint: "The hourly rate multiplied by how long you book, with any daily cap applied.",
                  },
                  {
                    label: "ParkPlugs service fee",
                    value: serviceFee,
                    hint: "Covers running the marketplace, payment processing, and support.",
                  },
                  {
                    label: "Taxes",
                    value: business.taxBps === null ? "Where applicable" : formatBps(business.taxBps, "—"),
                    hint: "Applied where local rules require it. Shown as its own line.",
                  },
                ].map((row) => (
                  <div key={row.label} className="border-b border-ink-200 px-5 py-4 last:border-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <dt className="text-sm font-semibold text-ink-900">{row.label}</dt>
                      <dd className="text-sm font-bold text-ink-950">{row.value}</dd>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-600">{row.hint}</p>
                  </div>
                ))}
              </dl>
              <div className="flex items-baseline justify-between gap-3 bg-ink-50 px-5 py-4">
                <span className="text-base font-bold text-ink-900">Total</span>
                <span className="text-base font-extrabold text-ink-950">
                  Shown before you pay
                </span>
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------- Host side */}
          <section aria-labelledby="hosts-receive">
            <h2 id="hosts-receive" className="text-2xl font-extrabold tracking-tight">
              What a host receives
            </h2>
            <div className="mt-5 overflow-hidden rounded-card border border-ink-200 bg-white">
              <dl>
                {[
                  {
                    label: "Parking subtotal",
                    value: "Your rate",
                    hint: "You set the hourly price and any daily maximum.",
                  },
                  {
                    label: "ParkPlugs host fee",
                    value: `−${hostFee}`,
                    hint: "Deducted from the parking subtotal before payout.",
                  },
                ].map((row) => (
                  <div key={row.label} className="border-b border-ink-200 px-5 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <dt className="text-sm font-semibold text-ink-900">{row.label}</dt>
                      <dd className="text-sm font-bold text-ink-950">{row.value}</dd>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-600">{row.hint}</p>
                  </div>
                ))}
              </dl>
              <div className="flex items-baseline justify-between gap-3 bg-ink-50 px-5 py-4">
                <span className="text-base font-bold text-ink-900">You receive</span>
                <span className="text-base font-extrabold text-ink-950">
                  Parking subtotal minus the host fee
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              The service fee a driver pays is ParkPlugs&rsquo;s and does not come out of
              your earnings. Actual earnings depend on demand, availability, pricing,
              and completed reservations.
            </p>
          </section>

          {/* ------------------------------------------------ Free parking */}
          <section aria-labelledby="free-parking" className="rounded-card border-2 border-accent-200 bg-accent-50 p-6">
            <h2 id="free-parking" className="text-xl font-extrabold tracking-tight">
              Community-reported parking is free
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-800">
              There is no charge to see community reports, to file one, or to park in a
              space someone reported. There is nothing to pay because there is nothing
              being reserved — availability is never guaranteed, and posted restrictions
              always apply.
            </p>
          </section>

          {/* --------------------------------------------------- Refunds */}
          <section aria-labelledby="refunds">
            <h2 id="refunds" className="text-2xl font-extrabold tracking-tight">
              Refunds and cancellations
            </h2>
            <ul className="mt-5 space-y-3">
              {[
                "Cancel far enough in advance and the parking cost is refunded in full, along with the service fee.",
                "Cancel close to your arrival time and some or all of the parking cost may be retained, as stated on your reservation.",
                "If a host cancels a confirmed reservation, the driver is refunded in full including the service fee.",
                "Partial refunds return the service fee in proportion to the parking cost returned.",
                "Refunds go back to the original payment method as soon as they are issued.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                  <IconCheckCircle className="mt-0.5 shrink-0 text-base text-brand-600" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/legal/cancellation"
              className="mt-4 inline-block text-sm font-bold text-brand-700 underline underline-offset-2"
            >
              Read the full Cancellation &amp; Refund Policy
            </Link>
          </section>

          {/* -------------------------------------------------------- FAQ */}
          <section aria-labelledby="pricing-faq">
            <h2 id="pricing-faq" className="text-2xl font-extrabold tracking-tight">
              Common questions
            </h2>
            <Accordion
              className="mt-5"
              items={[
                {
                  id: "hidden",
                  question: "Are there any hidden fees?",
                  answer: (
                    <p>
                      No. Every line that makes up your total is shown from the first
                      step of booking, not revealed at the end. If a fee is not in that
                      breakdown, you are not paying it.
                    </p>
                  ),
                },
                {
                  id: "subscription",
                  question: "Is there a subscription or membership?",
                  answer: (
                    <p>
                      No. You pay per reservation, and hosting costs nothing to start —
                      the host fee only applies to reservations that actually happen.
                    </p>
                  ),
                },
                {
                  id: "deposit",
                  question: "Is there a deposit or hold on my card?",
                  answer: (
                    <p>
                      ParkPlugs does not take a separate security deposit. You are charged
                      the total shown when you confirm your reservation.
                    </p>
                  ),
                },
                {
                  id: "overstay",
                  question: "What happens if I stay longer than I booked?",
                  answer: (
                    <p>
                      Extend your reservation before your window ends. Overstaying can
                      leave the next driver with nowhere to park and may affect your
                      account, so please do not rely on settling up afterwards.
                    </p>
                  ),
                },
                {
                  id: "host-pricing",
                  question: "Can a host change the price after I book?",
                  answer: (
                    <p>
                      No. A confirmed reservation keeps the price it was booked at, even
                      if the host changes their rate afterwards.
                    </p>
                  ),
                },
              ]}
            />
          </section>

          <section className="rounded-card border border-ink-200 bg-ink-50 p-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-xl text-brand-700 shadow-e1">
              <IconWallet aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-bold tracking-tight">
              Ready to park, or ready to earn?
            </h2>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/search">Find Parking</ButtonLink>
              <ButtonLink href="/host/listings/new" variant="secondary">
                List Your Space
              </ButtonLink>
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
