"use client";

import { useEffect, useRef, useState } from "react";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TILE_URL, TILE_ATTRIBUTION, TILE_SUBDOMAINS } from "@/components/map/parking-map";
import { Spinner } from "@/components/ui/feedback";
import type { FacilitySummary } from "@/lib/sensor-types";

function facilityIconHtml(facility: FacilitySummary, selected: boolean): string {
  // Cyan pulse ring marks every sensor-enabled facility as LIVE; the core
  // dot's color is the current dominant status — never the pulse alone.
  const core =
    facility.total === 0
      ? "bg-ink-400"
      : facility.available > 0
        ? "bg-success-500"
        : facility.occupied === facility.total
          ? "bg-danger-500"
          : "bg-ink-400";
  return `
    <span class="relative flex ${selected ? "h-11 w-11" : "h-9 w-9"} items-center justify-center transition-all duration-150">
      <span class="absolute inset-0 rounded-full bg-pp-live/40 animate-pulse-live"></span>
      <span class="relative grid h-full w-full place-items-center rounded-full border-2 border-pp-live bg-pp-bg-elevated shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
        <span class="h-3 w-3 rounded-full ${core}"></span>
      </span>
    </span>`;
}

export function FacilityLiveMap({
  facilities,
  selectedFacilityId,
  onSelect,
  center,
  zoom = 13,
}: {
  facilities: FacilitySummary[];
  selectedFacilityId: string | null;
  onSelect: (facilityId: string) => void;
  center: { lat: number; lng: number };
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const leafletRef = useRef<typeof L | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const leaflet = (await import("leaflet")).default;
        if (cancelled || !containerRef.current || mapRef.current) return;
        leafletRef.current = leaflet;

        const map = leaflet.map(containerRef.current, {
          center: [center.lat, center.lng],
          zoom,
          zoomControl: false,
        });
        leaflet
          .tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19, subdomains: TILE_SUBDOMAINS, detectRetina: true })
          .on("tileerror", () => !cancelled && setStatus("error"))
          .addTo(map);
        leaflet.control.zoom({ position: "bottomright" }).addTo(map);

        layerRef.current = leaflet.layerGroup().addTo(map);
        mapRef.current = map;
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Only initialize once — center/zoom changes after mount don't re-create the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const layer = layerRef.current;
    if (!leaflet || !layer || status !== "ready") return;
    layer.clearLayers();

    for (const facility of facilities) {
      const selected = facility.facilityId === selectedFacilityId;
      const icon = leaflet.divIcon({
        className: "",
        html: facilityIconHtml(facility, selected),
        iconSize: selected ? [44, 44] : [36, 36],
        iconAnchor: selected ? [22, 22] : [18, 18],
      });
      const marker = leaflet.marker([facility.location.lat, facility.location.lng], {
        icon,
        alt: `${facility.name}, ${facility.available} of ${facility.total} spaces available`,
        keyboard: true,
      });
      marker.on("click", () => onSelect(facility.facilityId));
      marker.addTo(layer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilities, selectedFacilityId, status]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" role="application" aria-label="Live parking facility map" />
      {status === "loading" ? (
        <div className="absolute inset-0 grid place-items-center bg-pp-bg">
          <Spinner label="Loading map" />
        </div>
      ) : null}
      {status === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-pp-bg px-6 text-center">
          <p className="text-sm text-ink-400">The map could not load. The list below has the same facilities.</p>
        </div>
      ) : null}
    </div>
  );
}
