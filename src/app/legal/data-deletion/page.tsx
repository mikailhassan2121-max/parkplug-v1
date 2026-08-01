import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { business, PLACEHOLDER } from "@/config/business";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = buildMetadata({
  title: "Data & Account Deletion",
  description: "How to get a copy of your ParkPlug data, and how to delete your account.",
  path: "/legal/data-deletion",
});

export default function DataDeletionPage() {
  return (
    <LegalPage
      title="Data & Account Deletion"
      summary="How to get a copy of everything we hold about you, and how to close your account for good."
      relatedLinks={[
        { href: "/legal/privacy", label: "Privacy Policy" },
        { href: "/dashboard/settings", label: "Account Settings" },
      ]}
      sections={[
        {
          id: "copy",
          heading: "Getting a copy of your data",
          body: (
            <p>
              You can request an export of your profile, vehicles, reservations,
              listings, reviews, and parking reports. Ask through{" "}
              <Link href="/support">support</Link>
              {business.privacyEmail ? (
                <>
                  {" "}
                  or email{" "}
                  <a href={`mailto:${business.privacyEmail}`}>{business.privacyEmail}</a>
                </>
              ) : (
                <> or email {PLACEHOLDER.privacyEmail}</>
              )}
              . We will confirm your identity before sending anything.
            </p>
          ),
        },
        {
          id: "before",
          heading: "Before you delete your account",
          body: (
            <>
              <p>Deleting is permanent. Please first:</p>
              <ul>
                <li>Cancel or complete any upcoming reservations.</li>
                <li>
                  Pause or archive any active listings, so nobody books a space you can
                  no longer host.
                </li>
                <li>Download any receipts you want to keep.</li>
                <li>Make sure outstanding payouts have been received.</li>
              </ul>
            </>
          ),
        },
        {
          id: "how",
          heading: "How to delete your account",
          body: (
            <p>
              Go to <Link href="/dashboard/settings">account settings</Link> and choose{" "}
              <strong>Delete my account</strong>. You will be asked to confirm. If you
              cannot sign in, contact <Link href="/support">support</Link> and we will
              verify you another way.
            </p>
          ),
        },
        {
          id: "what-happens",
          heading: "What is deleted",
          body: (
            <>
              <p>Removed straight away:</p>
              <ul>
                <li>Your profile, name, and email address.</li>
                <li>Your saved vehicles and saved spaces.</li>
                <li>Your listings and their photos.</li>
                <li>Your notification preferences and session data.</li>
              </ul>
            </>
          ),
        },
        {
          id: "what-remains",
          heading: "What we have to keep",
          body: (
            <>
              <p>
                Some records survive deletion because we are legally required to keep
                them, or because removing them would rewrite someone else&rsquo;s
                history:
              </p>
              <ul>
                <li>
                  Reservation and payment records, for tax and accounting periods
                  required by law.
                </li>
                <li>
                  Reviews you left on a space, which stay published but are detached
                  from your name.
                </li>
                <li>
                  Community parking reports, which are anonymous already and expire on
                  their own.
                </li>
                <li>
                  Records connected to a safety or fraud investigation, for as long as
                  that is open.
                </li>
              </ul>
            </>
          ),
        },
        {
          id: "timing",
          heading: "Timing",
          body: (
            <p>
              Your account is closed and access ends immediately. Backups are cycled out
              on a rolling basis, so residual copies are removed within a further 30
              days. Deletion cannot be undone — you would need to create a new account
              to use ParkPlug again.
            </p>
          ),
        },
      ]}
    />
  );
}
