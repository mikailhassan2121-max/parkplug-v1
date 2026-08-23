"use client";

import { formatTime } from "@/lib/format";
import { IconChart } from "@/components/ui/icons";
import type { FacilityAnalytics } from "@/lib/sensor-types";

const CHART_WIDTH = 520;
const CHART_HEIGHT = 180;
const PAD_LEFT = 34;
const PAD_BOTTOM = 22;
const PAD_TOP = 10;
const PAD_RIGHT = 8;
const PLOT_WIDTH = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

const Y_TICKS = [0, 25, 50, 75, 100];

function plot(points: FacilityAnalytics["sparkline"]) {
  const stepX = PLOT_WIDTH / Math.max(points.length - 1, 1);
  return points.map((p, i) => ({
    x: PAD_LEFT + i * stepX,
    y: PAD_TOP + PLOT_HEIGHT - (p.occupancyPct / 100) * PLOT_HEIGHT,
    point: p,
  }));
}

/**
 * 24h occupancy trend + busiest hour, derived from real OccupancyEvent
 * history. A real chart — labelled axes, a percent scale, and time-of-day
 * ticks — not a bare sparkline; every value is also spelled out in text so
 * nothing here depends on reading the line alone. Never amber (that stays
 * reserved for community-reported free parking).
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

  const plotted = plot(analytics.sparkline);
  const path = plotted.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const latest = analytics.sparkline[analytics.sparkline.length - 1];
  const earliest = analytics.sparkline[0];

  // A handful of evenly-spaced time labels along the x-axis — every point
  // would overlap illegibly at this width.
  const tickCount = Math.min(5, plotted.length);
  const xTicks =
    tickCount > 1
      ? Array.from({ length: tickCount }, (_, i) => {
          const idx = Math.round((i * (plotted.length - 1)) / (tickCount - 1));
          return plotted[idx]!;
        })
      : plotted;

  return (
    <div className="rounded-card border border-ink-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-ink-900">Occupancy, last 24 hours</h3>
        {latest ? (
          <span className="text-xs font-semibold text-teal">{latest.occupancyPct}% occupied now</span>
        ) : null}
      </div>

      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="mt-3 h-40 w-full"
        role="img"
        aria-label={`Occupancy trend over the last 24 hours, from ${earliest?.occupancyPct ?? 0}% to ${latest?.occupancyPct ?? 0}%`}
      >
        {Y_TICKS.map((tick) => {
          const y = PAD_TOP + PLOT_HEIGHT - (tick / 100) * PLOT_HEIGHT;
          return (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                x2={CHART_WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth="1"
              />
              <text x={PAD_LEFT - 6} y={y} textAnchor="end" dominantBaseline="middle" className="fill-ink-500 text-[9px]">
                {tick}%
              </text>
            </g>
          );
        })}

        {xTicks.map((tick, i) => (
          <text
            key={i}
            x={tick.x}
            y={CHART_HEIGHT - 4}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            className="fill-ink-500 text-[9px]"
          >
            {formatTime(tick.point.at)}
          </text>
        ))}

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
