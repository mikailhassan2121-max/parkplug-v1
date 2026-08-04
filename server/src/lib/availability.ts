export type AvailabilityWindow = { dayOfWeek: number; startTime: string; endTime: string };

/**
 * Availability windows are UTC day-of-week + "HH:mm" ranges that never cross
 * midnight (matches how the host enters them and how search's "available
 * now" filter already reads them — see routes/search.routes.ts,
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
 *
 * Mirrors src/lib/availability.ts on the frontend — kept in sync deliberately
 * rather than shared, since the two run in separate TypeScript projects.
 */
export function isWithinAvailability(startAt: Date, endAt: Date, availability: AvailabilityWindow[]): boolean {
  if (!(endAt.getTime() > startAt.getTime()) || availability.length === 0) return false;

  let cursor = startAt;
  while (cursor.getTime() < endAt.getTime()) {
    const dayStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate()));
    const nextDayStart = new Date(dayStart.getTime() + 24 * 3600_000);
    const segmentEnd = endAt.getTime() < nextDayStart.getTime() ? endAt : nextDayStart;

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
