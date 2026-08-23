"use client";

import { IconChart } from "@/components/ui/icons";
import type { FacilityAnalytics } from "@/lib/sensor-types";

const SVG_WIDTH = 280;
const SVG_HEIGHT = 56;

function sparklinePath(points: FacilityAnalytics["sparkline"]): string {
  if (points.length === 0) return "";
  const stepX = SVG_WIDTH / Math.max(points.length - 1, 1);
  return points
    .map((p, i) => {
      const x = i * stepX;
      const y = SVG_HEIGHT - (p.occupancyPct / 100) * SVG_HEIGHT;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * 24h occupancy trend + busiest hour, derived from real OccupancyEvent
 * history — never amber (that stays reserved for community-reported free
 * parking) and never color alone for anything that matters: the numbers
 * are always spelled out in text next to the line.
 */
export function AnalyticsPanel({ analytics }: { analytics: FacilityAnalytics }) {
  if (!analytics.hasData) {
    return (
      <div className="rounded-card border border-dashed border-ink-300 bg-ink-50/50 p-5 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-xl text-ink-400">
          <IconChart aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-ink-800">Data is still accumulating</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">
          Occupancy trends and busiest-hour will appear here once this facility has recorded sensor activity.
        </p>
      </div>
    );
  }

  const path = sparklinePath(analytics.sparkline);
  const latest = analytics.sparkline[analytics.sparkline.length - 1];
  const earliest = analytics.sparkline[0];

  return (
    <div className="rounded-card border border-ink-200 bg-ink-50 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-ink-900">Occupancy, last 24h</h3>
        {latest ? <span className="text-xs font-semibold text-teal">{latest.occupancyPct}% now</span> : null}
      </div>

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="mt-3 h-14 w-full"
        role="img"
        aria-label={`Occupancy trend over the last 24 hours, from ${earliest?.occupancyPct ?? 0}% to ${latest?.occupancyPct ?? 0}%`}
      >
        <path d={path} fill="none" stroke="var(--color-teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="mt-4 border-t border-ink-200 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Busiest hour</p>
        {analytics.busiestHour ? (
          <p className="mt-1 text-sm text-ink-800">
            <span className="font-bold text-ink-950">{analytics.busiestHour.label}</span>{" "}
            <span className="text-ink-500">
              ({analytics.busiestHour.eventCount} {analytics.busiestHour.eventCount === 1 ? "change" : "changes"}, local time
              — {analytics.timezone})
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-500">Not enough recent activity to tell yet.</p>
        )}
      </div>
    </div>
  );
}
