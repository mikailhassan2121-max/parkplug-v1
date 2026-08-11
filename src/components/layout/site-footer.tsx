import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { business, copyrightHolder } from "@/config/business";
import { Container } from "@/components/ui/card";

const COLUMNS: Array<{ heading: string; links: Array<{ href: string; label: string }> }> = [
  {
    heading: "ParkPlugs",
    links: [
      { href: "/about", label: "About" },
      { href: "/how-it-works", label: "How It Works" },
      { href: "/pricing", label: "Pricing & Fees" },
    ],
  },
  {
    heading: "Drivers",
    links: [
      { href: "/search", label: "Find Parking" },
      { href: "/live", label: "Live Map" },
      { href: "/report-parking", label: "Report Free Parking" },
      { href: "/dashboard/reservations", label: "Reservations" },
      { href: "/help?audience=drivers", label: "Help Center" },
    ],
  },
  {
    heading: "Hosts",
    links: [
      { href: "/host/listings/new", label: "List Your Parking" },
      { href: "/for-property-owners", label: "For Property Owners" },
      { href: "/hosting-guide", label: "Hosting Guide" },
      { href: "/legal/host-standards", label: "Host Standards" },
      { href: "/host/earnings", label: "Earnings" },
    ],
  },
  {
    heading: "Trust & Legal",
    links: [
      { href: "/safety", label: "Safety" },
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/cancellation", label: "Cancellation Policy" },
      { href: "/legal/community-guidelines", label: "Community Guidelines" },
      { href: "/support", label: "Contact Support" },
    ],
  },
];

export function SiteFooter() {
  const socialLinks = Object.entries(business.social).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );

  return (
    <footer className="mt-auto border-t border-ink-200 bg-ink-50">
      <Container size="wide" className="py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2.5fr)]">
          <div className="max-w-sm">
            <Link href="/" aria-label="ParkPlugs home" className="inline-flex rounded-lg">
              <Logo />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              ParkPlugs helps drivers find parking near where they are going, and
              helps neighbours put unused spaces to work.
            </p>
            {socialLinks.length > 0 ? (
              <ul className="mt-5 flex gap-3">
                {socialLinks.map(([name, href]) => (
                  <li key={name}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-sm font-semibold capitalize text-ink-600 underline-offset-2 hover:text-brand-700 hover:underline"
                    >
                      {name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-900">
                  {column.heading}
                </h2>
                <ul className="mt-3 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-ink-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-ink-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-500">
            © {new Date().getFullYear()} {copyrightHolder()}. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {[
              { href: "/accessibility", label: "Accessibility" },
              { href: "/legal/cookies", label: "Cookie Policy" },
              { href: "/legal/data-deletion", label: "Data & Account Deletion" },
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-xs text-ink-500 underline-offset-2 hover:text-brand-700 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
