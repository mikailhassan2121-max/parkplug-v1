import Link from "next/link";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Container, SectionHeading } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchModule } from "@/components/search/search-module";
import { ParkingPreview } from "@/components/home/parking-preview";
import {
  IconAccessible,
  IconArrowRight,
  IconBolt,
  IconCalendar,
  IconCar,
  IconCheckCircle,
  IconClock,
  IconFlag,
  IconLock,
  IconMapPin,
  IconSearch,
  IconShield,
  IconStar,
  IconWallet,
} from "@/components/ui/icons";

export const metadata: Metadata = buildMetadata({
  title: "ParkPlugs · Parking made easier, one space at a time",
  description:
    "Find reservable private parking and recently reported free spaces near your destination. List your unused driveway or lot and earn when drivers reserve.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="border-b border-ink-200 bg-white">
        <Container size="wide" className="py-12 lg:py-20">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
            <div className="max-w-xl">
              <p className="text-sm font-semibold tracking-[0.02em] text-brand-700">
                Parking for drivers, hosts, and property teams
              </p>
              <h1 className="mt-3 text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.035em] text-ink-950 sm:text-5xl lg:text-[3.75rem]">
                Find parking before you arrive.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-600 sm:text-lg">
                Search reservable spaces, check sensor-confirmed availability,
                or rent out parking you are not using.
              </p>

              <div className="mt-7 lg:hidden">
                <SearchModule layout="hero" />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                  href="/live"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline"
                >
                  <IconMapPin aria-hidden="true" />
                  See live availability
                </Link>
                <Link
                  href="/report-parking"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline"
                >
                  <IconBolt aria-hidden="true" />
                  Report free parking
                </Link>
                <Link
                  href="/host/listings/new"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 underline-offset-4 hover:underline"
                >
                  <IconWallet aria-hidden="true" />
                  List your space
                </Link>
              </div>

              <div className="mt-8 hidden lg:block">
                <SearchModule layout="hero" />
              </div>
            </div>

            <div className="lg:pt-2">
              <ParkingPreview />
            </div>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------- How it works */}
      <section className="py-14 lg:py-20">
        <Container size="wide">
          <SectionHeading
            eyebrow="How ParkPlugs works"
            title="Three ways people use ParkPlugs"
            description="Whether you are looking for a space, have one to share, or spotted one on the street, it takes three steps."
            align="center"
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <StepCard
              tone="brand"
              title="For drivers"
              icon={<IconSearch />}
              steps={[
                { title: "Search your destination", body: "Enter where you are going and when you need to park." },
                { title: "Compare nearby parking", body: "See reservable spaces and community reports side by side on the map." },
                { title: "Reserve and park", body: "Book the space, then get the exact address and entry instructions." },
              ]}
              action={{ href: "/parking", label: "Find parking" }}
            />
            <StepCard
              tone="ink"
              title="For hosts"
              icon={<IconWallet />}
              steps={[
                { title: "Add your parking space", body: "Tell us where it is, what fits, and add a few photos." },
                { title: "Choose availability and pricing", body: "Set the hours that work for you and the rate you want." },
                { title: "Earn when drivers reserve", body: "Get paid for reservations that complete, and pause any time." },
              ]}
              action={{ href: "/host/listings/new", label: "List your space" }}
            />
            <StepCard
              tone="accent"
              title="For community reporters"
              icon={<IconFlag />}
              steps={[
                { title: "Spot available public parking", body: "Notice open spaces on a street you are passing." },
                { title: "Report its location and restrictions", body: "Drop a pin and note any signs or time limits." },
                { title: "Help nearby drivers find it", body: "Your report appears on the map until it expires." },
              ]}
              action={{ href: "/report-parking", label: "Report free parking" }}
            />
          </div>
        </Container>
      </section>

      {/* --------------------------------------------------- Parking options */}
      <section className="border-y border-ink-200 bg-ink-50 py-14 lg:py-20">
        <Container size="wide">
          <SectionHeading
            eyebrow="Know what you are getting"
            title="Two kinds of parking, clearly labelled"
            description="ParkPlugs never blurs the line between a space you have reserved and a space someone happened to see."
          />

          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            <div className="rounded-card border-2 border-brand-200 bg-white p-6 sm:p-7">
              <Badge tone="brand" icon={<IconCheckCircle />}>Reservable private parking</Badge>
              <h3 className="mt-4 text-xl font-bold tracking-tight">Held for you, at a known price</h3>
              <ul className="mt-4 space-y-3">
                {[
                  { icon: <IconLock />, text: "Reserved specifically for you for the times you book." },
                  { icon: <IconMapPin />, text: "Host-provided entry and parking instructions." },
                  { icon: <IconWallet />, text: "Price and schedule known before you pay." },
                  { icon: <IconShield />, text: "Exact location shared once your reservation is confirmed." },
                ].map((item) => (
                  <li key={item.text} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                    <span className="mt-0.5 shrink-0 text-base text-brand-600" aria-hidden="true">{item.icon}</span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-card border-2 border-accent-200 bg-white p-6 sm:p-7">
              <Badge tone="accent" icon={<IconBolt />}>Community-reported free parking</Badge>
              <h3 className="mt-4 text-xl font-bold tracking-tight">A recent sighting, not a guarantee</h3>
              <ul className="mt-4 space-y-3">
                {[
                  { icon: <IconClock />, text: "Recently observed by another ParkPlugs user." },
                  { icon: <IconFlag />, text: "Not reserved and not guaranteed to still be there." },
                  { icon: <IconClock />, text: "Reports expire quickly, because street parking changes fast." },
                  { icon: <IconAccessible />, text: "You must check posted signs and follow local parking rules." },
                ].map((item) => (
                  <li key={item.text} className="flex gap-3 text-sm leading-relaxed text-ink-700">
                    <span className="mt-0.5 shrink-0 text-base text-accent-600" aria-hidden="true">{item.icon}</span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* -------------------------------------------------------- Host promo */}
      <section className="py-14 lg:py-20">
        <Container size="wide">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading
                eyebrow="For hosts"
                title="Put unused parking to work."
                description="If you have a driveway, a garage, or a lot that sits empty part of the week, you can offer it to drivers looking for somewhere to park."
              />
              <ul className="mt-7 grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
                {[
                  "Set your own schedule",
                  "Choose your price",
                  "Pause any time",
                  "Control which vehicle sizes fit",
                  "See upcoming reservations",
                  "Help reduce neighborhood parking pressure",
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm font-medium text-ink-700">
                    <IconCheckCircle className="mt-0.5 shrink-0 text-base text-brand-600" aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/host/listings/new" size="lg" trailingIcon={<IconArrowRight />}>
                  List Your Space
                </ButtonLink>
                <ButtonLink href="/hosting-guide" variant="secondary" size="lg">
                  Read the hosting guide
                </ButtonLink>
              </div>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: <IconCar />, title: "Driveways", body: "One or two spaces beside your home." },
                { icon: <IconCalendar />, title: "Business lots", body: "Spaces that sit empty after hours." },
                { icon: <IconMapPin />, title: "Places of worship", body: "Lots used only on certain days." },
                { icon: <IconWallet />, title: "Apartment spots", body: "An assigned space you are not using." },
              ].map((item) => (
                <li key={item.title} className="rounded-card border border-ink-200 bg-white p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-xl text-brand-700" aria-hidden="true">
                    {item.icon}
                  </span>
                  <h3 className="mt-3.5 text-base font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------- Trust */}
      <section className="border-y border-ink-200 bg-ink-50 py-14 lg:py-20">
        <Container size="wide">
          <SectionHeading
            eyebrow="Trust and safety"
            title="How ParkPlugs looks after both sides"
            description="Parking involves someone's property and someone's vehicle. Here is what we actually do about that."
            align="center"
          />
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: <IconLock />, title: "Secure payments", body: "Card details are handled by our payment provider and never stored on ParkPlugs." },
              { icon: <IconShield />, title: "Address privacy", body: "A listing's exact address stays hidden until a reservation is confirmed." },
              { icon: <IconCheckCircle />, title: "Verified reservations", body: "Every booking has a reference, a confirmed time window, and a record both sides can see." },
              { icon: <IconClock />, title: "Timestamped reports", body: "Community reports always show when they were observed and when they expire." },
              { icon: <IconFlag />, title: "Clear parking rules", body: "Hosts state the rules up front, and you confirm you have read them before booking." },
              { icon: <IconStar />, title: "Reviews after real stays", body: "Only drivers and hosts who completed a reservation together can review each other." },
            ].map((item) => (
              <li key={item.title} className="rounded-card border border-ink-200 bg-white p-5 sm:p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-xl text-brand-700" aria-hidden="true">
                  {item.icon}
                </span>
                <h3 className="mt-3.5 text-base font-bold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{item.body}</p>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-ink-600">
            ParkPlugs does not run background checks, inspect spaces, or provide
            insurance. Read the{" "}
            <Link href="/safety" className="font-semibold text-brand-700 underline underline-offset-2">
              Safety &amp; Trust Center
            </Link>{" "}
            for what each side is responsible for.
          </p>
        </Container>
      </section>

      {/* ------------------------------------------------------ Social proof */}
      <section className="py-14 lg:py-20">
        <Container size="narrow">
          <div className="rounded-card border border-dashed border-ink-300 bg-ink-50/60 px-6 py-10 text-center sm:px-10">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl text-brand-600 shadow-e1" aria-hidden="true">
              <IconStar />
            </span>
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight">
              Be among the first drivers and hosts shaping ParkPlugs in your community.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-600">
              Reviews appear here once drivers and hosts have completed
              reservations together. We do not publish reviews from anyone who
              has not actually used a space.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/parking" size="lg">Find Parking</ButtonLink>
              <ButtonLink href="/host/listings/new" variant="secondary" size="lg">
                List Your Space
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* --------------------------------------------------------- Final CTA */}
      <section className="border-t border-ink-200 bg-brand-950 py-14 text-white lg:py-20">
        <Container size="wide">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Ready to park, or ready to share a space?
              </h2>
              <p className="mt-3 text-base leading-relaxed text-brand-100">
                Join the ParkPlugs community and help make local parking easier.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/parking" size="lg" className="bg-white text-brand-900 hover:bg-brand-50">
                Find Parking
              </ButtonLink>
              <ButtonLink
                href="/host/listings/new"
                size="lg"
                className="border border-brand-400 bg-transparent text-white hover:bg-brand-900"
              >
                List Your Space
              </ButtonLink>
              <Link
                href="/report-parking"
                className="text-sm font-bold text-brand-200 underline-offset-4 hover:text-white hover:underline sm:ml-2"
              >
                Report Free Parking
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function StepCard({
  title,
  icon,
  steps,
  action,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  steps: Array<{ title: string; body: string }>;
  action: { href: string; label: string };
  tone: "brand" | "accent" | "ink";
}) {
  const tones = {
    brand: { chip: "bg-brand-50 text-brand-700", num: "bg-brand-600" },
    accent: { chip: "bg-accent-50 text-accent-700", num: "bg-accent-500" },
    ink: { chip: "bg-ink-100 text-ink-700", num: "bg-ink-700" },
  } as const;

  return (
    <div className="flex flex-col rounded-card border border-ink-200 bg-white p-6">
      <span className={`grid h-12 w-12 place-items-center rounded-xl text-xl ${tones[tone].chip}`} aria-hidden="true">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-bold tracking-tight">{title}</h3>
      <ol className="mt-4 flex-1 space-y-4">
        {steps.map((step, i) => (
          <li key={step.title} className="flex gap-3.5">
            <span
              aria-hidden="true"
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${tones[tone].num}`}
            >
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-ink-900">{step.title}</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-ink-600">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
      <ButtonLink href={action.href} variant="secondary" className="mt-6 w-full">
        {action.label}
      </ButtonLink>
    </div>
  );
}
