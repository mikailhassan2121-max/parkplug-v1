"use client";

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/card";
import { EmptyState, ErrorState, Spinner } from "@/components/ui/feedback";
import { IconMapPin, IconNavigation } from "@/components/ui/icons";
import { LiveBadge } from "@/components/sensor/live-badge";
import { SpaceGrid } from "@/components/sensor/space-grid";
import { useFacilityLiveStatus } from "@/lib/use-facility-live-status";

export function FacilityView({ facilityId }: { facilityId: string }) {
  const state = useFacilityLiveStatus(facilityId);

  if (state.status === "unconfigured") {
    return (
      <Container size="default" className="py-14">
        <EmptyState
          icon={<IconMapPin />}
          title="Live sensor data is not connected"
          description="This environment does not have a live sensor API configured."
        />
      </Container>
    );
  }

  if (state.status === "loading") {
    return (
      <Container size="default" className="grid min-h-[50dvh] place-items-center py-14">
        <Spinner label="Loading facility" />
      </Container>
    );
  }

  if (state.status === "error") {
    return (
      <Container size="default" className="py-14">
        <ErrorState
          title="We could not load this facility"
          description={state.error.message}
          actions={[{ label: "Back to parking search", href: "/parking" }]}
        />
      </Container>
    );
  }

  const { facility, live } = state;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${facility.location.lat},${facility.location.lng}`;

  return (
    <>
      <section className="border-b border-ink-200 bg-ink-50">
        <Container size="default" className="py-8 lg:py-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-2xs font-bold uppercase tracking-wide text-teal">
            Sensor-powered
          </span>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 sm:text-3xl">{facility.name}</h1>
              <p className="mt-1 text-sm text-ink-600">{facility.address}</p>
              <div className="mt-3">
                <LiveBadge live={live} updatedAt={facility.updatedAt} />
              </div>
            </div>
            <ButtonLink href={mapsHref} target="_blank" rel="noreferrer noopener" leadingIcon={<IconNavigation />}>
              Navigate
            </ButtonLink>
          </div>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-3xl font-extrabold tracking-tight text-ink-950">
                {facility.available}/{facility.total}
              </span>
              <span className="ml-2 text-sm text-ink-600">available</span>
            </div>
            <span className="text-sm text-ink-600">{facility.occupancyPct}% occupied</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={facility.occupancyPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Occupancy"
            className="mt-2 h-2 overflow-hidden rounded-full bg-ink-200"
          >
            <div
              className="h-full rounded-full bg-teal transition-[width] duration-300 ease-out"
              style={{ width: `${facility.occupancyPct}%` }}
            />
          </div>
        </Container>
      </section>

      <Container size="default" className="py-8 lg:py-10">
        <h2 className="text-lg font-bold text-ink-900">Spaces ({facility.totalSpaces} monitored)</h2>
        <div className="mt-4">
          <SpaceGrid spaces={facility.spaces} />
        </div>
      </Container>
    </>
  );
}
