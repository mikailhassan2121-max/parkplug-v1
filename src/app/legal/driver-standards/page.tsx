import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = buildMetadata({
  title: "Driver Standards",
  description: "What ParkPlug expects from drivers who reserve a parking space.",
  path: "/legal/driver-standards",
});

export default function DriverStandardsPage() {
  return (
    <LegalPage
      title="Driver Standards"
      summary="Hosts are letting you onto their property. Here is what they can expect in return."
      relatedLinks={[
        { href: "/legal/host-standards", label: "Host Standards" },
        { href: "/legal/cancellation", label: "Cancellation & Refunds" },
        { href: "/safety", label: "Safety & Trust" },
      ]}
      sections={[
        {
          id: "book-accurately",
          heading: "Book what you actually need",
          body: (
            <ul>
              <li>Reserve the real times you will arrive and leave.</li>
              <li>
                Book the vehicle you are actually bringing. If it changes, update the
                reservation.
              </li>
              <li>Do not book a space that is too small for your vehicle.</li>
              <li>One reservation covers one vehicle in one space.</li>
            </ul>
          ),
        },
        {
          id: "on-arrival",
          heading: "On arrival",
          body: (
            <ul>
              <li>Park only in the space your host described.</li>
              <li>Do not block driveways, garage doors, gates, or a neighbour&rsquo;s access.</li>
              <li>Follow any access or gate instructions exactly.</li>
              <li>Keep noise down, especially early and late, on residential property.</li>
            </ul>
          ),
        },
        {
          id: "leaving",
          heading: "Leaving on time",
          body: (
            <p>
              Leave by your departure time. Another driver may be booked immediately
              after you, and an overstay can leave them with nowhere to park. If you
              need longer, extend your reservation before your window ends rather than
              staying on and settling up later.
            </p>
          ),
        },
        {
          id: "care",
          heading: "Look after the space",
          body: (
            <p>
              Leave it as you found it. Take your litter, do not carry out repairs or
              maintenance on the property, and do not use the space for storage. Tell
              your host straight away if something is damaged, whether or not you
              caused it.
            </p>
          ),
        },
        {
          id: "community-reports",
          heading: "Using community-reported parking",
          body: (
            <p>
              Reported spaces are public street parking someone saw recently. They are
              not reserved for you and are not guaranteed. Read the signs on the block
              before you leave your car — a report does not override a posted
              restriction, and ParkPlug cannot help with a citation.
            </p>
          ),
        },
        {
          id: "communication",
          heading: "Communication and reviews",
          body: (
            <p>
              Keep messages on ParkPlug and keep them civil. Reviews should describe
              your actual experience of the space. Do not use a review to pressure a
              host over a refund — <Link href="/support">contact support</Link> for
              that instead.
            </p>
          ),
        },
        {
          id: "enforcement",
          heading: "If standards are not met",
          body: (
            <p>
              Repeated overstays, damage, or abusive behaviour can lead to your account
              being suspended or closed. You can appeal a decision through{" "}
              <Link href="/support">support</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
