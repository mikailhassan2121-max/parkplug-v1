"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { search as searchApi, saved as savedApi } from "@/lib/api";
import { fetchFacilitiesList } from "@/lib/api/sensors";
import { ERROR_COPY } from "@/lib/api/result";
import { formatRange } from "@/lib/format";
import { distanceMeters as distanceBetween } from "@/lib/geo";
import {
  countActiveFilters,
  parseSearchParams,
  serializeSearchQuery,
  validateDateRange,
} from "@/lib/search-params";
import { AMENITIES, PARKING_TYPES, SORT_OPTIONS, type Coordinates, type SearchFilters, type SearchQuery, type SearchResults, type SortOption } from "@/lib/types";
import type { FacilitySummary } from "@/lib/sensor-types";
import { useSession } from "@/lib/session";
import { ParkingMap, type MapSelection } from "@/components/map/parking-map";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/badge";
import { EmptyState, ErrorState, SkeletonListingCard } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { Overlay } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import {
  IconAlert,
  IconEdit,
  IconFilter,
  IconList,
  IconMap,
  IconRefresh,
  IconSearch,
} from "@/components/ui/icons";
import { SearchModule } from "@/components/search/search-module";
import { FilterPanel } from "@/components/search/filter-panel";
import { FacilityResultCard, ListingResultCard, ReportResultCard } from "@/components/search/result-card";

type LoadState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; results: SearchResults }
  | { phase: "error"; code: keyof typeof ERROR_COPY; message: string };

type FacilityWithDistance = FacilitySummary & { distanceMeters: number };

export function ParkingView() {
  const params = useSearchParams();
  const router = useRouter();
  const session = useSession();
  const { toast } = useToast();

  const query = useMemo(() => parseSearchParams(new URLSearchParams(params.toString())), [params]);

  const [state, setState] = useState<LoadState>({ phase: "idle" });
  const [facilities, setFacilities] = useState<FacilityWithDistance[]>([]);
  const [selected, setSelected] = useState<MapSelection>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [pendingCenter, setPendingCenter] = useState<Coordinates | null>(null);
  const [busyReport, setBusyReport] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);
  const rangeError = validateDateRange(query.startAt, query.endAt);

  /* ------------------------------ Load ------------------------------ */

  const load = useCallback(
    async (q: SearchQuery) => {
      if (!q.center) {
        setState({ phase: "idle" });
        setFacilities([]);
        return;
      }
      const center = q.center;
      setState({ phase: "loading" });
      const [result, facilitiesResult] = await Promise.all([
        searchApi.run(q),
        fetchFacilitiesList(),
      ]);
      setState(
        result.ok
          ? { phase: "ready", results: result.data }
          : { phase: "error", code: result.error.code, message: result.error.message },
      );
      if (facilitiesResult.ok) {
        const maxDistance = q.filters.maxDistanceMeters ?? 16000;
        setFacilities(
          facilitiesResult.data
            .map((facility) => ({ ...facility, distanceMeters: distanceBetween(center, facility.location) }))
            .filter((facility) => facility.distanceMeters <= maxDistance)
            .sort((a, b) => a.distanceMeters - b.distanceMeters),
        );
      } else {
        setFacilities([]);
      }
    },
    [],
  );

  useEffect(() => {
    if (rangeError) {
      setState({ phase: "idle" });
      setFacilities([]);
      return;
    }
    void load(query);
  }, [query, load, rangeError]);

  useEffect(() => {
    void savedApi.ids().then(setSavedIds);
  }, [session.status]);

  /* ---------------------------- Mutations --------------------------- */

  function updateQuery(patch: Partial<SearchQuery>) {
    router.replace(`/parking?${serializeSearchQuery({ ...query, ...patch })}`, { scroll: false });
  }

  async function toggleSave(listingId: string) {
    if (session.status !== "authenticated") {
      toast({
        tone: "info",
        title: "Sign in to save spaces",
        description: "Saved spaces are kept with your account.",
        action: { label: "Sign in", onClick: () => router.push("/signin?next=/parking") },
      });
      return;
    }
    const result = await savedApi.toggle(listingId);
    if (result.ok) {
      setSavedIds((prev) =>
        result.data.saved ? [...prev, listingId] : prev.filter((id) => id !== listingId),
      );
    } else {
      toast({ tone: "error", title: "Could not update saved spaces", description: result.error.message });
    }
  }

  async function actOnReport(id: string, action: "confirm" | "taken") {
    setBusyReport(id);
    const { reports } = await import("@/lib/api");
    const result = action === "confirm" ? await reports.confirm(id) : await reports.markTaken(id);
    setBusyReport(null);
    if (!result.ok) {
      toast({ tone: "error", title: "Could not update the report", description: result.error.message });
      return;
    }
    toast({
      tone: "success",
      title: action === "confirm" ? "Thanks for confirming" : "Marked as taken",
      description:
        action === "confirm"
          ? "Other drivers will see this report is still accurate."
          : "This helps keep the map current.",
    });
    void load(query);
  }

  /* ------------------------------ Derived --------------------------- */

  const results = state.phase === "ready" ? state.results : null;
  const listings = results?.listings ?? [];
  const reports = results?.reports ?? [];
  const totalCount = facilities.length + listings.length + reports.length;
  const activeFilterCount = countActiveFilters(query.filters);

  const summary =
    query.destination && query.startAt && query.endAt
      ? `Parking near ${query.destination} · ${formatRange(query.startAt, query.endAt)}`
      : query.destination
        ? `Parking near ${query.destination}`
        : "Parking near you";

  const activeChips = buildChips(query.filters);

  /* ------------------------------- Views ---------------------------- */

  if (!query.center && !rangeError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 lg:py-20">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Find parking</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Tell us where you are going and when, and we will show reservable
          spaces and community reports nearby.
        </p>
        <div className="mt-6">
          <SearchModule layout="hero" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      {/* ------------------------------------------------ Search summary bar */}
      <div className="sticky top-16 z-50 border-b border-ink-200 bg-white lg:top-18">
        <div className="mx-auto max-w-none px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-ink-300 px-3.5 py-2.5 text-left transition-colors hover:border-ink-400 hover:bg-ink-50"
            >
              <IconSearch className="shrink-0 text-ink-500" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-900">{summary}</span>
                <span className="block text-xs text-ink-500">Tap to change search</span>
              </span>
              <IconEdit className="shrink-0 text-ink-400" aria-hidden="true" />
            </button>

            <Button
              variant="secondary"
              leadingIcon={<IconFilter />}
              onClick={() => setFiltersOpen(true)}
              className="shrink-0"
            >
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 ? (
                <span className="ml-0.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-2xs font-bold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </div>

          {activeChips.length > 0 ? (
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {activeChips.map((chip) => (
                <li key={chip.key}>
                  <FilterChip
                    removeLabel={`Remove filter: ${chip.label}`}
                    onRemove={() => updateQuery({ filters: chip.clear(query.filters) })}
                  >
                    {chip.label}
                  </FilterChip>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() =>
                    updateQuery({
                      filters: {
                        includePaid: true,
                        includeFree: true,
                        availableNow: false,
                        parkingTypes: [],
                        amenities: [],
                        instantBookOnly: false,
                      },
                    })
                  }
                  className="px-2 py-1 text-xs font-bold text-ink-600 underline underline-offset-2 hover:text-ink-900"
                >
                  Clear All
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      </div>

      {rangeError ? (
        <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
          <ErrorState
            title="Check your arrival and departure times"
            description={rangeError}
            progressNote="Your destination and filters have been kept."
            actions={[{ label: "Edit search", onClick: () => setEditOpen(true) }]}
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* ------------------------------------------------------- Results */}
          <section
            aria-label="Parking results"
            className={cn(
              "flex min-w-0 flex-col lg:w-[clamp(24rem,42%,34rem)] lg:border-r lg:border-ink-200",
              mobileView === "map" && "hidden lg:flex",
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-3 sm:px-6">
              <p className="text-sm font-semibold text-ink-800" aria-live="polite" aria-atomic="true">
                {state.phase === "loading"
                  ? "Searching…"
                  : state.phase === "error"
                    ? "Search unavailable"
                    : `${totalCount} ${totalCount === 1 ? "result" : "results"}`}
              </p>
              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="sr-only">
                  Sort results
                </label>
                <Select
                  id="sort"
                  size="sm"
                  value={query.sort}
                  onChange={(e) => updateQuery({ sort: e.target.value as SortOption })}
                  className="w-auto"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div ref={resultsRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {state.phase === "loading" ? (
                <div role="status" aria-busy="true" className="space-y-4">
                  <span className="sr-only">Searching for parking</span>
                  {[0, 1, 2, 3].map((i) => (
                    <SkeletonListingCard key={i} />
                  ))}
                </div>
              ) : state.phase === "error" && facilities.length === 0 ? (
                <ErrorState
                  title={ERROR_COPY[state.code].title}
                  description={state.message || ERROR_COPY[state.code].description}
                  progressNote="Your search has been kept."
                  actions={[
                    { label: "Try again", onClick: () => void load(query) },
                    { label: "Edit search", onClick: () => setEditOpen(true), variant: "secondary" },
                  ]}
                />
              ) : totalCount === 0 ? (
                <EmptyState
                  icon={<IconSearch />}
                  title="No parking matches your current search."
                  description="Try widening the area, changing your times, or removing filters. You can also report free parking you have spotted."
                  actions={[
                    {
                      label: "Expand search area",
                      onClick: () =>
                        updateQuery({
                          filters: {
                            ...query.filters,
                            maxDistanceMeters: Math.min(
                              (query.filters.maxDistanceMeters ?? 5000) * 3,
                              16000,
                            ),
                          },
                        }),
                    },
                    { label: "Change dates", onClick: () => setEditOpen(true), variant: "secondary" },
                    ...(activeFilterCount > 0
                      ? [
                          {
                            label: "Clear filters",
                            variant: "secondary" as const,
                            onClick: () =>
                              updateQuery({
                                filters: {
                                  includePaid: true,
                                  includeFree: true,
                                  availableNow: false,
                                  parkingTypes: [],
                                  amenities: [],
                                  instantBookOnly: false,
                                },
                              }),
                          },
                        ]
                      : []),
                    { label: "Report free parking", href: "/report-parking", variant: "tertiary" },
                  ]}
                />
              ) : (
                <>
                  {results?.partial ? (
                    <div className="mb-4 flex gap-2.5 rounded-xl border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800">
                      <IconAlert className="mt-px shrink-0" aria-hidden="true" />
                      <span>{results.partial.message}</span>
                    </div>
                  ) : null}
                  {state.phase === "error" ? (
                    <div className="mb-4 flex gap-2.5 rounded-xl border border-warning-200 bg-warning-50 p-3.5 text-xs text-warning-800">
                      <IconAlert className="mt-px shrink-0" aria-hidden="true" />
                      <span>
                        Marketplace search is temporarily unavailable. Live facilities below are
                        still current.
                      </span>
                    </div>
                  ) : null}

                  <ul className="space-y-4">
                    {facilities.map((facility) => (
                      <li key={facility.id} data-result={facility.facilityId}>
                        <FacilityResultCard
                          facility={facility}
                          distanceMeters={facility.distanceMeters}
                          selected={
                            (selected?.kind === "facility" && selected.id === facility.facilityId) ||
                            hovered === facility.facilityId
                          }
                          onHover={(h) => setHovered(h ? facility.facilityId : null)}
                          onFocusCard={() => setSelected({ kind: "facility", id: facility.facilityId })}
                        />
                      </li>
                    ))}
                    {listings.map((listing) => (
                      <li key={listing.id} data-result={listing.id}>
                        <ListingResultCard
                          listing={listing}
                          selected={
                            (selected?.kind === "listing" && selected.id === listing.id) ||
                            hovered === listing.id
                          }
                          saved={savedIds.includes(listing.id)}
                          onToggleSave={() => void toggleSave(listing.id)}
                          onHover={(h) => setHovered(h ? listing.id : null)}
                          onFocusCard={() => setSelected({ kind: "listing", id: listing.id })}
                          searchVehicleSize={query.filters.vehicleSize}
                        />
                      </li>
                    ))}
                    {reports.map((report) => (
                      <li key={report.id} data-result={report.id}>
                        <ReportResultCard
                          report={report}
                          selected={
                            (selected?.kind === "report" && selected.id === report.id) ||
                            hovered === report.id
                          }
                          busy={busyReport === report.id}
                          onHover={(h) => setHovered(h ? report.id : null)}
                          onSelect={() => {
                            setSelected({ kind: "report", id: report.id });
                            setMobileView("map");
                          }}
                          onConfirm={() => void actOnReport(report.id, "confirm")}
                          onMarkTaken={() => void actOnReport(report.id, "taken")}
                        />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>

          {/* ----------------------------------------------------------- Map */}
          <section
            aria-label="Map of results"
            className={cn(
              "relative min-h-[60dvh] flex-1 lg:min-h-0",
              mobileView === "list" && "hidden lg:block",
            )}
          >
            {query.center && (results || facilities.length > 0) ? (
              <>
                <ParkingMap
                  center={results?.center ?? query.center}
                  listings={listings}
                  reports={reports}
                  facilities={facilities}
                  selected={selected}
                  onSelect={(next) => {
                    setSelected(next);
                    // Bring the matching card into view in the list.
                    if (next && resultsRef.current) {
                      const el = resultsRef.current.querySelector(`[data-result="${next.id}"]`);
                      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                    }
                  }}
                  onBoundsChange={(center) => {
                    const base = results?.center ?? query.center!;
                    const moved =
                      Math.abs(center.lat - base.lat) > 0.004 || Math.abs(center.lng - base.lng) > 0.004;
                    setPendingCenter(moved ? center : null);
                  }}
                  destination={query.center}
                  showLocateMe
                  className="h-full min-h-[60dvh] lg:min-h-full lg:sticky lg:top-[8.5rem] lg:h-[calc(100dvh-8.5rem)]"
                  ariaLabel="Map of parking results. The results list contains the same places in text form."
                />

                {pendingCenter ? (
                  <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
                    <Button
                      size="sm"
                      leadingIcon={<IconRefresh />}
                      className="pointer-events-auto shadow-e3"
                      onClick={() => {
                        updateQuery({ center: pendingCenter });
                        setPendingCenter(null);
                      }}
                    >
                      Search this area
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="grid h-full min-h-[60dvh] place-items-center bg-ink-100">
                <span className="skeleton h-full w-full" aria-hidden="true" />
              </div>
            )}
          </section>
        </div>
      )}

      {/* -------------------------------------------- Mobile list/map toggle */}
      {!rangeError ? (
        <div className="pointer-events-none sticky bottom-4 z-50 flex justify-center px-4 lg:hidden">
          <div className="pointer-events-auto inline-flex rounded-full bg-ink-900 p-1 shadow-e3">
            <button
              type="button"
              onClick={() => setMobileView("list")}
              aria-pressed={mobileView === "list"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                mobileView === "list" ? "bg-white text-ink-900" : "text-white",
              )}
            >
              <IconList aria-hidden="true" /> List
            </button>
            <button
              type="button"
              onClick={() => setMobileView("map")}
              aria-pressed={mobileView === "map"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                mobileView === "map" ? "bg-white text-ink-900" : "text-white",
              )}
            >
              <IconMap aria-hidden="true" /> Map
            </button>
          </div>
        </div>
      ) : null}

      <FilterPanel
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={query.filters}
        onApply={(next) => updateQuery({ filters: next })}
        resultCount={totalCount}
      />

      <Overlay
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit your search"
        variant="fullscreen"
        size="lg"
      >
        <SearchModule
          layout="hero"
          className="border-0 p-0 shadow-none"
          initial={{
            destination: query.destination,
            center: query.center,
            startAt: query.startAt,
            endAt: query.endAt,
            vehicleSize: query.filters.vehicleSize,
          }}
          onSubmitted={() => setEditOpen(false)}
        />
      </Overlay>
    </div>
  );
}

/* ------------------------------ Filter chips ----------------------------- */

type Chip = { key: string; label: string; clear: (f: SearchFilters) => SearchFilters };

function buildChips(filters: SearchFilters): Chip[] {
  const chips: Chip[] = [];

  if (!filters.includeFree) {
    chips.push({
      key: "paid-only",
      label: "Reservable only",
      clear: (f) => ({ ...f, includeFree: true }),
    });
  }
  if (!filters.includePaid) {
    chips.push({
      key: "free-only",
      label: "Free parking only",
      clear: (f) => ({ ...f, includePaid: true }),
    });
  }
  if (filters.availableNow) {
    chips.push({ key: "now", label: "Available now", clear: (f) => ({ ...f, availableNow: false }) });
  }
  if (filters.instantBookOnly) {
    chips.push({
      key: "instant",
      label: "Instant booking",
      clear: (f) => ({ ...f, instantBookOnly: false }),
    });
  }
  if (filters.maxPriceCents !== undefined) {
    chips.push({
      key: "price",
      label: `Under $${(filters.maxPriceCents / 100).toFixed(0)}/hr`,
      clear: (f) => ({ ...f, maxPriceCents: undefined }),
    });
  }
  if (filters.maxDistanceMeters !== undefined) {
    chips.push({
      key: "dist",
      label:
        filters.maxDistanceMeters < 1600
          ? `Within ${Math.round(filters.maxDistanceMeters / 80)} min walk`
          : `Within ${(filters.maxDistanceMeters / 1609).toFixed(0)} mi`,
      clear: (f) => ({ ...f, maxDistanceMeters: undefined }),
    });
  }
  filters.parkingTypes.forEach((type) => {
    chips.push({
      key: `type-${type}`,
      label: PARKING_TYPES.find((t) => t.value === type)?.label ?? type,
      clear: (f) => ({ ...f, parkingTypes: f.parkingTypes.filter((t) => t !== type) }),
    });
  });
  filters.amenities.forEach((amenity) => {
    chips.push({
      key: `amenity-${amenity}`,
      label: AMENITIES.find((a) => a.value === amenity)?.label ?? amenity,
      clear: (f) => ({ ...f, amenities: f.amenities.filter((a) => a !== amenity) }),
    });
  });
  if (filters.minRating !== undefined) {
    chips.push({
      key: "rating",
      label: `${filters.minRating}+ stars`,
      clear: (f) => ({ ...f, minRating: undefined }),
    });
  }
  if (filters.vehicleSize) {
    chips.push({
      key: "vehicle",
      label: `Fits ${filters.vehicleSize}`,
      clear: (f) => ({ ...f, vehicleSize: undefined }),
    });
  }

  return chips;
}
