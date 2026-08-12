/**
 * Analytics derived strictly from real OccupancyEvent history — no
 * synthetic or sampled data. Two rollups:
 *
 *  - A 24h occupancy sparkline: occupancy % at 24 hourly checkpoints,
 *    reconstructed by replaying each space's real transition history (both
 *    OccupancyEvent.newStatus AND .previousStatus are used, so even the
 *    state *before* the first recorded event is a real recorded fact, not
 *    a guess). A space with no events at all is assumed to have held its
 *    current status for the whole window — the only assumption made, and
 *    an honest one: it's the best available truth when nothing changed.
 *
 *  - Busiest hour: the local hour-of-day (0-23, in the facility's own
 *    IANA timezone — a garage's "5pm rush" is a local-time concept, not a
 *    UTC one) with the most real occupancy-change events over the last 7
 *    days. MANUAL-source events (the offline sweeper's own corrections)
 *    are excluded — they're not driver activity.
 *
 * Sparkline timestamps are absolute UTC instants (unambiguous points in
 * real time); only "busiest hour" needs timezone conversion, via
 * Intl.DateTimeFormat with the facility's timezone — no date library
 * dependency needed for that alone.
 */
import type { OccupancyEvent, SpaceStatus } from "@prisma/client";

const HOURS_IN_WINDOW = 24;
const BUSIEST_HOUR_LOOKBACK_DAYS = 7;

export type SparklinePoint = { at: string; occupancyPct: number };
export type BusiestHour = { hour: number; label: string; eventCount: number } | null;

export type FacilityAnalytics = {
  timezone: string;
  hasData: boolean;
  sparkline: SparklinePoint[];
  busiestHour: BusiestHour;
};

type SpaceForAnalytics = { id: string; status: SpaceStatus };
type EventForAnalytics = Pick<OccupancyEvent, "spaceId" | "previousStatus" | "newStatus" | "occurredAt" | "source">;

/**
 * Per space, the real known status at any point in time: every recorded
 * transition, plus the space's status just before its earliest event
 * (from that event's own previousStatus field).
 */
function buildTimeline(spaceId: string, currentStatus: SpaceStatus, events: EventForAnalytics[]) {
  const own = events.filter((e) => e.spaceId === spaceId).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  if (own.length === 0) {
    // No history at all — the only fact we have is the current status.
    return { transitions: [] as Array<{ at: number; status: SpaceStatus }>, earliestKnown: currentStatus };
  }
  return {
    transitions: own.map((e) => ({ at: e.occurredAt.getTime(), status: e.newStatus })),
    earliestKnown: own[0]!.previousStatus,
  };
}

function statusAt(timeline: ReturnType<typeof buildTimeline>, atMs: number): SpaceStatus {
  let status = timeline.earliestKnown;
  for (const t of timeline.transitions) {
    if (t.at > atMs) break;
    status = t.status;
  }
  return status;
}

function formatHourLabel(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:00 ${period}`;
}

export function computeFacilityAnalytics(
  timezone: string,
  spaces: SpaceForAnalytics[],
  events: EventForAnalytics[],
  now: Date = new Date(),
): FacilityAnalytics {
  const total = spaces.length;
  const timelines = spaces.map((s) => buildTimeline(s.id, s.status, events));

  const sparkline: SparklinePoint[] = [];
  for (let i = HOURS_IN_WINDOW - 1; i >= 0; i--) {
    const at = new Date(now.getTime() - i * 3600_000);
    const occupied = timelines.filter((tl) => statusAt(tl, at.getTime()) === "OCCUPIED").length;
    sparkline.push({
      at: at.toISOString(),
      occupancyPct: total > 0 ? Math.round((occupied / total) * 100) : 0,
    });
  }

  const lookbackCutoff = now.getTime() - BUSIEST_HOUR_LOOKBACK_DAYS * 86_400_000;
  const relevantEvents = events.filter((e) => e.source !== "MANUAL" && e.occurredAt.getTime() >= lookbackCutoff);

  const hourFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone });
  const countsByHour = new Map<number, number>();
  for (const event of relevantEvents) {
    // Intl gives "24" for midnight in some locales/environments instead of "0" — normalize.
    const raw = Number(hourFormatter.format(event.occurredAt));
    const hour = raw === 24 ? 0 : raw;
    countsByHour.set(hour, (countsByHour.get(hour) ?? 0) + 1);
  }

  let busiestHour: BusiestHour = null;
  for (const [hour, count] of countsByHour) {
    if (!busiestHour || count > busiestHour.eventCount) {
      busiestHour = { hour, label: formatHourLabel(hour), eventCount: count };
    }
  }

  return {
    timezone,
    hasData: events.length > 0,
    sparkline,
    busiestHour,
  };
}
