import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = buildMetadata({
  title: "Host Standards",
  description: "What ParkPlugs expects from hosts who list a parking space.",
  path: "/legal/host-standards",
});

export default function HostStandardsPage() {
  return (
    <LegalPage
      title="Host Standards"
      summary="What drivers can expect from a ParkPlugs host, and what you are agreeing to when you list a space."
      relatedLinks={[
        { href: "/legal/driver-standards", label: "Driver Standards" },
        { href: "/safety", label: "Safety & Trust" },
        { href: "/hosting-guide", label: "Hosting Guide" },
      ]}
      sections={[
        {
          id: "permission",
          heading: "You must be allowed to list the space",
          body: (
            <>
              <p>
                Only list parking you own or have explicit permission to offer. That
                includes checking your lease, HOA rules, condo bylaws, business permit
                conditions, and any local ordinance that restricts commercial use of a
                residential property.
              </p>
              <p>
                ParkPlugs does not verify ownership or check local rules on your behalf.
                Confirming that you may list a space is your responsibility.
              </p>
            </>
          ),
        },
        {
          id: "accuracy",
          heading: "Describe the space honestly",
          body: (
            <ul>
              <li>Photos must show the actual space, taken recently.</li>
              <li>
                Say what really fits. If a large SUV cannot get in, do not list it as
                fitting one.
              </li>
              <li>State height clearance for garages and covered spaces.</li>
              <li>Only claim an amenity the space really has.</li>
              <li>Keep availability current, and block dates you cannot host.</li>
            </ul>
          ),
        },
        {
          id: "safety",
          heading: "Keep the space safe and legal",
          body: (
            <>
              <p>Your space must:</p>
              <ul>
                <li>Be reachable without a driver having to trespass or reverse blind onto a busy road.</li>
                <li>Be free of hazards a driver would not expect.</li>
                <li>Not block a fire hydrant, emergency access route, or public right of way.</li>
                <li>Not block a neighbour&rsquo;s access.</li>
              </ul>
            </>
          ),
        },
        {
          id: "reservations",
          heading: "Honour your reservations",
          body: (
            <>
              <p>
                A confirmed reservation is a commitment. The space must be free and
                usable for the whole window the driver booked.
              </p>
              <p>
                If you truly cannot host, cancel as early as you can so the driver has
                time to find somewhere else. Repeated late cancellations may lead to a
                listing being paused or removed.
              </p>
            </>
          ),
        },
        {
          id: "communication",
          heading: "Communicate through ParkPlugs",
          body: (
            <p>
              Keep conversations on the platform so there is a record if something goes
              wrong. Do not ask a driver to pay outside ParkPlugs — off-platform
              payments have no protection, no receipt, and no refund path.
            </p>
          ),
        },
        {
          id: "privacy",
          heading: "Respect driver privacy",
          body: (
            <p>
              You receive a driver&rsquo;s vehicle and plate so you can identify the
              car on arrival. Do not share those details with anyone else, publish them,
              or use them for anything other than the reservation.
            </p>
          ),
        },
        {
          id: "enforcement",
          heading: "If standards are not met",
          body: (
            <p>
              Depending on what happened, we may ask you to update a listing, pause it,
              remove it, or close your account. Serious cases — such as listing a space
              you have no right to offer — may be reported to the relevant authority.
              You can appeal any decision through{" "}
              <Link href="/support">support</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
