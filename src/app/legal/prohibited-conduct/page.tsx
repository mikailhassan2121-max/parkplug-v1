import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = buildMetadata({
  title: "Prohibited Conduct",
  description: "Behaviour that is not allowed on ParkPlug, and what happens if it occurs.",
  path: "/legal/prohibited-conduct",
});

export default function ProhibitedConductPage() {
  return (
    <LegalPage
      title="Prohibited Conduct"
      summary="ParkPlug only works if people can trust it. This is what is not allowed."
      relatedLinks={[
        { href: "/legal/terms", label: "Terms of Service" },
        { href: "/legal/host-standards", label: "Host Standards" },
        { href: "/legal/driver-standards", label: "Driver Standards" },
      ]}
      sections={[
        {
          id: "misrepresentation",
          heading: "Misrepresenting a space or yourself",
          body: (
            <ul>
              <li>Listing a space you do not own and have no permission to offer.</li>
              <li>Using photos of a different space, or photos that hide a serious problem.</li>
              <li>Overstating what fits, or claiming amenities that do not exist.</li>
              <li>Creating an account under someone else&rsquo;s identity.</li>
            </ul>
          ),
        },
        {
          id: "off-platform",
          heading: "Taking payment off the platform",
          body: (
            <p>
              Asking a driver to pay in cash or by transfer outside ParkPlug removes
              every protection either side has — no record, no receipt, no refund, no
              support. It is not allowed in either direction.
            </p>
          ),
        },
        {
          id: "harassment",
          heading: "Harassment and abuse",
          body: (
            <ul>
              <li>Threatening, intimidating, or abusing another user.</li>
              <li>Discriminatory language or refusing someone on a protected characteristic.</li>
              <li>Contacting someone outside ParkPlug after being asked not to.</li>
              <li>Using another person&rsquo;s vehicle or contact details for anything beyond a reservation.</li>
            </ul>
          ),
        },
        {
          id: "false-reports",
          heading: "False or manipulative reports and reviews",
          body: (
            <ul>
              <li>Filing parking reports for spaces that do not exist or are private.</li>
              <li>Reviewing a space you never parked at.</li>
              <li>Using a review to threaten a host into a refund.</li>
              <li>Creating additional accounts to influence ratings.</li>
            </ul>
          ),
        },
        {
          id: "unsafe",
          heading: "Unsafe or illegal use",
          body: (
            <ul>
              <li>Blocking hydrants, emergency routes, or public rights of way.</li>
              <li>Using a space for anything other than parking a vehicle.</li>
              <li>Storing hazardous materials, or abandoning a vehicle.</li>
              <li>Any use of ParkPlug in connection with unlawful activity.</li>
            </ul>
          ),
        },
        {
          id: "platform-abuse",
          heading: "Abusing the platform itself",
          body: (
            <ul>
              <li>Scraping listings or harvesting user information.</li>
              <li>Attempting to bypass address privacy protections.</li>
              <li>Interfering with the service, or probing it without authorisation.</li>
            </ul>
          ),
        },
        {
          id: "consequences",
          heading: "What happens if this occurs",
          body: (
            <>
              <p>
                Depending on the severity we may remove content, cancel a reservation,
                pause or remove a listing, restrict features, or close an account
                permanently. Where money is involved we will act to make the affected
                party whole where we can.
              </p>
              <p>
                Report anything you see through{" "}
                <Link href="/support">support</Link>, using the report action on a
                listing, or from within a conversation. If someone is in immediate
                danger, contact local emergency services first.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
