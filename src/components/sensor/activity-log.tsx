"use client";

import { cn } from "@/lib/cn";
import { formatSecondsAgo } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { SPACE_STATUS_LABEL, type OccupancyEvent } from "@/lib/sensor-types";
import { IconBolt, IconCar, IconSettings } from "@/components/ui/icons";

const SOURCE_ICON = { SENSOR: IconBolt, SIMULATOR: IconCar, MANUAL: IconSettings } as const;
const SOURCE_LABEL = { SENSOR: "Sensor", SIMULATOR: "Simulator", MANUAL: "System" } as const;

/** Real activity only — reads straight from OccupancyEvent, no invented history. */
export function ActivityLog({ events }: { events: OccupancyEvent[] }) {
  const now = useNow(1000);

  if (events.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-ink-500">
        No activity yet. Occupancy changes will appear here as sensors report in.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {events.map((event) => {
        const Icon = SOURCE_ICON[event.source];
        return (
          <li
            key={event.id}
            className="flex items-start gap-3 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5 text-sm"
          >
            <span
              className={cn(
                "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full",
                event.source === "SIMULATOR" ? "bg-brand-50 text-teal" : "bg-ink-100 text-ink-500",
              )}
            >
              <Icon className="text-sm" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-ink-900">
                <span className="font-bold">{event.displayName}</span>{" "}
                {SPACE_STATUS_LABEL[event.previousStatus].toLowerCase()} →{" "}
                <span className="font-semibold">{SPACE_STATUS_LABEL[event.newStatus].toLowerCase()}</span>
              </p>
              <p className="mt-0.5 text-2xs text-ink-500">
                {SOURCE_LABEL[event.source]} · {formatSecondsAgo(event.occurredAt, now)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
