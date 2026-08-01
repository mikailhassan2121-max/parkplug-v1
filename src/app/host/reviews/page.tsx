"use client";

import { EmptyState } from "@/components/ui/feedback";
import { IconStar } from "@/components/ui/icons";

export default function HostReviewsPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Reviews</h1>
      <p className="mt-1.5 text-sm text-ink-600">
        What drivers say about your spaces, and the reviews you have left for them.
      </p>

      <EmptyState
        className="mt-6"
        icon={<IconStar />}
        title="No reviews yet"
        description="A driver can review a space after their reservation is complete, and you can review them in return. Reviews are only shown once they are written by someone who actually parked with you."
        actions={[{ label: "View reservations", href: "/host/reservations" }]}
      />
    </div>
  );
}
