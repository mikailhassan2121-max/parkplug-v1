"use client";

/**
 * The single API surface the UI talks to.
 *
 * Two adapters sit behind it. When `NEXT_PUBLIC_API_BASE_URL` is set every call
 * is proxied to that server; otherwise the browser-local adapter handles it so
 * the product is fully operable before the backend lands. Neither adapter ever
 * invents a record — an unconnected ParkPlugs shows genuine empty states.
 */

import { business, paymentsConfigured } from "@/config/business";
import { distanceMeters, toApproximateLocation, walkingMinutes } from "@/lib/geo";
import { minutesBetween } from "@/lib/format";
import type {
  AppNotification,
  Conversation,
  DriverReviewScores,
  EarningsTransaction,
  ExactAddress,
  FreeParkingReport,
  HostEarnings,
  Listing,
  ListingSummary,
  Message,
  PayoutSetupState,
  Reservation,
  Review,
  SearchQuery,
  SearchResults,
  Vehicle,
} from "@/lib/types";
import { fail, ok, type ApiErrorCode, type ApiResult } from "./result";
import { quote } from "./pricing";
import {
  COLLECTIONS,
  mutateCollection,
  newId,
  newReference,
  readCollection,
  readRecord,
  writeRecord,
  notify,
} from "./store";

/**
 * Bearer-token fallback for cross-site auth. The frontend (Netlify) and API
 * (Railway) are on different root domains, so some browsers block the
 * session cookie outright regardless of SameSite (Safari ITP, Firefox ETP,
 * privacy extensions). Sign-in/sign-up return the session id as
 * `sessionToken`; it's stored here and replayed as `Authorization: Bearer`
 * on every request so auth keeps working even when the cookie doesn't land.
 */
function getStoredToken(): string | null {
  return readRecord<string>(COLLECTIONS.sessionToken);
}
function setStoredToken(token: string): void {
  writeRecord(COLLECTIONS.sessionToken, token);
}
function clearStoredToken(): void {
  writeRecord(COLLECTIONS.sessionToken, null);
}

export * from "./result";
export { quote, estimateHostEarnings } from "./pricing";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
export const usingRemoteApi = Boolean(API_BASE);

/** Simulated round-trip so loading states are exercised, not skipped. */
const LATENCY_MS = 220;
function settle<T>(value: T, ms = LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/* -------------------------------------------------------------------------
   HTTP adapter
   ------------------------------------------------------------------------- */

async function request<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init?.timeoutMs ?? 15000);
  try {
    const token = getStoredToken();
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      // A dead/revoked token would otherwise be replayed on every request
      // forever — drop it so the UI falls back to a clean signed-out state.
      if (response.status === 401 && token) clearStoredToken();

      const body = await response.json().catch(() => ({}) as Record<string, unknown>);
      const message = typeof body.message === "string" ? body.message : response.statusText;
      const fieldErrors = body.fieldErrors as Record<string, string> | undefined;

      // A few error codes (payment_failed, payment_unavailable, upload_failed)
      // have no HTTP status of their own — the server sets an explicit `code`
      // in the body for those, which wins over the status-derived guess.
      const explicitCodes: ApiErrorCode[] = ["payment_failed", "payment_unavailable", "host_not_ready", "upload_failed"];
      const bodyCode = typeof body.code === "string" ? (body.code as ApiErrorCode) : undefined;

      const codeByStatus = {
        400: "validation",
        401: "unauthorized",
        402: "payment_unavailable",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        422: "upload_failed",
        429: "rate_limited",
      } as const;
      const code =
        (bodyCode && explicitCodes.includes(bodyCode) ? bodyCode : undefined) ??
        codeByStatus[response.status as keyof typeof codeByStatus] ??
        (response.status >= 500 ? "server" : "unknown");
      return fail(code, message, {
        fieldErrors,
        reference: response.headers.get("x-request-id") ?? undefined,
      });
    }

    return ok((await response.json()) as T);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return fail("timeout", "The request timed out.");
    }
    return fail("network", "We could not reach ParkPlugs.");
  } finally {
    clearTimeout(timer);
  }
}

/* -------------------------------------------------------------------------
   Session
   ------------------------------------------------------------------------- */

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  avatarUrl?: string;
  isHost: boolean;
  createdAt: string;
  notificationPrefs: {
    reservationUpdates: boolean;
    reminders: boolean;
    messages: boolean;
    productNews: boolean;
    channelEmail: boolean;
    channelPush: boolean;
  };
};

type StoredUser = SessionUser & { passwordHash: string };

/** Non-cryptographic digest — the real adapter never stores a password. */
async function digest(value: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(`pp:${value}`);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return `plain:${value}`;
}

export const auth = {
  async getSession(): Promise<ApiResult<SessionUser | null>> {
    if (API_BASE) return request<SessionUser | null>("/auth/session");
    const id = readRecord<string>(COLLECTIONS.session);
    if (!id) return ok(null);
    const user = readCollection<StoredUser>(COLLECTIONS.users).find((u) => u.id === id);
    if (!user) return ok(null);
    const { passwordHash: _ignored, ...rest } = user;
    void _ignored;
    return ok(rest);
  },

  async signUp(input: {
    fullName: string;
    email: string;
    password: string;
  }): Promise<ApiResult<SessionUser>> {
    if (API_BASE) {
      const result = await request<SessionUser & { sessionToken?: string }>("/auth/sign-up", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (result.ok) {
        const { sessionToken, ...user } = result.data;
        if (sessionToken) setStoredToken(sessionToken);
        return ok(user);
      }
      return result;
    }

    const email = input.email.trim().toLowerCase();
    const existing = readCollection<StoredUser>(COLLECTIONS.users).find((u) => u.email === email);
    if (existing) {
      return settle(
        fail<SessionUser>("validation", "An account with this email already exists.", {
          fieldErrors: { email: "An account with this email already exists." },
          retryable: false,
        }),
      );
    }

    const user: StoredUser = {
      id: newId("usr"),
      fullName: input.fullName.trim(),
      email,
      emailVerified: false,
      isHost: false,
      createdAt: new Date().toISOString(),
      passwordHash: await digest(input.password),
      notificationPrefs: {
        reservationUpdates: true,
        reminders: true,
        messages: true,
        productNews: false,
        channelEmail: true,
        channelPush: false,
      },
    };
    mutateCollection<StoredUser>(COLLECTIONS.users, (users) => [...users, user]);
    writeRecord(COLLECTIONS.session, user.id);
    notify(COLLECTIONS.session);
    const { passwordHash: _ignored, ...rest } = user;
    void _ignored;
    return settle(ok(rest));
  },

  async signIn(input: { email: string; password: string }): Promise<ApiResult<SessionUser>> {
    if (API_BASE) {
      const result = await request<SessionUser & { sessionToken?: string }>("/auth/sign-in", {
        method: "POST",
        body: JSON.stringify(input),
      });
      if (result.ok) {
        const { sessionToken, ...user } = result.data;
        if (sessionToken) setStoredToken(sessionToken);
        return ok(user);
      }
      return result;
    }

    const email = input.email.trim().toLowerCase();
    const hash = await digest(input.password);
    const user = readCollection<StoredUser>(COLLECTIONS.users).find(
      (u) => u.email === email && u.passwordHash === hash,
    );
    if (!user) {
      return settle(
        fail<SessionUser>("unauthorized", "That email and password do not match an account.", {
          retryable: false,
        }),
      );
    }
    writeRecord(COLLECTIONS.session, user.id);
    notify(COLLECTIONS.session);
    const { passwordHash: _ignored, ...rest } = user;
    void _ignored;
    return settle(ok(rest));
  },

  async signOut(): Promise<ApiResult<null>> {
    if (API_BASE) {
      const result = await request<null>("/auth/sign-out", { method: "POST" });
      clearStoredToken();
      return result;
    }
    writeRecord(COLLECTIONS.session, null);
    notify(COLLECTIONS.session);
    return settle(ok(null));
  },

  async updateProfile(patch: Partial<Pick<SessionUser, "fullName" | "email" | "notificationPrefs" | "isHost">>): Promise<
    ApiResult<SessionUser>
  > {
    if (API_BASE) return request<SessionUser>("/auth/profile", { method: "PATCH", body: JSON.stringify(patch) });

    const id = readRecord<string>(COLLECTIONS.session);
    if (!id) return fail("unauthorized", "You are signed out.");
    let updated: StoredUser | undefined;
    mutateCollection<StoredUser>(COLLECTIONS.users, (users) =>
      users.map((u) => {
        if (u.id !== id) return u;
        updated = { ...u, ...patch };
        return updated;
      }),
    );
    notify(COLLECTIONS.session);
    if (!updated) return fail("not_found", "Account not found.");
    const { passwordHash: _ignored, ...rest } = updated;
    void _ignored;
    return settle(ok(rest));
  },

  async requestPasswordReset(email: string): Promise<ApiResult<null>> {
    if (API_BASE) return request<null>("/auth/password-reset", { method: "POST", body: JSON.stringify({ email }) });
    // Always reports success so the response cannot be used to probe which
    // email addresses have accounts.
    return settle(ok(null), 600);
  },

  async resetPassword(input: { token: string; password: string }): Promise<ApiResult<null>> {
    if (API_BASE) return request<null>("/auth/password-reset/confirm", { method: "POST", body: JSON.stringify(input) });
    if (!input.token) {
      return settle(fail<null>("validation", "This reset link is no longer valid.", { retryable: false }));
    }
    return settle(ok(null), 600);
  },

  async resendVerification(): Promise<ApiResult<null>> {
    if (API_BASE) return request<null>("/auth/verify/resend", { method: "POST" });
    return settle(ok(null), 600);
  },

  async verifyEmail(token: string): Promise<ApiResult<null>> {
    if (API_BASE) return request<null>("/auth/verify", { method: "POST", body: JSON.stringify({ token }) });
    if (!token) return settle(fail<null>("validation", "This verification link is invalid or has expired.", { retryable: false }));
    const id = readRecord<string>(COLLECTIONS.session);
    if (id) {
      mutateCollection<StoredUser>(COLLECTIONS.users, (users) =>
        users.map((u) => (u.id === id ? { ...u, emailVerified: true } : u)),
      );
      notify(COLLECTIONS.session);
    }
    return settle(ok(null), 600);
  },

  async deleteAccount(): Promise<ApiResult<null>> {
    if (API_BASE) {
      const result = await request<null>("/auth/account", { method: "DELETE" });
      clearStoredToken();
      return result;
    }
    const id = readRecord<string>(COLLECTIONS.session);
    if (!id) return fail("unauthorized", "You are signed out.");
    mutateCollection<StoredUser>(COLLECTIONS.users, (users) => users.filter((u) => u.id !== id));
    writeRecord(COLLECTIONS.session, null);
    notify(COLLECTIONS.session);
    return settle(ok(null), 800);
  },
};

/* -------------------------------------------------------------------------
   Vehicles
   ------------------------------------------------------------------------- */

type StoredVehicle = Vehicle & { userId: string };

function currentUserId(): string | null {
  return readRecord<string>(COLLECTIONS.session);
}

export const vehicles = {
  async list(): Promise<ApiResult<Vehicle[]>> {
    if (API_BASE) return request<Vehicle[]>("/vehicles");
    const userId = currentUserId();
    if (!userId) return ok([]);
    return settle(
      ok(readCollection<StoredVehicle>(COLLECTIONS.vehicles).filter((v) => v.userId === userId)),
    );
  },

  async create(input: Omit<Vehicle, "id" | "isDefault">): Promise<ApiResult<Vehicle>> {
    if (API_BASE) return request<Vehicle>("/vehicles", { method: "POST", body: JSON.stringify(input) });
    const userId = currentUserId();
    if (!userId) return fail("unauthorized", "Sign in to save a vehicle.");
    const existing = readCollection<StoredVehicle>(COLLECTIONS.vehicles).filter((v) => v.userId === userId);
    const vehicle: StoredVehicle = {
      ...input,
      id: newId("veh"),
      userId,
      isDefault: existing.length === 0,
    };
    mutateCollection<StoredVehicle>(COLLECTIONS.vehicles, (all) => [...all, vehicle]);
    return settle(ok(vehicle));
  },

  async update(id: string, patch: Partial<Vehicle>): Promise<ApiResult<Vehicle>> {
    if (API_BASE) return request<Vehicle>(`/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    const userId = currentUserId();
    let updated: StoredVehicle | undefined;
    mutateCollection<StoredVehicle>(COLLECTIONS.vehicles, (all) =>
      all.map((v) => {
        if (v.id !== id || v.userId !== userId) return v;
        updated = { ...v, ...patch };
        return updated;
      }),
    );
    if (!updated) return fail("not_found", "That vehicle no longer exists.");
    return settle(ok(updated));
  },

  async remove(id: string): Promise<ApiResult<null>> {
    if (API_BASE) return request<null>(`/vehicles/${id}`, { method: "DELETE" });
    const userId = currentUserId();
    mutateCollection<StoredVehicle>(COLLECTIONS.vehicles, (all) =>
      all.filter((v) => !(v.id === id && v.userId === userId)),
    );
    return settle(ok(null));
  },

  async setDefault(id: string): Promise<ApiResult<null>> {
    if (API_BASE) return request<null>(`/vehicles/${id}/default`, { method: "POST" });
    const userId = currentUserId();
    mutateCollection<StoredVehicle>(COLLECTIONS.vehicles, (all) =>
      all.map((v) => (v.userId === userId ? { ...v, isDefault: v.id === id } : v)),
    );
    return settle(ok(null));
  },
};

/* -------------------------------------------------------------------------
   Listings
   ------------------------------------------------------------------------- */

export type StoredListing = Listing & {
  hostUserId: string;
  /** Kept private; only released on a confirmed reservation. */
  privateAddress: ExactAddress;
  privateInstructions: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
};

function toSummary(listing: StoredListing, query?: SearchQuery): ListingSummary {
  const distance = query?.center
    ? distanceMeters(query.center, listing.location.center)
    : undefined;
  const minutes =
    query?.startAt && query?.endAt ? minutesBetween(query.startAt, query.endAt) : undefined;

  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    photo: listing.photos[0],
    location: listing.location,
    pricePerHourCents: listing.pricePerHourCents,
    currency: listing.currency,
    parkingType: listing.parkingType,
    maxVehicleSize: listing.maxVehicleSize,
    amenities: listing.amenities,
    rating: listing.rating,
    instantBook: listing.instantBook,
    distanceMeters: distance,
    walkingMinutes: distance === undefined ? undefined : walkingMinutes(distance),
    estimatedTotalCents:
      minutes && minutes > 0
        ? quote({
            pricePerHourCents: listing.pricePerHourCents,
            dailyMaxCents: listing.dailyMaxCents,
            minutes,
            currency: listing.currency,
          }).totalCents
        : undefined,
    availableForQuery: true,
  };
}

export const listings = {
  async getBySlug(slug: string): Promise<ApiResult<Listing>> {
    if (API_BASE) return request<Listing>(`/listings/${encodeURIComponent(slug)}`);
    const found = readCollection<StoredListing>(COLLECTIONS.listings).find((l) => l.slug === slug);
    if (!found) {
      return settle(fail<Listing>("not_found", "This space is no longer listed.", { retryable: false }));
    }
    return settle(ok(found));
  },

  async listForHost(): Promise<ApiResult<StoredListing[]>> {
    if (API_BASE) return request<StoredListing[]>("/host/listings");
    const userId = currentUserId();
    if (!userId) return ok([]);
    return settle(
      ok(
        readCollection<StoredListing>(COLLECTIONS.listings)
          .filter((l) => l.hostUserId === userId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      ),
    );
  },

  async create(input: {
    draft: Omit<
      StoredListing,
      "id" | "slug" | "hostUserId" | "createdAt" | "updatedAt" | "status" | "viewCount" | "location" | "host"
    > & { street: string; city: string; state: string; center: { lat: number; lng: number } };
  }): Promise<ApiResult<StoredListing>> {
    if (API_BASE) return request<StoredListing>("/host/listings", { method: "POST", body: JSON.stringify(input) });

    const userId = currentUserId();
    if (!userId) return fail("unauthorized", "Sign in to publish a listing.");
    const sessionResult = await auth.getSession();
    const user = sessionResult.ok ? sessionResult.data : null;
    if (!user) return fail("unauthorized", "Sign in to publish a listing.");

    const id = newId("lst");
    const slug = `${input.draft.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48)}-${id.slice(-6)}`;

    const now = new Date().toISOString();
    const listing: StoredListing = {
      ...input.draft,
      id,
      slug,
      hostUserId: userId,
      location: toApproximateLocation({
        id,
        street: input.draft.street,
        city: input.draft.city,
        state: input.draft.state,
        center: input.draft.center,
      }),
      host: {
        id: user.id,
        displayName: user.fullName.split(" ")[0] ?? user.fullName,
        joinedAt: user.createdAt,
      },
      status: business.listingsAutoPublish ? "active" : "in_review",
      createdAt: now,
      updatedAt: now,
      viewCount: 0,
    };

    mutateCollection<StoredListing>(COLLECTIONS.listings, (all) => [...all, listing]);
    await auth.updateProfile({ isHost: true });
    return settle(ok(listing), 900);
  },

  async update(id: string, patch: Partial<StoredListing>): Promise<ApiResult<StoredListing>> {
    if (API_BASE) return request<StoredListing>(`/host/listings/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
    const userId = currentUserId();
    let updated: StoredListing | undefined;
    mutateCollection<StoredListing>(COLLECTIONS.listings, (all) =>
      all.map((l) => {
        if (l.id !== id || l.hostUserId !== userId) return l;
        updated = { ...l, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      }),
    );
    if (!updated) return fail("not_found", "That listing no longer exists.");
    return settle(ok(updated));
  },

  /**
   * Deletes the listing outright, unless it has reservation history — in
   * that case the server archives it instead (Reservation -> Listing can't
   * be hard-deleted through) and reports that back via `archived: true` so
   * the caller can show the right outcome.
   */
  async remove(id: string): Promise<ApiResult<{ archived: boolean }>> {
    if (API_BASE) return request<{ archived: boolean }>(`/host/listings/${id}`, { method: "DELETE" });
    const userId = currentUserId();
    mutateCollection<StoredListing>(COLLECTIONS.listings, (all) =>
      all.filter((l) => !(l.id === id && l.hostUserId === userId)),
    );
    return settle(ok({ archived: false }));
  },
};

/* -------------------------------------------------------------------------
   Search
   ------------------------------------------------------------------------- */

export const search = {
  async run(query: SearchQuery): Promise<ApiResult<SearchResults>> {
    if (API_BASE) {
      return request<SearchResults>("/search", { method: "POST", body: JSON.stringify(query) });
    }

    const center = query.center;
    if (!center) {
      return fail("validation", "Choose a destination to search near.", { retryable: false });
    }

    const maxDistance = query.filters.maxDistanceMeters ?? 5000;

    const matchedListings = query.filters.includePaid
      ? readCollection<StoredListing>(COLLECTIONS.listings)
          .filter((l) => l.status === "active")
          .filter((l) => distanceMeters(center, l.location.center) <= maxDistance)
          .filter((l) =>
            query.filters.parkingTypes.length === 0
              ? true
              : query.filters.parkingTypes.includes(l.parkingType),
          )
          .filter((l) =>
            query.filters.amenities.every((a) => l.amenities.includes(a)),
          )
          .filter((l) =>
            query.filters.maxPriceCents === undefined
              ? true
              : l.pricePerHourCents <= query.filters.maxPriceCents,
          )
          .filter((l) => (query.filters.instantBookOnly ? l.instantBook : true))
          .filter((l) =>
            query.filters.minRating === undefined
              ? true
              : (l.rating?.average ?? 0) >= query.filters.minRating,
          )
          .map((l) => toSummary(l, query))
      : [];

    const now = Date.now();
    const matchedReports = query.filters.includeFree
      ? readCollection<FreeParkingReport>(COLLECTIONS.reports)
          .filter((r) => r.status === "active" && new Date(r.expiresAt).getTime() > now)
          .filter((r) => distanceMeters(center, r.location.center) <= maxDistance)
      : [];

    const sorted = [...matchedListings].sort((a, b) => {
      switch (query.sort) {
        case "closest":
          return (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);
        case "price_low":
          return a.pricePerHourCents - b.pricePerHourCents;
        case "rating_high":
          return (b.rating?.average ?? 0) - (a.rating?.average ?? 0);
        default:
          return (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);
      }
    });

    return settle(ok({ listings: sorted, reports: matchedReports, center }), 500);
  },
};

/* -------------------------------------------------------------------------
   Reservations
   ------------------------------------------------------------------------- */

type StoredReservation = Reservation & { userId: string; hostUserId: string; listingId: string };

export const reservations = {
  async list(): Promise<ApiResult<Reservation[]>> {
    if (API_BASE) return request<Reservation[]>("/reservations");
    const userId = currentUserId();
    if (!userId) return ok([]);
    return settle(
      ok(
        readCollection<StoredReservation>(COLLECTIONS.reservations)
          .filter((r) => r.userId === userId)
          .sort((a, b) => b.startAt.localeCompare(a.startAt)),
      ),
    );
  },

  async listForHost(): Promise<ApiResult<StoredReservation[]>> {
    if (API_BASE) return request<StoredReservation[]>("/host/reservations");
    const userId = currentUserId();
    if (!userId) return ok([]);
    return settle(
      ok(
        readCollection<StoredReservation>(COLLECTIONS.reservations)
          .filter((r) => r.hostUserId === userId)
          .sort((a, b) => a.startAt.localeCompare(b.startAt)),
      ),
    );
  },

  async get(reference: string): Promise<ApiResult<Reservation>> {
    if (API_BASE) return request<Reservation>(`/reservations/${encodeURIComponent(reference)}`);
    const userId = currentUserId();
    const found = readCollection<StoredReservation>(COLLECTIONS.reservations).find(
      (r) => (r.reference === reference || r.id === reference) && r.userId === userId,
    );
    if (!found) return settle(fail<Reservation>("not_found", "We could not find that reservation.", { retryable: false }));
    return settle(ok(found));
  },

  /**
   * Creates the reservation and, over the HTTP adapter, starts a Stripe
   * PaymentIntent alongside it — `clientSecret` is what the booking flow
   * hands to Stripe Elements to actually collect and confirm payment. The
   * reservation stays "pending" until that succeeds; nothing here waits for
   * it. Refuses rather than reporting a false success when no payment
   * provider is connected.
   */
  async create(input: {
    listingSlug: string;
    startAt: string;
    endAt: string;
    vehicleId: string;
  }): Promise<ApiResult<Reservation & { clientSecret: string | null }>> {
    if (API_BASE) {
      return request<Reservation & { clientSecret: string | null }>("/reservations", {
        method: "POST",
        body: JSON.stringify(input),
      });
    }

    if (!paymentsConfigured) {
      return settle(
        fail(
          "payment_unavailable",
          "ParkPlugs is not connected to a payment provider yet, so this reservation cannot be completed.",
          { retryable: false },
        ),
        700,
      );
    }

    const userId = currentUserId();
    if (!userId) return fail("unauthorized", "Sign in to reserve a space.");

    const listing = readCollection<StoredListing>(COLLECTIONS.listings).find(
      (l) => l.slug === input.listingSlug,
    );
    if (!listing) return fail("not_found", "This space is no longer listed.");

    const vehicle = readCollection<StoredVehicle>(COLLECTIONS.vehicles).find(
      (v) => v.id === input.vehicleId,
    );
    if (!vehicle) return fail("validation", "Choose a vehicle for this reservation.");

    // Reject a double booking rather than silently overlapping.
    const clash = readCollection<StoredReservation>(COLLECTIONS.reservations).some(
      (r) =>
        r.listingId === listing.id &&
        (r.status === "confirmed" || r.status === "in_progress") &&
        new Date(input.startAt) < new Date(r.endAt) &&
        new Date(r.startAt) < new Date(input.endAt),
    );
    if (clash) {
      return settle(fail("conflict", "That time was just reserved by someone else.", { retryable: false }));
    }

    const minutes = minutesBetween(input.startAt, input.endAt);
    const price = quote({
      pricePerHourCents: listing.pricePerHourCents,
      dailyMaxCents: listing.dailyMaxCents,
      minutes,
      currency: listing.currency,
    });

    const now = new Date().toISOString();
    const reservation: StoredReservation = {
      id: newId("res"),
      reference: newReference(),
      status: "confirmed",
      listing: toSummary(listing),
      listingId: listing.id,
      userId,
      hostUserId: listing.hostUserId,
      exactAddress: listing.privateAddress,
      hostInstructions: listing.privateInstructions,
      startAt: input.startAt,
      endAt: input.endAt,
      vehicle,
      price,
      createdAt: now,
      cancellationPolicy: listing.cancellationPolicy,
      canCancel: true,
      canReview: false,
      timeline: [{ at: now, label: "Reservation confirmed", description: "Payment authorised." }],
    };

    mutateCollection<StoredReservation>(COLLECTIONS.reservations, (all) => [...all, reservation]);
    notifications.push({
      type: "reservation_confirmed",
      title: "Reservation confirmed",
      body: `${listing.title} · ${reservation.reference}`,
      href: `/reservations/${reservation.reference}`,
    });
    // No real Stripe integration in local-storage mode — the reservation
    // above is already synthetically "confirmed", so there is no payment
    // step for the booking flow to run; it treats a null clientSecret as
    // "nothing left to collect" the same way it always has.
    return settle(ok({ ...reservation, clientSecret: null }), 1200);
  },

  async cancel(reference: string): Promise<ApiResult<Reservation>> {
    if (API_BASE) return request<Reservation>(`/reservations/${reference}/cancel`, { method: "POST" });
    let updated: StoredReservation | undefined;
    mutateCollection<StoredReservation>(COLLECTIONS.reservations, (all) =>
      all.map((r) => {
        if (r.reference !== reference) return r;
        const now = new Date().toISOString();
        updated = {
          ...r,
          status: "canceled",
          canceledAt: now,
          canCancel: false,
          timeline: [...r.timeline, { at: now, label: "Reservation canceled" }],
        };
        return updated;
      }),
    );
    if (!updated) return fail("not_found", "We could not find that reservation.");
    return settle(ok(updated), 700);
  },
};

/* -------------------------------------------------------------------------
   Community free-parking reports
   ------------------------------------------------------------------------- */

export const reports = {
  async get(id: string): Promise<ApiResult<FreeParkingReport>> {
    if (API_BASE) return request<FreeParkingReport>(`/reports/${id}`);
    const found = readCollection<FreeParkingReport>(COLLECTIONS.reports).find((r) => r.id === id);
    if (!found) return settle(fail<FreeParkingReport>("not_found", "This report is no longer available.", { retryable: false }));
    return settle(ok(found));
  },

  async listMine(): Promise<ApiResult<FreeParkingReport[]>> {
    if (API_BASE) return request<FreeParkingReport[]>("/reports/mine");
    return settle(ok(readCollection<FreeParkingReport>(COLLECTIONS.reports)));
  },

  async create(input: {
    location: FreeParkingReport["location"];
    observedAt: string;
    spacesObserved: number;
    sideOfStreet?: string;
    landmark?: string;
    restrictions: FreeParkingReport["restrictions"];
    restrictionNotes?: string;
    timeLimitMinutes?: number;
    confidence: FreeParkingReport["confidence"];
    notes?: string;
    photoUrl?: string;
  }): Promise<ApiResult<FreeParkingReport>> {
    if (API_BASE) return request<FreeParkingReport>("/reports", { method: "POST", body: JSON.stringify(input) });

    const now = new Date();
    // Higher-confidence reports stay visible longer, but all of them expire.
    const lifetimeHours = input.confidence === "high" ? 4 : input.confidence === "medium" ? 2 : 1;
    const report: FreeParkingReport = {
      ...input,
      id: newId("rpt"),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + lifetimeHours * 3600_000).toISOString(),
      confirmations: 0,
      markedTakenCount: 0,
      status: "active",
    };
    mutateCollection<FreeParkingReport>(COLLECTIONS.reports, (all) => [...all, report]);
    return settle(ok(report), 800);
  },

  async confirm(id: string): Promise<ApiResult<FreeParkingReport>> {
    if (API_BASE) return request<FreeParkingReport>(`/reports/${id}/confirm`, { method: "POST" });
    return settle(
      updateReport(id, (r) => ({
        ...r,
        confirmations: r.confirmations + 1,
        // A fresh confirmation extends the window it stays visible.
        expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      })),
    );
  },

  async markTaken(id: string): Promise<ApiResult<FreeParkingReport>> {
    if (API_BASE) return request<FreeParkingReport>(`/reports/${id}/taken`, { method: "POST" });
    return settle(
      updateReport(id, (r) => {
        const markedTakenCount = r.markedTakenCount + 1;
        return {
          ...r,
          markedTakenCount,
          status: markedTakenCount >= 2 ? "taken" : r.status,
        };
      }),
    );
  },

  async flag(id: string, reason: string): Promise<ApiResult<null>> {
    if (API_BASE) return request<null>(`/reports/${id}/flag`, { method: "POST", body: JSON.stringify({ reason }) });
    return settle(ok(null), 600);
  },

  /** Withdraws a report you filed — a soft delete; it drops out of search immediately. */
  async remove(id: string): Promise<ApiResult<FreeParkingReport>> {
    if (API_BASE) return request<FreeParkingReport>(`/reports/${id}`, { method: "DELETE" });
    return settle(updateReport(id, (r) => ({ ...r, status: "expired" })));
  },
};

function updateReport(
  id: string,
  fn: (report: FreeParkingReport) => FreeParkingReport,
): ApiResult<FreeParkingReport> {
  let updated: FreeParkingReport | undefined;
  mutateCollection<FreeParkingReport>(COLLECTIONS.reports, (all) =>
    all.map((r) => {
      if (r.id !== id) return r;
      updated = fn(r);
      return updated;
    }),
  );
  if (!updated) return fail("not_found", "This report is no longer available.");
  return ok(updated);
}

/* -------------------------------------------------------------------------
   Reviews, saved spaces, notifications, support
   ------------------------------------------------------------------------- */

type StoredReview = Review & { listingId: string; reservationId: string };

export const reviews = {
  async listForListing(listingId: string): Promise<ApiResult<Review[]>> {
    if (API_BASE) return request<Review[]>(`/listings/${listingId}/reviews`);
    return settle(
      ok(readCollection<StoredReview>(COLLECTIONS.reviews).filter((r) => r.listingId === listingId)),
    );
  },

  async create(input: {
    reservationId: string;
    listingId: string;
    rating: number;
    /** Set when a driver reviews a listing. */
    categories?: Review["categories"];
    /** Set when a host reviews a driver — a distinct scale from `categories`. */
    driverScores?: DriverReviewScores;
    body: string;
    privateFeedback?: string;
  }): Promise<ApiResult<Review>> {
    if (API_BASE) return request<Review>("/reviews", { method: "POST", body: JSON.stringify(input) });
    const sessionResult = await auth.getSession();
    const user = sessionResult.ok ? sessionResult.data : null;
    if (!user) return fail("unauthorized", "Sign in to leave a review.");

    const review: StoredReview = {
      id: newId("rev"),
      listingId: input.listingId,
      reservationId: input.reservationId,
      rating: input.rating,
      categories: input.categories,
      body: input.body,
      createdAt: new Date().toISOString(),
      author: {
        displayName: `${user.fullName.split(" ")[0]} ${user.fullName.split(" ")[1]?.[0] ?? ""}.`.trim(),
        role: "driver",
      },
    };
    mutateCollection<StoredReview>(COLLECTIONS.reviews, (all) => [...all, review]);
    mutateCollection<StoredReservation>(COLLECTIONS.reservations, (all) =>
      all.map((r) => (r.id === input.reservationId ? { ...r, canReview: false } : r)),
    );
    return settle(ok(review), 800);
  },
};

export const saved = {
  async list(): Promise<ApiResult<ListingSummary[]>> {
    if (API_BASE) return request<ListingSummary[]>("/saved");
    const userId = currentUserId();
    if (!userId) return ok([]);
    const ids = readCollection<{ userId: string; listingId: string }>(COLLECTIONS.saved)
      .filter((s) => s.userId === userId)
      .map((s) => s.listingId);
    const all = readCollection<StoredListing>(COLLECTIONS.listings);
    return settle(ok(all.filter((l) => ids.includes(l.id)).map((l) => toSummary(l))));
  },

  async ids(): Promise<string[]> {
    if (API_BASE) {
      // No dedicated endpoint for this — the saved list is small per user,
      // so deriving ids from the full list is simpler than adding one.
      const result = await saved.list();
      return result.ok ? result.data.map((l) => l.id) : [];
    }
    const userId = currentUserId();
    if (!userId) return [];
    return readCollection<{ userId: string; listingId: string }>(COLLECTIONS.saved)
      .filter((s) => s.userId === userId)
      .map((s) => s.listingId);
  },

  async toggle(listingId: string): Promise<ApiResult<{ saved: boolean }>> {
    if (API_BASE) return request<{ saved: boolean }>(`/saved/${listingId}`, { method: "POST" });
    const userId = currentUserId();
    if (!userId) return fail("unauthorized", "Sign in to save spaces.");
    let isSaved = false;
    mutateCollection<{ userId: string; listingId: string }>(COLLECTIONS.saved, (all) => {
      const exists = all.some((s) => s.userId === userId && s.listingId === listingId);
      isSaved = !exists;
      return exists
        ? all.filter((s) => !(s.userId === userId && s.listingId === listingId))
        : [...all, { userId, listingId }];
    });
    return ok({ saved: isSaved });
  },
};

export const notifications = {
  async list(): Promise<ApiResult<AppNotification[]>> {
    if (API_BASE) return request<AppNotification[]>("/notifications");
    const userId = currentUserId();
    if (!userId) return ok([]);
    return settle(
      ok(
        readCollection<AppNotification & { userId: string }>(COLLECTIONS.notifications)
          .filter((n) => n.userId === userId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      ),
    );
  },

  /** Internal helper used when an action generates a notification. */
  push(input: Omit<AppNotification, "id" | "createdAt">): void {
    const userId = currentUserId();
    if (!userId || API_BASE) return;
    mutateCollection<AppNotification & { userId: string }>(COLLECTIONS.notifications, (all) => [
      ...all,
      { ...input, id: newId("ntf"), createdAt: new Date().toISOString(), userId },
    ]);
  },

  async markRead(id: string): Promise<ApiResult<null>> {
    if (API_BASE) return request<null>(`/notifications/${id}/read`, { method: "POST" });
    const userId = currentUserId();
    mutateCollection<AppNotification & { userId: string }>(COLLECTIONS.notifications, (all) =>
      all.map((n) => (n.id === id && n.userId === userId ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    return ok(null);
  },

  async markAllRead(): Promise<ApiResult<null>> {
    if (API_BASE) return request<null>("/notifications/read-all", { method: "POST" });
    const userId = currentUserId();
    const now = new Date().toISOString();
    mutateCollection<AppNotification & { userId: string }>(COLLECTIONS.notifications, (all) =>
      all.map((n) => (n.userId === userId && !n.readAt ? { ...n, readAt: now } : n)),
    );
    return ok(null);
  },

  async remove(id: string): Promise<ApiResult<null>> {
    if (API_BASE) return request<null>(`/notifications/${id}`, { method: "DELETE" });
    const userId = currentUserId();
    mutateCollection<AppNotification & { userId: string }>(COLLECTIONS.notifications, (all) =>
      all.filter((n) => !(n.id === id && n.userId === userId)),
    );
    return ok(null);
  },
};

export const messaging = {
  async listConversations(): Promise<ApiResult<Conversation[]>> {
    if (API_BASE) return request<Conversation[]>("/conversations");
    // Messaging requires a server to relay between two accounts; there is
    // nothing to show until the API is connected.
    return settle(ok([]));
  },

  async getMessages(conversationId: string): Promise<ApiResult<Message[]>> {
    if (API_BASE) return request<Message[]>(`/conversations/${conversationId}/messages`);
    return settle(ok([]));
  },

  async sendMessage(conversationId: string, body: string): Promise<ApiResult<Message>> {
    if (API_BASE) {
      return request<Message>(`/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
    }
    return fail("network", "Messaging requires a connected backend.");
  },
};

export const support = {
  async createTicket(input: {
    category: string;
    reference?: string;
    name: string;
    email: string;
    description: string;
    preferredResponse: string;
    attachmentName?: string;
  }): Promise<ApiResult<{ ticketReference: string }>> {
    if (API_BASE) return request<{ ticketReference: string }>("/support/tickets", { method: "POST", body: JSON.stringify(input) });
    const ticketReference = `SUP-${newReference().slice(3)}`;
    mutateCollection(COLLECTIONS.supportTickets, (all) => [
      ...all,
      { ...input, ticketReference, createdAt: new Date().toISOString() },
    ]);
    return settle(ok({ ticketReference }), 900);
  },
};

export const uploads = {
  /**
   * Uploads a listing photo through the real API, which strips EXIF/GPS and
   * verifies it is a genuine raster image server-side (see
   * server/src/lib/uploads.ts) — never embeds the file inline. Without a
   * backend, falls back to reading it as a data URL so the browser-local
   * demo build still works; that path has no server to strip metadata, so
   * it stays demo-only.
   */
  async uploadListingPhoto(file: File): Promise<ApiResult<{ url: string; width: number; height: number }>> {
    if (!API_BASE) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const url = String(reader.result);
          const img = new Image();
          img.onload = () =>
            resolve(ok({ url, width: img.naturalWidth, height: img.naturalHeight }));
          img.onerror = () => resolve(fail("upload_failed", "That image could not be read."));
          img.src = url;
        };
        reader.onerror = () => resolve(fail("upload_failed", "That image could not be read."));
        reader.readAsDataURL(file);
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const token = getStoredToken();
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`${API_BASE}/media/listing-photo`, {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        // No Content-Type here — the browser sets the multipart boundary
        // itself; setting it manually breaks the upload.
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}) as Record<string, unknown>);
        const message = typeof errBody.message === "string" ? errBody.message : "That image could not be uploaded.";
        return fail("upload_failed", message);
      }
      return ok((await response.json()) as { url: string; width: number; height: number });
    } catch {
      return fail("network", "We could not reach ParkPlugs.");
    } finally {
      clearTimeout(timer);
    }
  },
};

export const host = {
  async earnings(): Promise<ApiResult<HostEarnings>> {
    if (API_BASE) return request<HostEarnings>("/host/earnings");
    const userId = currentUserId();
    const mine = readCollection<StoredReservation>(COLLECTIONS.reservations).filter(
      (r) => r.hostUserId === userId,
    );
    const lifetimeCents = mine
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + (r.price.hostEarningsCents ?? 0), 0);
    const pendingCents = mine
      .filter((r) => r.status === "confirmed" || r.status === "in_progress")
      .reduce((sum, r) => sum + (r.price.hostEarningsCents ?? 0), 0);
    return settle(
      ok({ currency: "USD", availableBalanceCents: lifetimeCents, pendingCents, lifetimeCents }),
    );
  },

  async transactions(): Promise<ApiResult<EarningsTransaction[]>> {
    if (API_BASE) return request<EarningsTransaction[]>("/host/transactions");
    const userId = currentUserId();
    return settle(
      ok(
        readCollection<StoredReservation>(COLLECTIONS.reservations)
          .filter((r) => r.hostUserId === userId && r.price.hostEarningsCents !== undefined)
          .map((r) => ({
            id: r.id,
            kind: "reservation" as const,
            description: r.listing.title,
            occurredAt: r.startAt,
            amountCents: r.price.hostEarningsCents ?? 0,
            feeCents: r.price.hostFeeCents,
            status: r.status === "completed" ? ("paid" as const) : ("pending" as const),
            reservationReference: r.reference,
          }))
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
      ),
    );
  },

  async payoutState(): Promise<ApiResult<PayoutSetupState>> {
    if (API_BASE) return request<PayoutSetupState>("/host/payouts");
    // Payout onboarding is owned entirely by the payment provider.
    return settle(ok({ state: "not_started" }));
  },

  /** Starts (or resumes) Stripe Connect onboarding. Returns a URL to redirect to. */
  async startPayoutSetup(): Promise<ApiResult<{ url: string }>> {
    if (API_BASE) return request<{ url: string }>("/host/payouts/start", { method: "POST" });
    return settle(
      fail<{ url: string }>(
        "payment_unavailable",
        "Payouts require a payment provider, which is not connected in this environment.",
        { retryable: false },
      ),
    );
  },
};
