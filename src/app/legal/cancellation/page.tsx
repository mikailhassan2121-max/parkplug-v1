import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = buildMetadata({
  title: "Cancellation & Refund Policy",
  description: "When you can cancel a ParkPlug reservation, what you get back, and how refunds are issued.",
  path: "/legal/cancellation",
});

export default function CancellationPage() {
  return (
    <LegalPage
      title="Cancellation & Refund Policy"
      summary="How cancellations work for drivers and hosts, and how refunds are calculated."
      relatedLinks={[
        { href: "/legal/terms", label: "Terms of Service" },
        { href: "/pricing", label: "Pricing & Fees" },
        { href: "/support", label: "Contact Support" },
      ]}
      sections={[
        {
          id: "where",
          heading: "Where to find your terms",
          body: (
            <p>
              Each listing carries its own cancellation terms. They are shown on the
              listing page, again before you pay, and on your reservation afterwards.
              The terms that apply are the ones that were in effect when you booked —
              a host changing them later does not affect a reservation you already
              hold.
            </p>
          ),
        },
        {
          id: "driver-cancels",
          heading: "If a driver cancels",
          body: (
            <>
              <p>
                Cancel from your{" "}
                <Link href="/dashboard/reservations">reservations page</Link>. What you
                get back depends on how far ahead of your arrival time you cancel, as
                stated on the reservation.
              </p>
              <ul>
                <li>
                  Cancel far enough in advance and the parking cost is refunded in
                  full.
                </li>
                <li>
                  Cancel close to your arrival time and some or all of the parking cost
                  may be retained, because the host has held the space and turned other
                  drivers away.
                </li>
                <li>
                  Not arriving without cancelling is treated as a late cancellation.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "host-cancels",
          heading: "If a host cancels",
          body: (
            <>
              <p>
                If a host cancels a confirmed reservation, the driver is refunded in
                full, including the service fee. We will also help the driver find
                another space nearby where we can.
              </p>
              <p>
                Hosts should only cancel when they genuinely cannot honour a booking.
                Repeated cancellations affect a listing&rsquo;s standing on ParkPlug
                and may lead to it being paused or removed.
              </p>
            </>
          ),
        },
        {
          id: "fees",
          heading: "What happens to fees",
          body: (
            <p>
              On a full refund, ParkPlug&rsquo;s service fee is returned as well. On a
              partial refund, the service fee is refunded in proportion to the parking
              cost returned. Taxes are refunded with the amount they were charged on.
              Exact rates are on the <Link href="/pricing">Pricing &amp; Fees</Link>{" "}
              page.
            </p>
          ),
        },
        {
          id: "timing",
          heading: "When refunds arrive",
          body: (
            <p>
              Refunds are issued to the original payment method as soon as a
              cancellation is processed. How quickly it appears depends on your bank or
              card issuer, typically within a few business days. You will see the
              refund on your reservation and in your email receipt as soon as we have
              issued it.
            </p>
          ),
        },
        {
          id: "problems",
          heading: "If something goes wrong on arrival",
          body: (
            <>
              <p>
                If the space is blocked, unusable, or materially different from the
                listing, do not force the situation. Message your host, then{" "}
                <Link href="/support">contact support</Link> with your reservation
                reference and, where it is safe to do so, a photo.
              </p>
              <p>
                Reservations that could not be used because of a problem with the space
                are refunded in full once we have reviewed them.
              </p>
            </>
          ),
        },
        {
          id: "community",
          heading: "Community-reported parking",
          body: (
            <p>
              Community reports are free and are not reservations, so there is nothing
              to cancel or refund. A reported space may already be taken by the time
              you arrive — availability is never guaranteed.
            </p>
          ),
        },
      ]}
    />
  );
}
