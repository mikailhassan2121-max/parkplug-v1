"use client";

import { cn } from "@/lib/cn";
import { formatSecondsAgo } from "@/lib/format";
import { useNow } from "@/lib/use-now";

/**
 * "Sensor-powered" live indicator: a teal dot with a single soft breath
 * (not a repeating neon pulse) plus text, never color alone. `live`
 * reflects the SSE connection specifically — polling fallback still shows
 * fresh data, just without the animated dot, so the label always matches
 * what's actually happening under the hood.
 */
export function LiveBadge({ live, updatedAt, className }: { live: boolean; updatedAt: string; className?: string }) {
  const now = useNow(1000);
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs font-semibold", className)}>
      <span
        className={cn("h-2 w-2 rounded-full", live ? "bg-teal animate-live-dot" : "bg-ink-400")}
        aria-hidden="true"
      />
      <span className={live ? "text-teal" : "text-ink-500"}>{live ? "Live" : "Reconnecting"}</span>
      <span className="text-ink-500" aria-live="polite">
        · Updated {formatSecondsAgo(updatedAt, now)}
      </span>
    </span>
  );
}
