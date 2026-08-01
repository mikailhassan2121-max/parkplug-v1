import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { legalEntity, PLACEHOLDER, business } from "@/config/business";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description: "The terms that apply when you use ParkPlug as a driver, a host, or a community reporter.",
  path: "/legal/terms",
});

export default function TermsPage() {
  const entity = legalEntity();

  return (
    <LegalPage
      title="Terms of Service"
      summary={`These terms apply whenever you use ParkPlug. ParkPlug is operated by ${entity}.`}
      relatedLinks={[
        { href: "/legal/privacy", label: "Privacy Policy" },
        { href: "/legal/cancellation", label: "Cancellation & Refunds" },
        { href: "/legal/host-standards", label: "Host Standards" },
        { href: "/legal/driver-standards", label: "Driver Standards" },
      ]}
      sections={[
        {
          id: "about",
          heading: "What ParkPlug is",
          body: (
            <>
              <p>
                ParkPlug is a marketplace. We connect drivers who need parking with
                hosts who have parking to share, and we publish parking that members
                of the community report seeing on public streets.
              </p>
              <p>
                ParkPlug is not a parking operator. We do not own, control, inspect,
                or manage the spaces listed on the platform. The agreement to use a
                space is between the driver and the host.
              </p>
            </>
          ),
        },
        {
          id: "accounts",
          heading: "Your account",
          body: (
            <>
              <p>
                You must be at least 18 years old to create an account. You are
                responsible for keeping your password secure and for everything that
                happens under your account.
              </p>
              <p>
                Give us accurate information, and keep it up to date. We may suspend
                or close an account that breaks these terms or the standards linked
                from this page.
              </p>
            </>
          ),
        },
        {
          id: "drivers",
          heading: "If you are a driver",
          body: (
            <>
              <p>When you reserve a space, you agree to:</p>
              <ul>
                <li>Park only in the space described, during the times you booked.</li>
                <li>Use a vehicle that fits within the limits the host has set.</li>
                <li>Follow the host&rsquo;s posted rules and any local parking laws.</li>
                <li>Leave the space as you found it, and leave on time.</li>
              </ul>
              <p>
                A reservation is confirmed for a specific space and time window. It
                does not entitle you to any other space on the property.
              </p>
              <p>
                Read the full <Link href="/legal/driver-standards">Driver Standards</Link>.
              </p>
            </>
          ),
        },
        {
          id: "hosts",
          heading: "If you are a host",
          body: (
            <>
              <p>By listing a space, you confirm that:</p>
              <ul>
                <li>You own the space, or you have permission from the owner to list it.</li>
                <li>
                  Listing it does not break a lease, HOA rule, permit condition, or
                  local ordinance that you are aware of.
                </li>
                <li>The space is safe to use and does not block emergency access.</li>
                <li>Your description, photos, availability, and pricing are accurate.</li>
              </ul>
              <p>
                You are responsible for honouring confirmed reservations. Read the
                full <Link href="/legal/host-standards">Host Standards</Link>.
              </p>
            </>
          ),
        },
        {
          id: "community-reports",
          heading: "Community parking reports",
          body: (
            <>
              <p>
                Community reports describe parking that another user says they saw on
                a public street. They are observations, not offers, and ParkPlug does
                not verify them.
              </p>
              <p>
                A reported space may already be taken, may be restricted in ways the
                reporter did not notice, or may have been reported incorrectly. You
                are responsible for reading posted signs and complying with local
                parking laws before you park.
              </p>
              <p>
                Read the{" "}
                <Link href="/legal/community-guidelines">Community Reporting Guidelines</Link>.
              </p>
            </>
          ),
        },
        {
          id: "payments",
          heading: "Payments and fees",
          body: (
            <>
              <p>
                Drivers pay the parking price set by the host plus ParkPlug&rsquo;s
                service fee, and any tax that applies. Hosts receive the parking price
                minus ParkPlug&rsquo;s host fee.
              </p>
              <p>
                Current rates are shown on the{" "}
                <Link href="/pricing">Pricing &amp; Fees</Link> page. The full
                breakdown, including every fee, is shown before you pay.
              </p>
              <p>
                Payments are processed by our payment provider. ParkPlug does not
                store your full card details.
              </p>
            </>
          ),
        },
        {
          id: "cancellations",
          heading: "Cancellations and refunds",
          body: (
            <p>
              Cancellation terms are set per listing and shown before you book and on
              your reservation. See the{" "}
              <Link href="/legal/cancellation">Cancellation &amp; Refund Policy</Link>{" "}
              for how refunds are calculated and when they are issued.
            </p>
          ),
        },
        {
          id: "prohibited",
          heading: "What is not allowed",
          body: (
            <p>
              Certain conduct is prohibited on ParkPlug, including misrepresenting a
              space, harassing another user, and using the platform for anything
              illegal. See{" "}
              <Link href="/legal/prohibited-conduct">Prohibited Conduct</Link> for the
              full list and what happens if you break these rules.
            </p>
          ),
        },
        {
          id: "no-warranty",
          heading: "What we do not promise",
          body: (
            <>
              <p>ParkPlug does not:</p>
              <ul>
                <li>Inspect, certify, or supervise any parking space.</li>
                <li>Run background checks or criminal screening on any user.</li>
                <li>Provide insurance for vehicles, property, or people.</li>
                <li>Guarantee that a community-reported space is available.</li>
                <li>Guarantee that a host will earn any particular amount.</li>
              </ul>
              <p>
                The platform is provided as is. To the extent the law allows,{" "}
                {entity} is not liable for damage to a vehicle or property, for parking
                citations, for towing, or for disputes between a driver and a host.
              </p>
            </>
          ),
        },
        {
          id: "disputes",
          heading: "Disputes and governing law",
          body: (
            <>
              <p>
                If something goes wrong, contact{" "}
                <Link href="/support">support</Link> first — most issues are resolved
                that way.
              </p>
              <p>
                These terms are governed by the laws of{" "}
                {business.governingState ?? PLACEHOLDER.governingState}, without
                regard to its conflict-of-laws rules.
              </p>
            </>
          ),
        },
        {
          id: "changes",
          heading: "Changes to these terms",
          body: (
            <p>
              We may update these terms as ParkPlug changes. If a change is
              significant we will notify you before it takes effect. Continuing to use
              ParkPlug after a change means you accept the updated terms.
            </p>
          ),
        },
      ]}
    />
  );
}
