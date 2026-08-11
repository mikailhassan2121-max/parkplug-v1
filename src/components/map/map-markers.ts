import type L from "leaflet";
import { formatMoney } from "@/lib/format";

/**
 * Marker factory.
 *
 * Paid and free parking differ in colour *and* shape, so the distinction never
 * depends on colour perception alone. Every marker carries a real accessible
 * name — there is a matching list entry for each one.
 */

const PAID_CLASS =
  "grid place-items-center rounded-full px-2.5 h-8 min-w-[3.25rem] bg-brand-600 text-white " +
  "text-xs font-bold shadow-[0_2px_6px_rgba(3,39,35,0.35)] ring-2 ring-white " +
  "transition-transform duration-150";

const FREE_CLASS =
  "grid place-items-center h-8 w-8 bg-accent-500 text-white " +
  "shadow-[0_2px_6px_rgba(68,22,6,0.35)] ring-2 ring-white transition-transform duration-150";

export function paidMarkerIcon(
  leaflet: typeof L,
  priceCents: number,
  currency: string,
  selected: boolean,
): L.DivIcon {
  return leaflet.divIcon({
    className: "",
    html: `<span class="${PAID_CLASS} ${
      selected ? "bg-brand-800 scale-115 z-10" : ""
    }">${formatMoney(priceCents, currency)}</span>`,
    iconSize: [52, 32],
    iconAnchor: [26, 16],
  });
}

export function freeMarkerIcon(leaflet: typeof L, selected: boolean): L.DivIcon {
  // Diamond silhouette keeps free parking distinguishable from the paid pill.
  return leaflet.divIcon({
    className: "",
    html: `<span class="${FREE_CLASS} ${
      selected ? "bg-accent-700 scale-115 z-10" : ""
    }" style="border-radius:0.5rem;transform:rotate(45deg)">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
           style="transform:rotate(-45deg)" aria-hidden="true">
        <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8Z" />
      </svg>
    </span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export function clusterIcon(leaflet: typeof L, count: number, hasFree: boolean): L.DivIcon {
  const size = count > 50 ? 46 : count > 10 ? 40 : 34;
  return leaflet.divIcon({
    className: "",
    html: `<span class="grid place-items-center rounded-full font-bold text-white ring-2 ring-white
      shadow-[0_2px_8px_rgba(3,39,35,0.35)] ${hasFree ? "bg-ink-200" : "bg-brand-700"}"
      style="width:${size}px;height:${size}px;font-size:${size > 40 ? "0.85rem" : "0.75rem"}">${count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function destinationIcon(leaflet: typeof L): L.DivIcon {
  return leaflet.divIcon({
    className: "",
    html: `<span class="grid place-items-center h-9 w-9 rounded-full bg-ink-200 text-white ring-3 ring-white shadow-[0_2px_8px_rgba(3,39,35,0.4)]">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 10c0 4.4-5.4 9.6-7.4 11.3a1 1 0 0 1-1.2 0C9.4 19.6 4 14.4 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    </span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export function userLocationIcon(leaflet: typeof L): L.DivIcon {
  return leaflet.divIcon({
    className: "",
    html: `<span class="block h-4 w-4 rounded-full bg-info-600 ring-3 ring-white shadow-[0_0_0_6px_rgba(46,144,250,0.22)]"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}
