import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { business, legalEntity, PLACEHOLDER } from "@/config/business";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "What ParkPlugs collects, why, who it is shared with, and the choices you have.",
  path: "/legal/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary={`How ${legalEntity()} collects, uses, and protects your information when you use ParkPlugs.`}
      relatedLinks={[
        { href: "/legal/cookies", label: "Cookie Policy" },
        { href: "/legal/data-deletion", label: "Data & Account Deletion" },
        { href: "/legal/terms", label: "Terms of Service" },
      ]}
      sections={[
        {
          id: "collect",
          heading: "What we collect",
          body: (
            <>
              <p>
                <strong>Information you give us.</strong> Your name, email address,
                password, vehicle details, listing details, photos, messages, support
                requests, and anything you write in a review or a parking report.
              </p>
              <p>
                <strong>Location.</strong> If you allow it, your device location, so we
                can show parking near you. You can search by address instead and never
                share your location.
              </p>
              <p>
                <strong>Payment information.</strong> Card details go directly to our
                payment provider. ParkPlugs receives a token and the last four digits —
                never your full card number.
              </p>
              <p>
                <strong>Usage information.</strong> Device type, browser, pages viewed,
                and errors encountered, so we can keep the site working.
              </p>
            </>
          ),
        },
        {
          id: "use",
          heading: "How we use it",
          body: (
            <ul>
              <li>To show you parking near where you are going.</li>
              <li>To create, confirm, and manage reservations.</li>
              <li>To release a host&rsquo;s address to a driver once a booking is confirmed.</li>
              <li>To let a driver and a host message each other about a reservation.</li>
              <li>To process payments and pay out hosts.</li>
              <li>To send confirmations, reminders, and the notifications you have opted into.</li>
              <li>To investigate reports of misuse and keep the marketplace safe.</li>
            </ul>
          ),
        },
        {
          id: "address-privacy",
          heading: "Address privacy",
          body: (
            <>
              <p>
                A listing&rsquo;s exact address is never published. Public pages and
                maps show only an approximate area, and the point shown is deliberately
                offset from the real location.
              </p>
              <p>
                The full address and entry instructions are released to a driver only
                after their reservation is confirmed, and only for that reservation.
              </p>
              <p>
                Community parking reports are published without the reporter&rsquo;s
                name attached.
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          heading: "Who we share it with",
          body: (
            <>
              <p>
                <strong>Between users, only what is needed.</strong> A host sees the
                vehicle and plate on a reservation so they can identify the car. A
                driver sees the host&rsquo;s display name. Neither side gets the
                other&rsquo;s email address or phone number by default.
              </p>
              <p>
                <strong>Service providers.</strong> Our payment provider, map and
                geocoding providers, email delivery, and hosting infrastructure. They
                may only use your data to provide their service to us.
              </p>
              <p>
                <strong>Legal.</strong> If we are legally required to, or to protect
                someone&rsquo;s safety.
              </p>
              <p>We do not sell your personal information.</p>
            </>
          ),
        },
        {
          id: "retention",
          heading: "How long we keep it",
          body: (
            <p>
              We keep your account information while your account is open. Reservation
              and payment records are kept as long as tax and accounting rules require,
              even after an account is closed. Community parking reports expire from
              the map automatically and are not tied to your public profile.
            </p>
          ),
        },
        {
          id: "choices",
          heading: "Your choices",
          body: (
            <ul>
              <li>
                Update your profile, email, and notification preferences from{" "}
                <Link href="/dashboard/settings">account settings</Link>.
              </li>
              <li>Turn off location sharing in your browser at any time.</li>
              <li>
                Request a copy of your data, or delete your account, from{" "}
                <Link href="/legal/data-deletion">Data &amp; Account Deletion</Link>.
              </li>
            </ul>
          ),
        },
        {
          id: "security",
          heading: "How we protect it",
          body: (
            <p>
              Traffic to ParkPlugs is encrypted in transit. Passwords are stored hashed,
              never in plain text. Payment details are held by our payment provider
              rather than by us. No system is perfectly secure, so please use a unique
              password and tell us straight away if you think your account has been
              accessed by someone else.
            </p>
          ),
        },
        {
          id: "children",
          heading: "Children",
          body: (
            <p>
              ParkPlugs is not intended for anyone under 18, and we do not knowingly
              collect information from children. If you believe a child has given us
              information, contact us and we will delete it.
            </p>
          ),
        },
        {
          id: "contact",
          heading: "Contacting us about privacy",
          body: (
            <p>
              Privacy questions and requests can be sent to{" "}
              {business.privacyEmail ? (
                <a href={`mailto:${business.privacyEmail}`}>{business.privacyEmail}</a>
              ) : (
                PLACEHOLDER.privacyEmail
              )}
              , or through <Link href="/support">our support form</Link>. Our mailing
              address is {business.mailingAddress ?? PLACEHOLDER.mailingAddress}.
            </p>
          ),
        },
      ]}
    />
  );
}
