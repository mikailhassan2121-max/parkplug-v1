import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { Container, SectionHeading } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  IconAlert,
  IconCar,
  IconCheckCircle,
  IconFlag,
  IconLock,
  IconShield,
  IconX,
} from "@/components/ui/icons";

export const metadata: Metadata = buildMetadata({
  title: "Safety & Trust",
  description:
    "What ParkPlug does to keep the marketplace safe, what drivers and hosts are each responsible for, and what we do not claim to do.",
  path: "/safety",
});

export default function SafetyPage() {
  return (
    <>
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50/70 to-white">
        <Container size="default" className="py-12 lg:py-16">
          <SectionHeading
            as="h1"
            eyebrow="Safety & Trust Center"
            title="Parking involves someone's property and someone's vehicle."
            description="That deserves straight answers. Here is what ParkPlug does, what each side is responsible for, and — just as importantly — what we do not do."
          />
        </Container>
      </section>

      <Container size="default" className="py-12 lg:py-16">
        <div className="space-y-14">
          {/* ------------------------------------------------ What we do */}
          <section aria-labelledby="what-we-do">
            <h2 id="what-we-do" className="text-2xl font-extrabold tracking-tight">
              What ParkPlug does
            </h2>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2">
              {[
                {
                  icon: <IconLock />,
                  title: "Protects addresses",
                  body: "A listing's exact address is never published. Public maps show an approximate area with the point deliberately offset, and the real address is released only to a driver with a confirmed reservation.",
                },
                {
                  icon: <IconShield />,
                  title: "Keeps payments off-platform-free",
                  body: "Card details go straight to our payment provider. ParkPlug never stores your full card number, and asking anyone to pay outside ParkPlug is a violation of our rules.",
                },
                {
                  icon: <IconCheckCircle />,
                  title: "Creates a record",
                  body: "Every reservation has a reference, a confirmed time window, the vehicle details, and a message thread. If something is disputed, there is something to look at.",
                },
                {
                  icon: <IconFlag />,
                  title: "Acts on reports",
                  body: "Listings, conversations, and parking reports can all be reported. We review them and can pause a listing or close an account.",
                },
              ].map((item) => (
                <li key={item.title} className="rounded-card border border-ink-200 bg-white p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-xl text-brand-700" aria-hidden="true">
                    {item.icon}
                  </span>
                  <h3 className="mt-3.5 text-base font-bold">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{item.body}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* -------------------------------------------- What we don't do */}
          <section aria-labelledby="what-we-dont">
            <h2 id="what-we-dont" className="text-2xl font-extrabold tracking-tight">
              What ParkPlug does not do
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
              We would rather be clear about this now than have you find out at the
              wrong moment.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "We do not run background checks or criminal screening on drivers or hosts.",
                "We do not inspect, certify, or supervise any parking space.",
                "We do not provide insurance for vehicles, property, or people.",
                "We do not guarantee that a community-reported free space will still be there.",
                "We do not guarantee that a host will earn any particular amount.",
                "We do not handle emergencies, and we cannot dispatch help.",
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm leading-relaxed text-ink-700"
                >
                  <IconX className="mt-0.5 shrink-0 text-base text-danger-600" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* ------------------------------------------- Responsibilities */}
          <section aria-labelledby="responsibilities">
            <h2 id="responsibilities" className="text-2xl font-extrabold tracking-tight">
              What each side is responsible for
            </h2>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-card border-2 border-brand-200 bg-white p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <IconCar className="text-brand-600" aria-hidden="true" /> Drivers
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-ink-700">
                  <li>Park only in the space described, within the times you booked.</li>
                  <li>Bring a vehicle that fits the limits the host has set.</li>
                  <li>Never block driveways, gates, hydrants, or emergency access.</li>
                  <li>Read posted signs when using community-reported street parking.</li>
                  <li>Leave on time, and leave the space as you found it.</li>
                </ul>
                <Link
                  href="/legal/driver-standards"
                  className="mt-4 inline-block text-sm font-bold text-brand-700 underline underline-offset-2"
                >
                  Read the Driver Standards
                </Link>
              </div>

              <div className="rounded-card border-2 border-ink-200 bg-white p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold">
                  <IconShield className="text-ink-600" aria-hidden="true" /> Hosts
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-ink-700">
                  <li>Only list a space you own or have permission to offer.</li>
                  <li>Check your lease, HOA rules, and local ordinances first.</li>
                  <li>Describe the space, its size, and its access honestly.</li>
                  <li>Keep availability accurate and honour confirmed reservations.</li>
                  <li>Make sure the space is safe and does not block emergency access.</li>
                </ul>
                <Link
                  href="/legal/host-standards"
                  className="mt-4 inline-block text-sm font-bold text-brand-700 underline underline-offset-2"
                >
                  Read the Host Standards
                </Link>
              </div>
            </div>
          </section>

          {/* ------------------------------------------- Community reports */}
          <section aria-labelledby="community-safety">
            <h2 id="community-safety" className="text-2xl font-extrabold tracking-tight">
              Community reports have limits
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600">
              A community report is one person saying they saw open public parking at a
              particular moment. It is not a reservation and nobody is holding it for
              you.
            </p>
            <Alert tone="warning" className="mt-5" title="Always follow posted signs">
              A ParkPlug report does not override a restriction on the street. Time
              limits, permit zones, street cleaning, and loading restrictions all still
              apply, and we cannot help with a citation or a tow.
            </Alert>
          </section>

          {/* -------------------------------------------------- Emergency */}
          <section aria-labelledby="emergency" className="rounded-card border-2 border-danger-200 bg-danger-50 p-6">
            <h2 id="emergency" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
              <IconAlert className="text-danger-600" aria-hidden="true" />
              In an emergency
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-800">
              If anyone is in immediate danger, or a vehicle is blocking emergency
              access, contact local emergency services first. ParkPlug support is not
              an emergency service and cannot dispatch help.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-800">
              Once everyone is safe, tell us what happened so we can act on the account
              involved.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href="/support">Report a safety concern</ButtonLink>
              <ButtonLink href="/legal/prohibited-conduct" variant="secondary">
                Prohibited Conduct
              </ButtonLink>
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
