"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container, SectionHeading } from "@/components/ui/card";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { IconBolt, IconGarage } from "@/components/ui/icons";
import { fetchMyFacilities } from "@/lib/api/sensors";
import type { Facility } from "@/lib/sensor-types";

// Auth is already enforced by src/app/host/layout.tsx (RequireAuth + HostShell) for every /host/* route.
export function HostFacilitiesView() {
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "unconfigured">("loading");
  const [facilities, setFacilities] = useState<Facility[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchMyFacilities();
      if (cancelled) return;
      if (!result.ok) {
        setStatus(result.error.code === "network" && result.error.retryable === false ? "unconfigured" : "error");
        return;
      }
      setFacilities(result.data);
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Container size="default" className="py-8 lg:py-10">
      <SectionHeading
        eyebrow="Sensor platform"
        title="Your facilities"
        description="Live occupancy and sensor health for every facility you manage."
      />

      <div className="mt-6">
        {status === "loading" ? (
          <div className="grid place-items-center py-16">
            <Spinner label="Loading your facilities" />
          </div>
        ) : status === "unconfigured" ? (
          <EmptyState
            icon={<IconBolt />}
            title="Live sensor data is not connected"
            description="This environment does not have a live sensor API configured."
          />
        ) : status === "error" ? (
          <ErrorState title="We could not load your facilities" description="Try refreshing the page." />
        ) : facilities.length === 0 ? (
          <EmptyState
            icon={<IconGarage />}
            title="No facilities yet"
            description="Sensor-monitored facilities you own will appear here."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((facility) => {
              const sensorsOnline = facility.spaces.filter((s) => s.sensor?.onlineStatus === "ONLINE").length;
              return (
                <li key={facility.id}>
                  <Link
                    href={`/host/facilities/${facility.facilityId}`}
                    className="block rounded-card border border-ink-200 bg-ink-50 p-5 transition-colors hover:border-ink-300"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-pp-border bg-pp-bg px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-pp-live">
                      Sensor-powered
                    </span>
                    <h2 className="mt-2 text-lg font-bold text-ink-950">{facility.name}</h2>
                    <p className="mt-0.5 truncate text-sm text-ink-600">{facility.address}</p>

                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-xl font-extrabold text-ink-950">
                        {facility.available}/{facility.total}
                      </span>
                      <span className="text-xs text-ink-500">available</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      {sensorsOnline}/{facility.spaces.length} sensors online · {facility.occupancyPct}% occupied
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Container>
  );
}
