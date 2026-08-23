"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchFacilitiesList } from "@/lib/api/sensors";
import type { FacilitySummary } from "@/lib/sensor-types";
import { Container, SectionHeading } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { IconBolt, IconChevronRight } from "@/components/ui/icons";

/**
 * Real, unauthenticated facility data — the same /api/v1/facilities list the
 * driver map uses. No placeholder counts: an area with nothing connected
 * yet just doesn't render this section, rather than showing invented numbers.
 */
export function LiveInfrastructureSection() {
  const [facilities, setFacilities] = useState<FacilitySummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchFacilitiesList().then((result) => {
      if (!cancelled) setFacilities(result.ok ? result.data : []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (facilities !== null && facilities.length === 0) return null;

  return (
    <section className="border-y border-ink-200 bg-ink-50 py-14 lg:py-20">
      <Container size="wide">
        <SectionHeading
          eyebrow="Live parking infrastructure"
          title="Sensor-confirmed availability, not a guess"
          description="Some facilities on ParkPlugs report real-time occupancy from installed sensors. What you see is what a device is reporting right now."
        />

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facilities === null
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" rounded="rounded-card" />)
            : facilities.slice(0, 6).map((facility) => (
                <Link
                  key={facility.id}
                  href={`/facilities/${facility.facilityId}`}
                  className="rounded-card border border-ink-200 bg-white p-5 transition-colors hover:border-teal"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-teal">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden="true" />
                    Live
                  </span>
                  <h3 className="mt-2.5 truncate text-base font-bold text-ink-950">{facility.name}</h3>
                  <p className="truncate text-xs text-ink-600">{facility.address}</p>
                  <p className="mt-3 text-lg font-extrabold text-ink-950">
                    {facility.available}
                    <span className="text-sm font-semibold text-ink-500"> / {facility.total} available</span>
                  </p>
                </Link>
              ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <ButtonLink href="/parking" trailingIcon={<IconChevronRight />}>
            See live facilities on the map
          </ButtonLink>
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
            <IconBolt aria-hidden="true" />
            Powered by installed occupancy sensors, updated in real time.
          </span>
        </div>
      </Container>
    </section>
  );
}
