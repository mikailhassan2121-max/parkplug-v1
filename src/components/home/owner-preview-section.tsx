"use client";

import { useEffect, useState } from "react";
import { fetchFacilitiesList, fetchFacilitySnapshot } from "@/lib/api/sensors";
import type { Facility } from "@/lib/sensor-types";
import { Container, SectionHeading } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { SpaceGrid } from "@/components/sensor/space-grid";
import { Skeleton } from "@/components/ui/feedback";
import { IconArrowRight, IconChart } from "@/components/ui/icons";

/**
 * Shows the actual /owner UI — the same StatCard layout and SpaceGrid
 * component that render on the signed-in dashboard — driven by one real
 * public facility snapshot, not a mockup. Renders nothing if there is no
 * facility to show, rather than a fabricated example.
 */
export function OwnerPreviewSection() {
  const [facility, setFacility] = useState<Facility | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void fetchFacilitiesList().then(async (result) => {
      if (!result.ok || result.data.length === 0) {
        if (!cancelled) setFacility(null);
        return;
      }
      const snapshot = await fetchFacilitySnapshot(result.data[0]!.facilityId);
      if (!cancelled) setFacility(snapshot.ok ? snapshot.data : null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (facility === null) return null;

  const sensorsOnline = facility?.spaces.filter((s) => s.sensor?.onlineStatus === "ONLINE").length ?? 0;
  const sensorsTotal = facility?.spaces.filter((s) => s.sensor).length ?? 0;

  return (
    <section className="py-14 lg:py-20">
      <Container size="wide">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="For property owners"
              title="See exactly what's happening at your properties."
              description="Live occupancy, sensor health, and activity for every space you monitor — not a static report you check once a week."
            />
            <ul className="mt-6 space-y-3 text-sm text-ink-700">
              {[
                "Live available / occupied counts per facility",
                "Sensor health at a glance — online, offline, or needs attention",
                "A real activity feed, not a made-up summary",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <IconChart className="mt-0.5 shrink-0 text-base text-teal" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <ButtonLink href="/owner" trailingIcon={<IconArrowRight />}>
                View the owner dashboard
              </ButtonLink>
            </div>
          </div>

          <div className="rounded-card border border-ink-200 bg-white p-5 shadow-e1 sm:p-6">
            {facility === undefined ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <div className="grid grid-cols-3 gap-3">
                  <Skeleton className="h-16 w-full" rounded="rounded-xl" />
                  <Skeleton className="h-16 w-full" rounded="rounded-xl" />
                  <Skeleton className="h-16 w-full" rounded="rounded-xl" />
                </div>
                <Skeleton className="h-32 w-full" rounded="rounded-xl" />
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{facility!.name}</p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <MiniStat label="Available" value={facility!.available} />
                  <MiniStat label="Occupancy" value={`${facility!.occupancyPct}%`} />
                  <MiniStat label="Sensors online" value={`${sensorsOnline}/${sensorsTotal}`} />
                </div>
                <div className="mt-4">
                  <SpaceGrid spaces={facility!.spaces.slice(0, 8)} />
                </div>
              </>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3">
      <p className="text-2xs font-semibold text-ink-500">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold text-ink-950">{value}</p>
    </div>
  );
}
