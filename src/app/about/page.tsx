import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Container, SectionHeading } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { IconBuilding, IconCar, IconHome, IconMapPin } from "@/components/ui/icons";

export const metadata: Metadata = buildMetadata({
  title: "About ParkPlug",
  description:
    "Why parking is hard, how unused private spaces and community reports help, and what ParkPlug is trying to do about it.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-ink-200 bg-gradient-to-b from-brand-50/70 to-white">
        <Container size="default" className="py-12 lg:py-16">
          <SectionHeading
            as="h1"
            eyebrow="About"
            title="Parking is a local problem with a local solution."
            description="Most neighbourhoods do not need more parking. They need better use of the parking that already exists."
          />
        </Container>
      </section>

      <Container size="default" className="py-12 lg:py-16">
        <div className="max-w-2xl space-y-12">
          <section aria-labelledby="problem">
            <h2 id="problem" className="text-2xl font-extrabold tracking-tight">
              The problem
            </h2>
            <div className="mt-4 space-y-4 text-[0.9375rem] leading-relaxed text-ink-700">
              <p>
                Circling for a space is one of those small frustrations that adds up. It
                makes you late. It burns fuel. It puts more cars on residential streets
                than those streets were designed for, right at the times people most
                want quiet.
              </p>
              <p>
                Meanwhile, a lot of parking sits empty. A driveway is unused all day
                while its owner is at work. A church lot is full on Sunday and empty the
                rest of the week. An office lot empties out at six. The parking exists —
                it is just not available to the people who need it.
              </p>
            </div>
          </section>

          <section aria-labelledby="private-spaces">
            <h2 id="private-spaces" className="text-2xl font-extrabold tracking-tight">
              Why unused private spaces matter
            </h2>
            <div className="mt-4 space-y-4 text-[0.9375rem] leading-relaxed text-ink-700">
              <p>
                A single driveway offered a few hours a week is not going to fix a city.
                But a few hundred of them, in the blocks around a station or a high
                street, change what parking feels like in that area.
              </p>
              <p>
                For the person offering the space, it is straightforward: they set the
                hours, they set the price, and they can stop at any time. For the driver,
                it turns an uncertain search into a space that is genuinely held for
                them.
              </p>
            </div>
          </section>

          <section aria-labelledby="community">
            <h2 id="community" className="text-2xl font-extrabold tracking-tight">
              Why community reports matter
            </h2>
            <div className="mt-4 space-y-4 text-[0.9375rem] leading-relaxed text-ink-700">
              <p>
                Not all parking should cost money. Plenty of free public parking exists;
                the problem is that you only find out about it by driving past.
              </p>
              <p>
                When someone notices open spaces and takes ten seconds to report where
                they are and what the signs say, the next driver does not have to circle
                the block to find out. Reports expire quickly, because street parking
                changes fast — and we never present one as a guarantee.
              </p>
            </div>
          </section>

          <section aria-labelledby="mission" className="rounded-card border-2 border-brand-200 bg-brand-50 p-6 sm:p-8">
            <h2 id="mission" className="text-2xl font-extrabold tracking-tight">
              What we are trying to do
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-800">
              Make the parking that already exists in a neighbourhood easier to find and
              easier to share — clearly enough that people trust it with their plans,
              their property, and their vehicles.
            </p>
          </section>

          <section aria-labelledby="who-benefits">
            <h2 id="who-benefits" className="text-2xl font-extrabold tracking-tight">
              Who this is for
            </h2>
            <ul className="mt-6 space-y-4">
              {[
                {
                  icon: <IconCar />,
                  title: "Drivers",
                  body: "Know where you are parking before you set off, at a price you agreed in advance — or find free street parking someone just confirmed was open.",
                },
                {
                  icon: <IconHome />,
                  title: "Hosts",
                  body: "Turn a space that sits empty into something useful, on a schedule you control, without committing to anything long-term.",
                },
                {
                  icon: <IconBuilding />,
                  title: "Businesses and organisations",
                  body: "Lots that are busy at predictable times can be opened up the rest of the week, bringing people to the area rather than past it.",
                },
                {
                  icon: <IconMapPin />,
                  title: "Neighbourhoods",
                  body: "Fewer cars circling means less traffic on residential streets at exactly the hours people notice it most.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-4 rounded-card border border-ink-200 bg-white p-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-xl text-brand-700" aria-hidden="true">
                    {item.icon}
                  </span>
                  <div>
                    <h3 className="text-base font-bold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-600">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="early" className="rounded-card border border-dashed border-ink-300 bg-ink-50 p-6">
            <h2 id="early" className="text-xl font-bold tracking-tight">
              We are early
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              ParkPlug grows one neighbourhood at a time, and it only works where enough
              people take part. If your area is quiet right now, the most useful things
              you can do are list a space or report the free parking you already know
              about.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/host/listings/new">List Your Space</ButtonLink>
              <ButtonLink href="/report-parking" variant="secondary">
                Report Free Parking
              </ButtonLink>
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
