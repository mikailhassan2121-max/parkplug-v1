"use client";

/**
 * Browser-backed persistence adapter.
 *
 * This is the default data source until `NEXT_PUBLIC_API_BASE_URL` is set, at
 * which point the HTTP adapter takes over. Nothing here is pre-seeded: every
 * record it returns is one the signed-in person actually created, so no screen
 * ever shows invented listings, reviews, counts, or earnings.
 */

const PREFIX = "parkplug:v1:";

function key(name: string) {
  return `${PREFIX}${name}`;
}

function canUseStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const probe = `${PREFIX}probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    // Private browsing or blocked storage.
    return false;
  }
}

/** In-memory fallback so the app still works when storage is unavailable. */
const memory = new Map<string, string>();

function readRaw(name: string): string | null {
  if (canUseStorage()) return window.localStorage.getItem(key(name));
  return memory.get(key(name)) ?? null;
}

function writeRaw(name: string, value: string): void {
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(key(name), value);
      return;
    } catch {
      // Quota exceeded — fall through to memory so the write is not lost.
    }
  }
  memory.set(key(name), value);
}

export function readCollection<T>(name: string): T[] {
  const raw = readRaw(name);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeCollection<T>(name: string, items: T[]): void {
  writeRaw(name, JSON.stringify(items));
}

export function readRecord<T>(name: string): T | null {
  const raw = readRaw(name);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeRecord<T>(name: string, value: T | null): void {
  if (value === null) {
    if (canUseStorage()) window.localStorage.removeItem(key(name));
    memory.delete(key(name));
    return;
  }
  writeRaw(name, JSON.stringify(value));
}

/** Notifies open tabs and in-page subscribers that a collection changed. */
const subscribers = new Map<string, Set<() => void>>();

export function subscribe(name: string, fn: () => void): () => void {
  const set = subscribers.get(name) ?? new Set();
  set.add(fn);
  subscribers.set(name, set);
  return () => set.delete(fn);
}

export function notify(name: string): void {
  subscribers.get(name)?.forEach((fn) => fn());
}

export function mutateCollection<T>(name: string, fn: (items: T[]) => T[]): T[] {
  const next = fn(readCollection<T>(name));
  writeCollection(name, next);
  notify(name);
  return next;
}

/** Collision-resistant id without pulling in a uuid dependency. */
export function newId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${random}`;
}

/** Booking reference shown to users, e.g. "PP-4KD9-27XA". */
export function newReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = (n: number) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `PP-${block(4)}-${block(4)}`;
}

export const COLLECTIONS = {
  session: "session",
  users: "users",
  vehicles: "vehicles",
  listings: "listings",
  reservations: "reservations",
  reports: "reports",
  reviews: "reviews",
  saved: "saved",
  notifications: "notifications",
  supportTickets: "support-tickets",
  cookiePrefs: "cookie-preferences",
  reportVotes: "report-votes",
} as const;
