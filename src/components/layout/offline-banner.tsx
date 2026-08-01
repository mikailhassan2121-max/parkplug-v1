"use client";

import { useOnlineStatus } from "@/lib/use-async";
import { IconWifiOff } from "@/components/ui/icons";

/**
 * Sitewide offline notice. Sits above the header so it is visible from any
 * scroll position, and tells the user what still works while disconnected.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-80 flex items-center justify-center gap-2.5 bg-ink-900 px-4 py-2.5 text-center text-sm font-medium text-white"
    >
      <IconWifiOff className="shrink-0 text-base" aria-hidden="true" />
      <span>
        You are offline. Search, booking, and uploads need a connection — anything
        you have typed is kept.
      </span>
    </div>
  );
}
