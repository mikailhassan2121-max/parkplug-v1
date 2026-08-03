import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = buildMetadata({
  title: "Accessibility",
  description: "How ParkPlugs is built to be usable with a keyboard, a screen reader, and assistive technology.",
  path: "/accessibility",
});

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility"
      summary="Finding parking should work the same whether you use a mouse, a keyboard, or a screen reader."
      relatedLinks={[
        { href: "/support", label: "Contact Support" },
        { href: "/help", label: "Help Center" },
      ]}
      sections={[
        {
          id: "commitment",
          heading: "What we aim for",
          body: (
            <p>
              ParkPlugs is built against the Web Content Accessibility Guidelines
              (WCAG) 2.2 at level AA. That is the target we design and test to, and we
              treat a gap against it as a bug rather than a nice-to-have.
            </p>
          ),
        },
        {
          id: "built-in",
          heading: "What is built in today",
          body: (
            <ul>
              <li>Every interactive control is reachable and operable by keyboard.</li>
              <li>A visible focus ring on everything focusable, at a consistent contrast.</li>
              <li>A skip link to jump straight to the main content.</li>
              <li>
                Map results are always duplicated as a text list, so nothing is
                available only visually.
              </li>
              <li>Form fields keep visible labels; errors are announced and summarised.</li>
              <li>Status is never signalled by colour alone — a label always carries it.</li>
              <li>Dialogs trap focus, close on Escape, and return focus where it came from.</li>
              <li>Animation is reduced automatically when your system asks for that.</li>
              <li>Text can be zoomed to 200% without content being cut off.</li>
            </ul>
          ),
        },
        {
          id: "parking-accessibility",
          heading: "Finding accessible parking",
          body: (
            <p>
              You can filter search results to spaces a host has marked as accessible,
              and listing pages carry the accessibility notes the host provided —
              surface, step-free access, and distance to a building entrance where they
              have told us. ParkPlugs does not inspect spaces, so please read those notes
              and message the host if anything is unclear.
            </p>
          ),
        },
        {
          id: "known-gaps",
          heading: "Known gaps",
          body: (
            <p>
              Map panning and zooming rely on the underlying map library, which is
              keyboard-operable but is not equivalent to the list view for a screen
              reader. That is why every map on ParkPlugs is paired with a list. If you
              hit something the list does not cover, please tell us.
            </p>
          ),
        },
        {
          id: "feedback",
          heading: "Telling us about a problem",
          body: (
            <p>
              If any part of ParkPlugs is hard to use with your assistive technology,{" "}
              <Link href="/support">contact support</Link> and choose
              &ldquo;Technical problem&rdquo;. Tell us the page, what you were trying
              to do, and the browser and assistive technology you use. Accessibility
              reports are treated as priority bugs.
            </p>
          ),
        },
      ]}
    />
  );
}
