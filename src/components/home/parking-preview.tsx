"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { search } from "@/lib/api";
import { getCurrentPosition } from "@/lib/geo";
import { formatMoney, formatRelative } from "@/lib/format";
import { DEFAULT_FILTERS, type Coordinates, type SearchResults } from "@/lib/types";
import { ParkingMap, type MapSelection } from "@/components/map/parking-map";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/feedback";
import { IconBolt, IconCrosshair, IconMapPin, IconSearch } from "@/components/ui/icons";

type State =
  | { phase: "idle" }
  | { phase: "locating" }
  | { phase: "loading"; center: Coordinates }
  | { phase: "ready"; center: Coordinates; results: SearchResults }
  | { phase: "error"; message: string };

/**
 * Live preview of nearby parking. Shows only what the API actually returns —
 * when an area has nothing yet, it says so instead of inventing markers.
 */
export function ParkingPreview() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [selected, setSelected] = useState<MapSelection>(null);

  const load = useCallback(async (center: Coordinates) => {
    setState({ phase: "loading", center });
    const result = await search.run({
      destination: "",
      center,
      sort: "closest",
      filters: { ...DEFAULT_FILTERS, maxDistanceMeters: 5000 },
    });
    if (result.ok) {
      setState({ phase: "ready", center, results: result.data });
    } else {
      setState({ phase: "error", message: result.error.message });
    }
  }, []);

  const locate = useCallback(async () => {
    setState({ phase: "locating" });
    const position = await getCurrentPosition();
    if (!position.ok) {
      setState({ phase: "idle" });
      return;
    }
    await load(position.center);
  }, [load]);

  // Only asks for location if permission was already granted, so the homepage
  // never fires an unprompted permission dialog on first visit.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (status.state === "granted") void locate();
      })
      .catch(() => {
        /* Permissions API unsupported — leave the idle prompt in place. */
      });
  }, [locate]);

  const listings = state.phase === "ready" ? state.results.listings : [];
  const reports = state.phase === "ready" ? state.results.reports : [];
  const hasResults = listings.length + reports.length > 0;

  return (
    <div className="overflow-hidden rounded-card border border-ink-200 bg-white shadow-e2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-4 py-3 sm:px-5">
        <Legend />
        {state.phase === "ready" ? (
          <ButtonLink href="/search" variant="tertiary" size="sm">
            View full map
          </ButtonLink>
        ) : null}
      </div>

      <div className="relative">
        {state.phase === "ready" || state.phase === "loading" ? (
          <ParkingMap
            center={state.center}
            zoom={14}
            listings={listings}
            reports={reports}
            selected={selected}
            onSelect={setSelected}
            userLocation={state.center}
            className="h-72 sm:h-96"
            showRecenter={false}
            ariaLabel="Map preview of parking near your location. The list below contains the same places."
          />
        ) : (
          <div className="grid h-72 place-items-center bg-ink-50 px-6 sm:h-96">
            {state.phase === "locating" ? (
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
                <h3 className="text-base font-bold text-ink-900">See what is near you</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                  Share your location to preview reservable spaces and community
                  reports nearby, or search for a destination instead.
                </p>
                <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
                  <Button size="sm" leadingIcon={<IconCrosshair />} onClick={() => void locate()}>
                    Use my location
                  </Button>
                  <ButtonLink href="/search" variant="secondary" size="sm" leadingIcon={<IconSearch />}>
                    Search an address
                  </ButtonLink>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview cards double as the map's accessible list equivalent. */}
      {state.phase === "ready" ? (
        <div className="border-t border-ink-200 p-4 sm:p-5">
          {hasResults ? (
            <ul className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
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
                    href={`/search?free=1`}
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
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-3 w-3 rounded-full bg-info-600 ring-2 ring-info-100" />
        <span className="font-medium text-ink-700">You</span>
      </li>
    </ul>
  );
}
