import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { Container, SectionHeading } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Accordion } from "@/components/ui/menu";
import { IconAlert, IconCamera, IconCheckCircle, IconLock, IconWallet } from "@/components/ui/icons";

export const metadata: Metadata = buildMetadata({
  title: "Hosting Guide",
  description:
    "A practical guide to listing parking on ParkPlugs: what to check first, how to price it, what makes a good listing, and what to expect.",
  path: "/hosting-guide",
});

export default function HostingGuidePage() {
  return (
    <>
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50/70 to-white">
        <Container size="default" className="py-12 lg:py-16">
          <SectionHeading
            as="h1"
            eyebrow="Hosting guide"
            title="Everything to know before you list a space."
            description="Ten minutes of preparation makes for a listing drivers trust and far fewer questions later."
          />
        </Container>
      </section>

      <Container size="default" className="py-12 lg:py-16">
        <div className="max-w-2xl space-y-14">
          <section aria-labelledby="before">
            <h2 id="before" className="text-2xl font-extrabold tracking-tight">
              Before you list
            </h2>
            <Alert tone="warning" className="mt-4" icon={<IconAlert />} title="Check that you are allowed">
              ParkPlugs does not check this for you. Read your lease, HOA rules, condo
              bylaws, or business permit conditions, and look up whether your local
              authority restricts commercial parking on residential property.
            </Alert>
            <ul className="mt-5 space-y-3">
              {[
                "Confirm you own the space, or have written permission from whoever does.",
                "Make sure a car can get in and out without reversing blind onto a busy road.",
                "Check the space does not block a hydrant, an emergency route, or a neighbour's access.",
                "Measure height clearance if it is a garage or anything covered.",
                "Think about which hours you genuinely will not need it yourself.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                  <IconCheckCircle className="mt-0.5 shrink-0 text-base text-brand-600" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="photos">
            <h2 id="photos" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <IconCamera className="text-brand-600" aria-hidden="true" />
              Photos that get bookings
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Photos are the main reason a driver picks one space over another. Take
              them in daylight, and show the whole journey a driver makes.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-card border border-ink-200 bg-white p-5">
                <h3 className="text-sm font-bold text-success-700">Do show</h3>
                <ul className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-ink-700">
                  <li>· The space itself, empty</li>
                  <li>· The entrance from the street</li>
                  <li>· The approach as a driver sees it</li>
                  <li>· Where the space begins and ends</li>
                  <li>· Any signs or restrictions</li>
                </ul>
              </div>
              <div className="rounded-card border border-warning-200 bg-warning-50 p-5">
                <h3 className="text-sm font-bold text-warning-800">Never include</h3>
                <ul className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-warning-800">
                  <li>· License plates</li>
                  <li>· People&rsquo;s faces</li>
                  <li>· House numbers or mail</li>
                  <li>· Documents or personal information</li>
                </ul>
              </div>
            </div>
          </section>

          <section aria-labelledby="pricing">
            <h2 id="pricing" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <IconWallet className="text-brand-600" aria-hidden="true" />
              Pricing your space
            </h2>
            <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink-700">
              <p>
                Start by looking at what nearby spaces charge and what the closest public
                lot or meter costs. A space that is closer, covered, or easier to get
                into can reasonably sit above that; one that is a longer walk should sit
                below it.
              </p>
              <p>
                A daily maximum is worth setting if anyone might park all day — it stops
                an hourly rate becoming an unreasonable total and makes your listing
                competitive for commuters.
              </p>
              <p>
                You can change your price whenever you like. Reservations that are
                already confirmed keep the price they were booked at.
              </p>
            </div>
            <Alert tone="neutral" className="mt-5">
              Actual earnings depend on demand, availability, pricing, and completed
              reservations. ParkPlugs does not promise an amount.
            </Alert>
          </section>

          <section aria-labelledby="instructions">
            <h2 id="instructions" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <IconLock className="text-brand-600" aria-hidden="true" />
              Writing instructions that work
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Entry instructions are private — only a driver with a confirmed
              reservation sees them. Write them for someone who has never been to your
              street.
            </p>
            <div className="mt-5 rounded-card border border-ink-200 bg-ink-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
                Instead of
              </p>
              <p className="mt-1 text-sm italic text-ink-600">&ldquo;Park in the driveway.&rdquo;</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-brand-700">
                Try
              </p>
              <p className="mt-1 text-sm text-ink-800">
                &ldquo;Turn in at the second driveway past the blue mailbox. Pull all the
                way forward on the right-hand side so the garage door stays clear. There
                is room for one car; please do not block the left side, which the
                neighbours use.&rdquo;
              </p>
            </div>
          </section>

          <section aria-labelledby="guide-faq">
            <h2 id="guide-faq" className="text-2xl font-extrabold tracking-tight">
              Common questions
            </h2>
            <Accordion
              className="mt-5"
              items={[
                {
                  id: "who-sees-address",
                  question: "Who can see my address?",
                  answer: (
                    <p>
                      Only a driver with a confirmed reservation, and only for that
                      reservation. Public pages show an approximate area with the map
                      point deliberately offset, and the address never appears in page
                      titles, meta descriptions, or the HTML source.
                    </p>
                  ),
                },
                {
                  id: "insurance",
                  question: "Does ParkPlugs insure my property?",
                  answer: (
                    <p>
                      No. ParkPlugs does not provide insurance for vehicles, property, or
                      people. Check whether your existing home or business policy covers
                      letting someone park on your property, and speak to your insurer if
                      you are unsure.
                    </p>
                  ),
                },
                {
                  id: "bad-driver",
                  question: "What if a driver overstays or causes a problem?",
                  answer: (
                    <p>
                      Message them through ParkPlugs first, then{" "}
                      <Link href="/support">contact support</Link> with the reservation
                      reference. You can also review the driver after the reservation
                      ends, which other hosts will see.
                    </p>
                  ),
                },
                {
                  id: "need-it-back",
                  question: "What if I need the space back?",
                  answer: (
                    <p>
                      Block those dates in your calendar, or pause the listing entirely.
                      Blocking stops new bookings but does not cancel confirmed ones, so
                      do it with as much notice as you can.
                    </p>
                  ),
                },
                {
                  id: "taxes",
                  question: "Do I owe tax on what I earn?",
                  answer: (
                    <p>
                      Possibly — that depends on where you are and your circumstances.
                      You can export your earnings and fees from your earnings page.
                      ParkPlugs does not give tax advice.
                    </p>
                  ),
                },
              ]}
            />
          </section>

          <section className="rounded-card border-2 border-brand-200 bg-brand-50 p-6 text-center">
            <h2 className="text-xl font-extrabold tracking-tight">Ready to list?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-700">
              It takes about ten minutes, and you can save a draft and come back to it.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/host/listings/new" size="lg">
                List Your Space
              </ButtonLink>
              <ButtonLink href="/legal/host-standards" variant="secondary" size="lg">
                Host Standards
              </ButtonLink>
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
