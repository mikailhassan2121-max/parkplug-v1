import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = buildMetadata({
  title: "Cookie Policy",
  description: "The cookies ParkPlug uses, what they do, and how to control them.",
  path: "/legal/cookies",
});

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      summary="What we store in your browser, and why."
      relatedLinks={[
        { href: "/legal/privacy", label: "Privacy Policy" },
        { href: "/dashboard/settings", label: "Account Settings" },
      ]}
      sections={[
        {
          id: "essential",
          heading: "Essential cookies",
          body: (
            <>
              <p>
                These are required for ParkPlug to work at all, so they cannot be
                turned off:
              </p>
              <ul>
                <li>Keeping you signed in between pages and visits.</li>
                <li>Remembering your most recent search so a refresh does not lose it.</li>
                <li>Holding a listing or report draft you have not finished.</li>
                <li>Protecting forms against cross-site request forgery.</li>
              </ul>
            </>
          ),
        },
        {
          id: "optional",
          heading: "Optional cookies",
          body: (
            <>
              <p>
                ParkPlug does not currently set analytics or advertising cookies. If
                that changes, you will be asked for permission first, and you will be
                able to decline without losing access to any feature.
              </p>
              <p>
                Because there are no optional cookies today, you will not see a consent
                banner — showing one for cookies we do not set would be misleading.
              </p>
            </>
          ),
        },
        {
          id: "third-party",
          heading: "Third-party services",
          body: (
            <p>
              Map tiles, address lookup, and payment processing are provided by third
              parties. When one of those loads, that provider may set its own cookies
              under its own policy. We keep these to what is needed to show a map,
              resolve an address, or take a payment.
            </p>
          ),
        },
        {
          id: "control",
          heading: "Controlling cookies",
          body: (
            <>
              <p>
                Every browser lets you view and delete cookies, and block them by site.
                Blocking essential cookies for ParkPlug will sign you out and prevent
                booking.
              </p>
              <p>
                For everything else we hold about you, see the{" "}
                <Link href="/legal/privacy">Privacy Policy</Link>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
