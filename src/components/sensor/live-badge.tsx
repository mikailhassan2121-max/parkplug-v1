"use client";

import { cn } from "@/lib/cn";
import { formatSecondsAgo } from "@/lib/format";
import { useNow } from "@/lib/use-now";

/**
 * "Sensor-powered" live indicator: a cyan pulse dot plus text, never color
 * alone. `live` reflects the SSE connection specifically — polling fallback
 * still shows fresh data, just without the pulse, so the label always
 * matches what's actually happening under the hood.
 */
export function LiveBadge({ live, updatedAt, className }: { live: boolean; updatedAt: string; className?: string }) {
  const now = useNow(1000);
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs font-semibold", className)}>
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        {live ? (
          <span className="absolute inset-0 animate-pulse-live rounded-full bg-pp-live" />
        ) : null}
        <span className={cn("relative h-2.5 w-2.5 rounded-full", live ? "bg-pp-live" : "bg-ink-400")} />
      </span>
      <span className={live ? "text-pp-live" : "text-ink-500"}>{live ? "Live" : "Reconnecting"}</span>
      <span className="text-ink-500" aria-live="polite">
        · Updated {formatSecondsAgo(updatedAt, now)}
      </span>
    </span>
  );
}
