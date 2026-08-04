import type { ListingAvailabilityWindow } from "./types";

/**
 * Availability windows are UTC day-of-week + "HH:mm" ranges that never cross
 * midnight (matches how the host enters them and how search's "available
 * now" filter already reads them — see server/src/routes/search.routes.ts,
 * nowWithinWeek). "HH:mm" -> minutes since UTC midnight.
 */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * True only if [startAt, endAt) is entirely covered by the listing's posted
 * availability. Walks the reservation day by day (UTC) so a window spanning
 * midnight or several calendar days needs every day-segment covered by its
 * own day-of-week window, not just the overall start/end time-of-day.
 */
export function isWithinAvailability(
  startAt: string,
  endAt: string,
  availability: ListingAvailabilityWindow[],
): boolean {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  if (!(end.getTime() > start.getTime()) || availability.length === 0) return false;

  let cursor = start;
  while (cursor.getTime() < end.getTime()) {
    const dayStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate()));
    const nextDayStart = new Date(dayStart.getTime() + 24 * 3600_000);
    const segmentEnd = end.getTime() < nextDayStart.getTime() ? end : nextDayStart;

    const segmentStartMin = Math.round((cursor.getTime() - dayStart.getTime()) / 60_000);
    const segmentEndMin = Math.round((segmentEnd.getTime() - dayStart.getTime()) / 60_000);
    const dayOfWeek = cursor.getUTCDay();

    const covered = availability.some(
      (w) => w.dayOfWeek === dayOfWeek && toMinutes(w.startTime) <= segmentStartMin && toMinutes(w.endTime) >= segmentEndMin,
    );
    if (!covered) return false;

    cursor = segmentEnd;
  }
  return true;
}

/**
 * Finds the earliest [start, start + durationMinutes) window at or after
 * `earliestStart` that fits entirely inside one posted availability window —
 * used to pre-fill the booking form with a time that is actually bookable,
 * instead of "now + a fixed offset" regardless of the listing's hours.
 * Searches up to 8 days ahead; returns null if nothing fits (an
 * unusually restrictive schedule) so the caller can fall back sensibly.
 */
export function nextAvailableWindow(
  earliestStart: Date,
  durationMinutes: number,
  availability: ListingAvailabilityWindow[],
): { start: Date; end: Date } | null {
  if (availability.length === 0) return null;

  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const dayStart = new Date(
      Date.UTC(earliestStart.getUTCFullYear(), earliestStart.getUTCMonth(), earliestStart.getUTCDate() + dayOffset),
    );
    const dayOfWeek = dayStart.getUTCDay();
    const windows = availability
      .filter((w) => w.dayOfWeek === dayOfWeek)
      .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    for (const w of windows) {
      const windowStart = new Date(dayStart.getTime() + toMinutes(w.startTime) * 60_000);
      const windowEnd = new Date(dayStart.getTime() + toMinutes(w.endTime) * 60_000);
      const candidateStart = windowStart.getTime() > earliestStart.getTime() ? windowStart : earliestStart;
      if (candidateStart.getTime() >= windowEnd.getTime()) continue;

      const candidateEnd = new Date(candidateStart.getTime() + durationMinutes * 60_000);
      if (candidateEnd.getTime() <= windowEnd.getTime()) {
        return { start: candidateStart, end: candidateEnd };
      }
    }
  }
  return null;
}
