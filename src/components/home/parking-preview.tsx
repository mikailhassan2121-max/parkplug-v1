"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { search } from "@/lib/api";
import { fetchFacilitiesList, sensorApiConfigured } from "@/lib/api/sensors";
import { getCurrentPosition } from "@/lib/geo";
import { formatMoney, formatRelative } from "@/lib/format";
import { DEFAULT_FILTERS, type Coordinates, type FreeParkingReport, type ListingSummary } from "@/lib/types";
import type { FacilitySummary } from "@/lib/sensor-types";
import { ParkingMap, type MapSelection } from "@/components/map/parking-map";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/feedback";
import { IconBolt, IconCrosshair, IconMapPin, IconSearch } from "@/components/ui/icons";

type State =
  | { phase: "loading" }
  | { phase: "locating" }
  | {
      phase: "ready";
      center: Coordinates;
      facilities: FacilitySummary[];
      listings: ListingSummary[];
      reports: FreeParkingReport[];
    }
  /** Nothing real to show anywhere yet — no facilities, no location-based results. */
  | { phase: "empty" }
  | { phase: "error"; message: string };

function averageCenter(facilities: FacilitySummary[]): Coordinates {
  const lat = facilities.reduce((sum, f) => sum + f.location.lat, 0) / facilities.length;
  const lng = facilities.reduce((sum, f) => sum + f.location.lng, 0) / facilities.length;
  return { lat, lng };
}

/**
 * Live preview of nearby parking. Shows only what the API actually returns —
 * when an area has nothing yet, it says so instead of inventing markers.
 *
 * Sensor-monitored facilities load unconditionally on mount (that data isn't
 * tied to the visitor's location), so the hero renders a real, populated map
 * immediately instead of waiting on a geolocation prompt that may never
 * resolve. Marketplace listings and reports layer in once we have a location,
 * either from a previously-granted permission or an explicit "Use my
 * location" / destination search.
 */
export function ParkingPreview() {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [selected, setSelected] = useState<MapSelection>(null);

  const loadNearby = useCallback(async (center: Coordinates) => {
    const [facilitiesResult, searchResult] = await Promise.all([
      fetchFacilitiesList(),
      search.run({
        destination: "",
        center,
        sort: "closest",
        filters: { ...DEFAULT_FILTERS, maxDistanceMeters: 5000 },
      }),
    ]);
    const facilities = facilitiesResult.ok ? facilitiesResult.data : [];
    if (searchResult.ok) {
      setState({
        phase: "ready",
        center,
        facilities,
        listings: searchResult.data.listings,
        reports: searchResult.data.reports,
      });
    } else if (facilities.length > 0) {
      setState({ phase: "ready", center: averageCenter(facilities), facilities, listings: [], reports: [] });
    } else {
      setState({ phase: "error", message: searchResult.error.message });
    }
  }, []);

  const locate = useCallback(async () => {
    setState({ phase: "locating" });
    const position = await getCurrentPosition();
    if (!position.ok) {
      setState((prev) => (prev.phase === "locating" ? { phase: "empty" } : prev));
      return;
    }
    await loadNearby(position.center);
  }, [loadNearby]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const facilitiesResult = await fetchFacilitiesList();
      if (cancelled) return;
      const facilities = facilitiesResult.ok ? facilitiesResult.data : [];

      if (facilities.length > 0) {
        setState({
          phase: "ready",
          center: averageCenter(facilities),
          facilities,
          listings: [],
          reports: [],
        });
      } else {
        setState({ phase: "empty" });
      }

      // Only asks for location if permission was already granted, so the
      // homepage never fires an unprompted permission dialog on first visit.
      if (typeof navigator === "undefined" || !navigator.permissions) return;
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status) => {
          if (!cancelled && status.state === "granted") void locate();
        })
        .catch(() => {
          /* Permissions API unsupported — leave the current state in place. */
        });
    }

    void init();
    return () => {
      cancelled = true;
    };
    // Runs once on mount; `locate` is stable via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const facilities = state.phase === "ready" ? state.facilities : [];
  const listings = state.phase === "ready" ? state.listings : [];
  const reports = state.phase === "ready" ? state.reports : [];
  const hasAnyResults = facilities.length + listings.length + reports.length > 0;
  const showMap = state.phase === "ready";

  return (
    <div className="overflow-hidden rounded-card border border-ink-300 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-4 py-3 sm:px-5">
        <Legend />
        {showMap ? (
          <ButtonLink href="/parking" variant="tertiary" size="sm">
            View full map
          </ButtonLink>
        ) : null}
      </div>

      <div className="relative">
        {showMap && state.phase === "ready" ? (
          <ParkingMap
            center={state.center}
            zoom={facilities.length > 0 && listings.length === 0 ? 12 : 14}
            listings={listings}
            reports={reports}
            facilities={facilities}
            selected={selected}
            onSelect={setSelected}
            userLocation={listings.length > 0 || reports.length > 0 ? state.center : undefined}
            className="h-72 sm:h-96"
            showRecenter={false}
            ariaLabel="Map preview of live parking facilities and nearby spaces. The list below contains the same places."
          />
        ) : (
          <div className="grid h-72 place-items-center bg-ink-50 px-6 sm:h-96">
            {state.phase === "loading" || state.phase === "locating" ? (
              <div className="w-full max-w-sm space-y-3" aria-hidden="true">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-40 w-full" rounded="rounded-xl" />
              </div>
            ) : state.phase === "error" ? (
              <div className="max-w-sm text-center">
                <h3 className="text-base font-bold text-ink-900">
                  We could not load nearby parking
                </h3>
                <p className="mt-1.5 text-sm text-ink-600">{state.message}</p>
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => void locate()}>
                  Try again
                </Button>
              </div>
            ) : (
              <div className="max-w-md text-center">
                <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white text-2xl text-brand-600 shadow-e1">
                  <IconMapPin />
                </span>
                <h3 className="text-base font-bold text-ink-900">
                  {sensorApiConfigured ? "No live facilities near you yet" : "See what is near you"}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                  Share your location to preview reservable spaces and community
                  reports nearby, or search for a destination instead.
                </p>
                <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
                  <Button size="sm" leadingIcon={<IconCrosshair />} onClick={() => void locate()}>
                    Use my location
                  </Button>
                  <ButtonLink href="/parking" variant="secondary" size="sm" leadingIcon={<IconSearch />}>
                    Search an address
                  </ButtonLink>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview cards double as the map's accessible list equivalent. */}
      {showMap ? (
        <div className="border-t border-ink-200 p-4 sm:p-5">
          {hasAnyResults ? (
            <ul className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {facilities.slice(0, 6).map((facility) => (
                <li key={facility.id} className="w-64 shrink-0">
                  <Link
                    href={`/facilities/${facility.facilityId}`}
                    onFocus={() => setSelected({ kind: "facility", id: facility.facilityId })}
                    onMouseEnter={() => setSelected({ kind: "facility", id: facility.facilityId })}
                    className="flex h-full flex-col gap-1.5 rounded-xl border border-ink-200 p-3.5 transition-colors hover:border-teal hover:bg-brand-50/40"
                  >
                    <Badge tone="brand" size="sm">Live facility</Badge>
                    <span className="line-clamp-1 text-sm font-bold text-ink-900">{facility.name}</span>
                    <span className="line-clamp-1 text-xs text-ink-600">{facility.address}</span>
                    <span className="mt-auto pt-1 text-sm font-bold text-ink-900">
                      {facility.available} of {facility.total} spaces available
                    </span>
                  </Link>
                </li>
              ))}
              {listings.slice(0, 6).map((listing) => (
                <li key={listing.id} className="w-64 shrink-0">
                  <Link
                    href={`/spaces/${listing.slug}`}
                    onFocus={() => setSelected({ kind: "listing", id: listing.id })}
                    onMouseEnter={() => setSelected({ kind: "listing", id: listing.id })}
                    className="flex h-full flex-col gap-1.5 rounded-xl border border-ink-200 p-3.5 transition-colors hover:border-brand-400 hover:bg-brand-50/40"
                  >
                    <Badge tone="brand" size="sm">Reservable</Badge>
                    <span className="line-clamp-1 text-sm font-bold text-ink-900">{listing.title}</span>
                    <span className="line-clamp-1 text-xs text-ink-600">{listing.location.label}</span>
                    <span className="mt-auto pt-1 text-sm font-bold text-brand-800">
                      {formatMoney(listing.pricePerHourCents, listing.currency)}/hr
                    </span>
                  </Link>
                </li>
              ))}
              {reports.slice(0, 6).map((report) => (
                <li key={report.id} className="w-64 shrink-0">
                  <Link
                    href={`/parking?free=1`}
                    onFocus={() => setSelected({ kind: "report", id: report.id })}
                    onMouseEnter={() => setSelected({ kind: "report", id: report.id })}
                    className="flex h-full flex-col gap-1.5 rounded-xl border border-ink-200 p-3.5 transition-colors hover:border-accent-400 hover:bg-accent-50/40"
                  >
                    <Badge tone="accent" size="sm" icon={<IconBolt />}>
                      Recently reported
                    </Badge>
                    <span className="line-clamp-1 text-sm font-bold text-ink-900">
                      Free parking reported
                    </span>
                    <span className="line-clamp-1 text-xs text-ink-600">{report.location.label}</span>
                    <span className="mt-auto pt-1 text-xs font-semibold text-accent-800">
                      {formatRelative(report.observedAt)} · availability not guaranteed
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl bg-ink-50 px-4 py-5 text-center">
              <p className="text-sm font-bold text-ink-900">
                ParkPlugs is growing in this area
              </p>
              <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-ink-600">
                Report free parking you spot, or become one of the first local hosts.
              </p>
              <div className="mt-4 flex flex-col justify-center gap-2.5 sm:flex-row">
                <ButtonLink href="/report-parking" size="sm" variant="secondary">
                  Report Free Parking
                </ButtonLink>
                <ButtonLink href="/host/listings/new" size="sm">
                  List Your Space
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3 w-3 rounded-full border-2 border-teal bg-white" />
        <span className="font-medium text-ink-700">Live facility</span>
      </li>
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="grid h-4 w-8 place-items-center rounded-full bg-brand-600 text-[0.5rem] font-bold text-white"
        >
          $
        </span>
        <span className="font-medium text-ink-700">Reservable</span>
      </li>
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="h-4 w-4 rounded-[0.25rem] bg-accent-500"
          style={{ transform: "rotate(45deg)" }}
        />
        <span className="font-medium text-ink-700">Community reported</span>
      </li>
    </ul>
  );
}
