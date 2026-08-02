"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/cn";
import type { Coordinates, FreeParkingReport, ListingSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { IconCrosshair, IconRefresh } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/feedback";
import {
  clusterIcon,
  destinationIcon,
  freeMarkerIcon,
  paidMarkerIcon,
  userLocationIcon,
} from "./map-markers";

const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type MapSelection =
  | { kind: "listing"; id: string }
  | { kind: "report"; id: string }
  | null;

type Cluster = {
  key: string;
  center: Coordinates;
  listings: ListingSummary[];
  reports: FreeParkingReport[];
};

/**
 * Groups nearby points into a single marker so dense areas stay readable and
 * we never render hundreds of individual DOM nodes.
 */
function buildClusters(
  listings: ListingSummary[],
  reports: FreeParkingReport[],
  zoom: number,
): Cluster[] {
  // Below this zoom every point is distinct enough to stand on its own.
  if (zoom >= 16) {
    return [
      ...listings.map((l) => ({
        key: `l:${l.id}`,
        center: l.location.center,
        listings: [l],
        reports: [],
      })),
      ...reports.map((r) => ({
        key: `r:${r.id}`,
        center: r.location.center,
        listings: [],
        reports: [r],
      })),
    ];
  }

  const cellSize = zoom >= 14 ? 0.0035 : zoom >= 12 ? 0.012 : 0.05;
  const buckets = new Map<string, Cluster>();

  function put(point: Coordinates, listing?: ListingSummary, report?: FreeParkingReport) {
    const key = `${Math.floor(point.lat / cellSize)}:${Math.floor(point.lng / cellSize)}`;
    const existing = buckets.get(key);
    if (existing) {
      if (listing) existing.listings.push(listing);
      if (report) existing.reports.push(report);
      return;
    }
    buckets.set(key, {
      key,
      center: point,
      listings: listing ? [listing] : [],
      reports: report ? [report] : [],
    });
  }

  listings.forEach((l) => put(l.location.center, l));
  reports.forEach((r) => put(r.location.center, undefined, r));
  return [...buckets.values()];
}

export type ParkingMapProps = {
  center: Coordinates;
  zoom?: number;
  listings?: ListingSummary[];
  reports?: FreeParkingReport[];
  selected?: MapSelection;
  onSelect?: (selection: MapSelection) => void;
  /** Called after the user pans or zooms, enabling "Search this area". */
  onBoundsChange?: (center: Coordinates, zoom: number) => void;
  destination?: Coordinates;
  userLocation?: Coordinates;
  /** Renders a translucent circle showing the approximate listing area. */
  privacyCircle?: { center: Coordinates; radiusMeters: number };
  className?: string;
  interactive?: boolean;
  showRecenter?: boolean;
  /** Accessible description; the list view is the non-visual equivalent. */
  ariaLabel?: string;
};

export function ParkingMap({
  center,
  zoom = 14,
  listings = [],
  reports = [],
  selected = null,
  onSelect,
  onBoundsChange,
  destination,
  userLocation,
  privacyCircle,
  className,
  interactive = true,
  showRecenter = true,
  ariaLabel = "Map of parking near your destination",
}: ParkingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const leafletRef = useRef<typeof L | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const uid = useId();

  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  /* ---------------------------- Initialise ---------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Leaflet is loaded on demand so it never blocks first paint.
        const leaflet = (await import("leaflet")).default;
        if (cancelled || !containerRef.current || mapRef.current) return;

        leafletRef.current = leaflet;

        const map = leaflet.map(containerRef.current, {
          center: [center.lat, center.lng],
          zoom,
          zoomControl: false,
          attributionControl: true,
          dragging: interactive,
          scrollWheelZoom: false, // avoids hijacking page scroll
          doubleClickZoom: interactive,
          touchZoom: interactive,
          // Leaflet's own keyboard handling gives arrow-key panning.
          keyboard: interactive,
        });

        leaflet
          .tileLayer(TILE_URL, {
            attribution: TILE_ATTRIBUTION,
            maxZoom: 19,
            // Serve retina tiles where the provider supports them.
            detectRetina: true,
          })
          .on("tileerror", () => {
            if (!cancelled) setStatus("error");
          })
          .addTo(map);

        if (interactive) {
          leaflet.control.zoom({ position: "bottomright" }).addTo(map);
          // Scroll zoom only after a deliberate click into the map.
          map.on("click", () => map.scrollWheelZoom.enable());
          map.on("mouseout", () => map.scrollWheelZoom.disable());
        }

        layerRef.current = leaflet.layerGroup().addTo(map);
        overlayRef.current = leaflet.layerGroup().addTo(map);

        map.on("moveend", () => {
          const c = map.getCenter();
          setCurrentZoom(map.getZoom());
          onBoundsChangeRef.current?.({ lat: c.lat, lng: c.lng }, map.getZoom());
        });

        mapRef.current = map;
        setStatus("ready");
        // Leaflet mis-measures inside flex/grid parents until a resize tick.
        requestAnimationFrame(() => map.invalidateSize());
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void init();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Deliberately runs once — subsequent prop changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------- Recentre ------------------------------- */

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const current = map.getCenter();
    const moved =
      Math.abs(current.lat - center.lat) > 0.0004 || Math.abs(current.lng - center.lng) > 0.0004;
    if (moved) map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  }, [center.lat, center.lng]);

  /* ---------------------------- Markers ------------------------------- */

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    const layer = layerRef.current;
    if (!map || !leaflet || !layer) return;

    layer.clearLayers();
    const clusters = buildClusters(listings, reports, currentZoom);

    clusters.forEach((cluster) => {
      const total = cluster.listings.length + cluster.reports.length;

      if (total > 1) {
        const marker = leaflet.marker([cluster.center.lat, cluster.center.lng], {
          icon: clusterIcon(leaflet, total, cluster.reports.length > 0),
          keyboard: true,
          alt: `${total} parking options in this area. Activate to zoom in.`,
        });
        marker.on("click", () => {
          map.setView([cluster.center.lat, cluster.center.lng], Math.min(map.getZoom() + 2, 18), {
            animate: true,
          });
        });
        marker.addTo(layer);
        return;
      }

      const listing = cluster.listings[0];
      if (listing) {
        const isSelected = selected?.kind === "listing" && selected.id === listing.id;
        const marker = leaflet.marker([listing.location.center.lat, listing.location.center.lng], {
          icon: paidMarkerIcon(leaflet, listing.pricePerHourCents, listing.currency, isSelected),
          keyboard: true,
          alt: `${listing.title}, reservable parking. Activate to preview.`,
          zIndexOffset: isSelected ? 1000 : 0,
        });
        marker.on("click", () => onSelectRef.current?.({ kind: "listing", id: listing.id }));
        marker.addTo(layer);
        return;
      }

      const report = cluster.reports[0];
      if (report) {
        const isSelected = selected?.kind === "report" && selected.id === report.id;
        const marker = leaflet.marker([report.location.center.lat, report.location.center.lng], {
          icon: freeMarkerIcon(leaflet, isSelected),
          keyboard: true,
          alt: `Community-reported free parking near ${report.location.label}. Availability not guaranteed. Activate to preview.`,
          zIndexOffset: isSelected ? 1000 : 0,
        });
        marker.on("click", () => onSelectRef.current?.({ kind: "report", id: report.id }));
        marker.addTo(layer);
      }
    });
  }, [listings, reports, selected, currentZoom]);

  /* ------------------- Destination, user, privacy circle -------------- */

  useEffect(() => {
    const leaflet = leafletRef.current;
    const overlay = overlayRef.current;
    if (!leaflet || !overlay) return;

    overlay.clearLayers();

    if (privacyCircle) {
      leaflet
        .circle([privacyCircle.center.lat, privacyCircle.center.lng], {
          radius: privacyCircle.radiusMeters,
          color: "#184878",
          weight: 2,
          fillColor: "#2f6ba4",
          fillOpacity: 0.16,
          interactive: false,
        })
        .addTo(overlay);
    }
    if (destination) {
      leaflet
        .marker([destination.lat, destination.lng], {
          icon: destinationIcon(leaflet),
          interactive: false,
          alt: "Your destination",
        })
        .addTo(overlay);
    }
    if (userLocation) {
      leaflet
        .marker([userLocation.lat, userLocation.lng], {
          icon: userLocationIcon(leaflet),
          interactive: false,
          alt: "Your current location",
        })
        .addTo(overlay);
    }
  }, [destination, userLocation, privacyCircle]);

  const recenter = useCallback(() => {
    mapRef.current?.setView([center.lat, center.lng], zoom, { animate: true });
  }, [center.lat, center.lng, zoom]);

  return (
    <div className={cn("relative isolate overflow-hidden bg-ink-100", className)}>
      <div
        ref={containerRef}
        id={`map-${uid}`}
        role="application"
        aria-label={ariaLabel}
        className="h-full w-full"
      />

      {status === "loading" ? (
        <div className="absolute inset-0 grid place-items-center bg-ink-100">
          <Spinner label="Loading map" size="lg" />
        </div>
      ) : null}

      {status === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-ink-100 px-6">
          <div className="max-w-sm text-center">
            <h3 className="text-base font-bold text-ink-900">Map could not load</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
              The map service did not respond. The list of parking options below
              has everything the map shows.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              leadingIcon={<IconRefresh />}
              onClick={() => window.location.reload()}
            >
              Reload
            </Button>
          </div>
        </div>
      ) : null}

      {showRecenter && status === "ready" && interactive ? (
        <button
          type="button"
          onClick={recenter}
          className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-xl border border-ink-200
                     bg-white text-ink-700 shadow-e2 transition-colors hover:bg-ink-50"
          aria-label="Recenter map on your search area"
        >
          <IconCrosshair className="text-lg" />
        </button>
      ) : null}
    </div>
  );
}
