import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = buildMetadata({
  title: "Community Reporting Guidelines",
  description: "How to report free public parking on ParkPlugs accurately and safely.",
  path: "/legal/community-guidelines",
});

export default function CommunityGuidelinesPage() {
  return (
    <LegalPage
      title="Community Reporting Guidelines"
      summary="Community reports only help if they are accurate. Here is how to write a good one — and what never to include."
      relatedLinks={[
        { href: "/report-parking", label: "Report Free Parking" },
        { href: "/legal/prohibited-conduct", label: "Prohibited Conduct" },
        { href: "/safety", label: "Safety & Trust" },
      ]}
      sections={[
        {
          id: "what",
          heading: "What to report",
          body: (
            <>
              <p>
                Report parking that is genuinely open to the public and that you have
                actually seen — street parking, a public lot with open spaces, a
                metered block that is free at that hour.
              </p>
              <p>Do not report:</p>
              <ul>
                <li>Private property, including someone else&rsquo;s driveway or lot.</li>
                <li>Spaces reserved for residents, permit holders, or customers.</li>
                <li>Accessible spaces, unless you are noting that they are the only ones open.</li>
                <li>Parking you have not seen yourself.</li>
              </ul>
            </>
          ),
        },
        {
          id: "accuracy",
          heading: "Be accurate about what you saw",
          body: (
            <>
              <p>
                Report the number of spaces you actually counted, and the time you
                actually saw them. Use the confidence setting honestly — a quick glance
                from a moving car is not the same as standing on the block.
              </p>
              <p>
                Restrictions are the most valuable part of a report. Read the sign
                properly and record time limits, permit requirements, street-cleaning
                windows, and loading restrictions. If you are not sure, choose
                &ldquo;Restrictions unknown&rdquo; rather than guessing.
              </p>
            </>
          ),
        },
        {
          id: "safety-first",
          heading: "Never report while driving",
          body: (
            <p>
              Pull over and stop before you open ParkPlugs. No parking report is worth a
              collision. If you are a passenger, report on behalf of the driver
              instead.
            </p>
          ),
        },
        {
          id: "privacy",
          heading: "Protect people&rsquo;s privacy",
          body: (
            <>
              <p>Reports are public. Never include:</p>
              <ul>
                <li>License plates.</li>
                <li>People&rsquo;s faces.</li>
                <li>House numbers, mailboxes, or anything identifying a specific home.</li>
                <li>Comments about a resident, business, or neighbour.</li>
              </ul>
              <p>
                If you add a photo, it should show the sign, not the street&rsquo;s
                residents.
              </p>
            </>
          ),
        },
        {
          id: "keep-current",
          heading: "Keep reports current",
          body: (
            <p>
              Reports expire on their own, because street parking changes fast. If you
              pass a block again and the space has gone, mark it taken. If it is still
              there, confirm it. Both actions make the map more useful for the next
              driver.
            </p>
          ),
        },
        {
          id: "misuse",
          heading: "Misuse of reporting",
          body: (
            <p>
              Deliberately filing false reports, reporting private property as public,
              or using reports to direct traffic at a particular person or business is
              a violation of{" "}
              <Link href="/legal/prohibited-conduct">Prohibited Conduct</Link> and can
              lead to your account being closed.
            </p>
          ),
        },
      ]}
    />
  );
}
