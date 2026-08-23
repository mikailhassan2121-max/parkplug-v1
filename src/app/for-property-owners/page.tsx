import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Container, SectionHeading } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import {
  IconBolt,
  IconBuilding,
  IconChart,
  IconCheckCircle,
  IconGarage,
  IconShield,
} from "@/components/ui/icons";

export const metadata: Metadata = buildMetadata({
  title: "For Property Owners",
  description:
    "List a garage or lot on ParkPlugs, or add live sensor monitoring so drivers see real-time availability before they arrive.",
  path: "/for-property-owners",
});

const BENEFITS = [
  {
    icon: IconChart,
    title: "Real occupancy, not a guess",
    description:
      "Sensor-enabled facilities report each space's status live — drivers see exactly how many spots are open before they leave home.",
  },
  {
    icon: IconBolt,
    title: "No manual updates",
    description:
      "Each monitored space reports its own state automatically. Nobody has to log in and mark a spot open or taken.",
  },
  {
    icon: IconShield,
    title: "You keep control",
    description:
      "Set your own pricing and availability windows. ParkPlugs handles booking, payment, and payout — you approve the listing.",
  },
];

const STEPS = [
  {
    title: "Tell us about your property",
    description: "Garage, surface lot, or driveway — list the spaces you want to make available.",
  },
  {
    title: "Add monitoring (optional)",
    description:
      "Qualifying facilities can add per-space sensors so availability updates automatically instead of relying on manual toggles.",
  },
  {
    title: "Start earning",
    description: "Drivers book and pay through ParkPlugs. Payouts go to your connected bank account.",
  },
];

export default function ForPropertyOwnersPage() {
  return (
    <>
      <section className="border-b border-ink-200 bg-ink-50">
        <Container size="default" className="py-14 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-teal">
              For property owners
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              Turn unused parking into steady income.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-ink-600 sm:text-lg">
              List a single driveway or a full garage. Add live sensor monitoring
              so every space reports its own availability in real time — no
              manual check-ins, no guesswork for drivers.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/host/listings/new" size="lg">
                List Your Space
              </ButtonLink>
              <ButtonLink href="/owner" variant="secondary" size="lg">
                View Owner Dashboard
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <Container size="default" className="py-14 lg:py-20">
        <SectionHeading
          eyebrow="Why owners choose ParkPlugs"
          title="Built for garages and lots that want to run themselves."
          description="Whether you list one space or manage a facility with dozens, ParkPlugs handles discovery, booking, and payment."
        />

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="rounded-card border border-ink-200 bg-ink-50 p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-xl text-teal">
                  <Icon aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-bold text-ink-900">{b.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{b.description}</p>
              </div>
            );
          })}
        </div>
      </Container>

      <section className="border-y border-ink-200 bg-ink-50/50">
        <Container size="default" className="py-14 lg:py-20">
          <SectionHeading eyebrow="Getting started" title="Three steps to your first booking." />
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-card border border-ink-200 bg-ink-50 p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3.5 text-base font-bold text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <Container size="default" className="py-14 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink-100 text-xl text-brand-600">
              <IconGarage aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-950">
              Already have a facility with sensors?
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-600">
              If your garage already has per-space sensor hardware, or you want
              to add it, ParkPlugs can bind each sensor to a space and stream
              live occupancy straight to the driver map — no separate app.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "Live AVAILABLE / OCCUPIED status per space",
                "Automatic offline detection if a sensor stops reporting",
                "An owner dashboard with occupancy, sensor health, and activity history",
              ].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                  <IconCheckCircle className="mt-0.5 shrink-0 text-base text-teal" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-ink-200 bg-ink-50 p-6">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-xl text-brand-600">
              <IconBuilding aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-ink-900">Talk to us about your property</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
              Multi-space facilities and sensor installs are set up individually.
              Reach out through support and we&rsquo;ll help you get set up.
            </p>
            <ButtonLink href="/support" variant="secondary" className="mt-5">
              Contact Support
            </ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}
