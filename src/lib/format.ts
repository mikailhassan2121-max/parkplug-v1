/**
 * Formatting helpers. Every value shown to a user goes through one of these so
 * currency, distance, and time read the same way across the whole product.
 */

export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    // Whole-dollar amounts read better without trailing zeros on price chips.
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Always shows cents. Used in price breakdowns where alignment matters. */
export function formatMoneyExact(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatRate(cents: number, currency = "USD"): string {
  return `${formatMoney(cents, currency)}/hr`;
}

export function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return `${Math.round(meters * 3.28084)} ft`;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function formatWalkingTime(minutes: number): string {
  if (minutes < 1) return "Under 1 min walk";
  return `${Math.round(minutes)} min walk`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = `${hours} hr${hours === 1 ? "" : "s"}`;
  return rest === 0 ? hourPart : `${hourPart} ${rest} min`;
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.max(
    0,
    Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000),
  );
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const dateYearFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});
const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });

export function formatDate(iso: string, withYear = false): string {
  const d = new Date(iso);
  return withYear ? dateYearFmt.format(d) : dateFmt.format(d);
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${dateFmt.format(d)}, ${timeFmt.format(d)}`;
}

export function formatWeekday(iso: string): string {
  return weekdayFmt.format(new Date(iso));
}

/**
 * Compact range: "Aug 2, 6:00 PM–10:00 PM" when both ends fall on the same
 * day, otherwise "Aug 2, 6:00 PM – Aug 3, 9:00 AM".
 */
export function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${dateFmt.format(start)}, ${timeFmt.format(start)}–${timeFmt.format(end)}`;
  }
  return `${dateFmt.format(start)}, ${timeFmt.format(start)} – ${dateFmt.format(end)}, ${timeFmt.format(end)}`;
}

/** "12 minutes ago", "3 hours ago", "Yesterday". Never hardcoded. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);

  const minutes = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);

  if (minutes < 1) return future ? "In under a minute" : "Just now";
  if (minutes < 60) return future ? `In ${minutes} min` : `${minutes} min ago`;
  if (hours < 24) return future ? `In ${hours} hr` : `${hours} hr ago`;
  if (days === 1) return future ? "Tomorrow" : "Yesterday";
  if (days < 30) return future ? `In ${days} days` : `${days} days ago`;
  return formatDate(iso, true);
}

/** Remaining time before a community report expires. */
export function formatTimeRemaining(iso: string, now: Date = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  if (diffMs <= 0) return "Expired";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr left`;
  return `${Math.round(hours / 24)} days left`;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? "";
}

/** Converts "18:00" to "6:00 PM". */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** Splits a `datetime-local` value into the ISO string the API expects. */
export function toIso(dateValue: string, timeValue: string): string | undefined {
  if (!dateValue || !timeValue) return undefined;
  const parsed = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function toDateInput(iso: string): string {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function toTimeInput(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/** "3 spaces reported" — count and noun together, for screen-reader clarity. */
export function countLabel(count: number, singular: string, plural?: string): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}
