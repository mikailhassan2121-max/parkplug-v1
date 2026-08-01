import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Container, SectionHeading } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Accordion } from "@/components/ui/menu";
import {
  IconBolt,
  IconCheckCircle,
  IconFlag,
  IconLock,
  IconSearch,
  IconWallet,
} from "@/components/ui/icons";

export const metadata: Metadata = buildMetadata({
  title: "How It Works",
  description:
    "Step by step for drivers reserving parking, hosts listing a space, and community members reporting free public parking.",
  path: "/how-it-works",
});

const AUDIENCES = [
  {
    id: "drivers",
    label: "Drivers",
    icon: <IconSearch />,
    intro: "Find a space near where you are going, know the price before you book, and get the exact address once it is confirmed.",
    steps: [
      {
        title: "Search your destination",
        body: "Enter the address or place you are heading to, plus when you need to arrive and leave. You can also use your current location.",
      },
      {
        title: "Compare what is nearby",
        body: "Reservable private spaces and community-reported free parking appear side by side on the map and in the list, always clearly labelled so you know which is which.",
      },
      {
        title: "Check the details",
        body: "Open a space to see photos, what size vehicle fits, amenities, the host's rules, and the full price including every fee.",
      },
      {
        title: "Reserve and pay",
        body: "Confirm your times, pick your vehicle, read the rules, and pay. Nothing is charged until you confirm on the final step.",
      },
      {
        title: "Park",
        body: "Your reservation page has the exact address, entry instructions, and directions. Arrive and leave within your booked window.",
      },
    ],
    safety: "Community-reported spaces are not reserved for you. Read the posted signs before you leave your car — a report never overrides a restriction.",
    faqs: [
      {
        q: "When am I charged?",
        a: "When you confirm your reservation on the final step. The full breakdown, including the service fee and any tax, is shown from the first step of booking.",
      },
      {
        q: "Why can I not see the exact address before booking?",
        a: "Most spaces are attached to someone's home. Publishing exact addresses would expose where hosts live, so the address and entry instructions are released once your reservation is confirmed.",
      },
      {
        q: "What if the space is blocked when I arrive?",
        a: "Message your host first, since it is often a misunderstanding about which space to use. If it cannot be resolved, contact support with your reservation reference — reservations that could not be used are refunded in full.",
      },
      {
        q: "Can I extend my reservation?",
        a: "Extend before your window ends if the space is still free. Do not overstay — another driver may be booked straight after you.",
      },
    ],
    cta: { href: "/search", label: "Find Parking" },
  },
  {
    id: "hosts",
    label: "Hosts",
    icon: <IconWallet />,
    intro: "Offer a driveway, garage, or lot on your own schedule, at your own price, and pause whenever you need it back.",
    steps: [
      {
        title: "Check you are allowed to list it",
        body: "Look at your lease, HOA rules, or any permit conditions first. ParkPlug does not check these for you.",
      },
      {
        title: "Add your space",
        body: "Enter the address, choose the parking type, describe what fits, and add photos of the space, the entrance, and the approach from the street.",
      },
      {
        title: "Set availability and price",
        body: "Choose the hours for each day, minimum and maximum reservation lengths, and how much notice you need. Set your hourly rate and an optional daily cap.",
      },
      {
        title: "Write your instructions",
        body: "Explain how to enter, exactly where to park, and how to leave. These stay private and are shared only with drivers who have booked.",
      },
      {
        title: "Submit and get paid",
        body: "ParkPlug confirms the listing meets marketplace requirements, then it goes live. Complete payout setup with our payment provider before your first reservation.",
      },
    ],
    safety: "Your exact address is never published. Public maps show an approximate area with the point deliberately offset from your property.",
    faqs: [
      {
        q: "How much will I earn?",
        a: "That depends on demand, your availability, your pricing, and how many reservations complete. We show an estimate based on your rate while you set it, but we do not promise an amount.",
      },
      {
        q: "What if I need my space back?",
        a: "Block the dates from your calendar, or pause the listing entirely. Blocking stops new bookings but does not cancel reservations that are already confirmed.",
      },
      {
        q: "Who sees my address?",
        a: "Only a driver with a confirmed reservation, and only for the duration of that reservation. It never appears on a public page, in search results, or in the page source.",
      },
      {
        q: "Am I insured?",
        a: "ParkPlug does not provide insurance. Check whether your existing home or business policy covers letting someone park on your property.",
      },
    ],
    cta: { href: "/host/listings/new", label: "List Your Space" },
  },
  {
    id: "reporters",
    label: "Community reporters",
    icon: <IconFlag />,
    intro: "Spotted open public parking? Ten seconds of reporting saves the next driver from circling the block.",
    steps: [
      {
        title: "Stop before you report",
        body: "Never use ParkPlug while driving. Pull over first, or ask a passenger to report for you.",
      },
      {
        title: "Set the location",
        body: "Use your current location if you are there, or search the street. Fine-tune the pin by moving the map.",
      },
      {
        title: "Say what you saw",
        body: "How many spaces, when you saw them, which side of the street, and how confident you are. Honest confidence matters — it decides how long the report stays up.",
      },
      {
        title: "Record the restrictions",
        body: "Time limits, permit zones, street cleaning, loading restrictions. This is the most valuable part of a report. Choose 'Restrictions unknown' rather than guessing.",
      },
      {
        title: "Submit",
        body: "Your report appears on the map right away and expires on its own. Come back to confirm it is still there, or mark it taken.",
      },
    ],
    safety: "Reports are public. Never include license plates, faces, house numbers, or anything identifying a specific home.",
    faqs: [
      {
        q: "How long does a report last?",
        a: "Between about one and four hours depending on the confidence you set, because street parking changes quickly. Other drivers confirming a report extends it.",
      },
      {
        q: "Do I get anything for reporting?",
        a: "Reporting is voluntary and unpaid. It exists because the map is only useful if people keep it current.",
      },
      {
        q: "What if I report something wrong?",
        a: "Mark it taken or report it as inaccurate and it will be removed. Deliberately filing false reports can lead to your account being closed.",
      },
    ],
    cta: { href: "/report-parking", label: "Report Free Parking" },
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50/70 to-white">
        <Container size="default" className="py-12 lg:py-16">
          <SectionHeading
            as="h1"
            eyebrow="How it works"
            title="Three ways to use ParkPlug"
            description="Whether you need somewhere to park, have a space to share, or just noticed an open street, here is exactly what happens."
            align="center"
          />
          <nav aria-label="Jump to a section" className="mt-8 flex flex-wrap justify-center gap-2.5">
            {AUDIENCES.map((audience) => (
              <a
                key={audience.id}
                href={`#${audience.id}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink-300 bg-white px-4 text-sm font-bold text-ink-800 transition-colors hover:border-brand-400 hover:bg-brand-50"
              >
                <span className="text-brand-700" aria-hidden="true">{audience.icon}</span>
                {audience.label}
              </a>
            ))}
          </nav>
        </Container>
      </section>

      <Container size="default" className="py-12 lg:py-16">
        <div className="space-y-16 lg:space-y-24">
          {AUDIENCES.map((audience) => (
            <section key={audience.id} id={audience.id} aria-labelledby={`${audience.id}-heading`}>
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-xl text-brand-700" aria-hidden="true">
                  {audience.icon}
                </span>
                <h2 id={`${audience.id}-heading`} className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {audience.label}
                </h2>
              </div>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-600">
                {audience.intro}
              </p>

              <ol className="mt-8 space-y-5">
                {audience.steps.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white"
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 pt-1">
                      <h3 className="text-base font-bold text-ink-900">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-600">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <Alert
                tone={audience.id === "reporters" ? "warning" : "info"}
                className="mt-8"
                icon={audience.id === "hosts" ? <IconLock /> : audience.id === "drivers" ? <IconBolt /> : undefined}
              >
                {audience.safety}
              </Alert>

              <h3 className="mt-10 text-lg font-bold tracking-tight">Common questions</h3>
              <Accordion
                className="mt-4"
                items={audience.faqs.map((faq, i) => ({
                  id: `${audience.id}-faq-${i}`,
                  question: faq.q,
                  answer: <p>{faq.a}</p>,
                }))}
              />

              <div className="mt-8">
                <ButtonLink href={audience.cta.href} size="lg" leadingIcon={<IconCheckCircle />}>
                  {audience.cta.label}
                </ButtonLink>
              </div>
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
