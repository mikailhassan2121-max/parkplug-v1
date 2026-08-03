/**
 * Integration test for DELETE /host/listings/:id — the risky part of letting
 * a host cancel their own listing. Runs against a real Postgres connection
 * (DATABASE_URL from server/.env) rather than a mocked Prisma client,
 * because what's actually being proven here is database-enforced behavior:
 * Reservation.listingId is onDelete: Restrict, so Postgres itself refuses a
 * hard delete while any reservation (any status) still references the
 * listing — this test exists to make sure that boundary can never silently
 * regress into a listing with real reservation history actually vanishing.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { prisma } from "../../db.js";
import { createApp } from "../../app.js";
import { hashPassword } from "../../lib/password.js";
import { SESSION_COOKIE } from "../../lib/cookies.js";

let server: Server;
let baseUrl: string;

const TEST_PREFIX = "listings-delete-test";

async function createUser(role: "host" | "driver") {
  const user = await prisma.user.create({
    data: {
      fullName: `${TEST_PREFIX} ${role}`,
      email: `${TEST_PREFIX}-${role}-${crypto.randomUUID()}@example.test`,
      passwordHash: await hashPassword("irrelevant-not-used"),
      emailVerified: true,
      isHost: role === "host",
    },
  });
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + 3600_000) },
  });
  return { user, cookie: `${SESSION_COOKIE}=${session.id}` };
}

async function createListing(hostId: string, title: string) {
  return prisma.listing.create({
    data: {
      slug: `${TEST_PREFIX}-${crypto.randomUUID()}`,
      hostId,
      title,
      description: "Test fixture listing.",
      parkingType: "driveway",
      status: "active",
      pricePerHourCents: 300,
      currency: "USD",
      spacesTotal: 1,
      maxVehicleSize: "standard",
      minimumMinutes: 30,
      maximumMinutes: 1440,
      advanceNoticeMinutes: 0,
      rules: [],
      cancellationSummary: "Flexible.",
      cancellationFullRefundHoursBefore: 1,
      instantBook: true,
      locationLabel: "Near Test St, Testville",
      city: "Testville",
      state: "CA",
      centerLat: 37.7749,
      centerLng: -122.4194,
      addressLine1: "1 Test St",
      addressCity: "Testville",
      addressState: "CA",
      addressPostalCode: "90000",
      addressCountry: "US",
      privateInstructions: "",
    },
  });
}

async function createReservation(
  listingId: string,
  driverId: string,
  vehicleId: string,
  status: "confirmed" | "completed" | "canceled",
  startAt: Date,
) {
  return prisma.reservation.create({
    data: {
      reference: `PP-TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status,
      listingId,
      userId: driverId,
      vehicleId,
      startAt,
      endAt: new Date(startAt.getTime() + 2 * 3600_000),
      currency: "USD",
      subtotalCents: 600,
      serviceFeeCents: 0,
      taxCents: 0,
      totalCents: 600,
      exactAddressLine1: "1 Test St",
      exactAddressCity: "Testville",
      exactAddressState: "CA",
      exactAddressPostalCode: "90000",
      exactAddressCountry: "US",
      hostInstructions: "",
      cancellationSummary: "Flexible.",
      cancellationFullRefundHoursBefore: 1,
      canceledAt: status === "canceled" ? new Date() : undefined,
    },
  });
}

beforeAll(async () => {
  const app = createApp();
  server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Failed to bind test server");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  // Fixture rows only — never touches anything outside this test's own
  // users/listings/reservations, matched by the TEST_PREFIX-tagged emails.
  const testUsers = await prisma.user.findMany({ where: { email: { contains: TEST_PREFIX } } });
  const userIds = testUsers.map((u) => u.id);
  await prisma.reservation.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.vehicle.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.listing.deleteMany({ where: { hostId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("DELETE /host/listings/:id", () => {
  it("hard-deletes a listing with no reservation history at all", async () => {
    const host = await createUser("host");
    const listing = await createListing(host.user.id, "No bookings ever");

    const res = await fetch(`${baseUrl}/host/listings/${listing.id}`, {
      method: "DELETE",
      headers: { Cookie: host.cookie },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ archived: false });
    expect(await prisma.listing.findUnique({ where: { id: listing.id } })).toBeNull();
  });

  it("archives (never deletes) a listing with a confirmed upcoming reservation", async () => {
    const host = await createUser("host");
    const driver = await createUser("driver");
    const vehicle = await prisma.vehicle.create({
      data: { userId: driver.user.id, make: "Test", model: "Car", color: "Black", licensePlate: "TEST123", plateRegion: "CA", size: "standard", isDefault: true },
    });
    const listing = await createListing(host.user.id, "Has an upcoming confirmed booking");
    const reservation = await createReservation(
      listing.id,
      driver.user.id,
      vehicle.id,
      "confirmed",
      new Date(Date.now() + 7 * 24 * 3600_000), // a week from now
    );

    const res = await fetch(`${baseUrl}/host/listings/${listing.id}`, {
      method: "DELETE",
      headers: { Cookie: host.cookie },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ archived: true });

    const listingAfter = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(listingAfter).not.toBeNull();
    expect(listingAfter!.status).toBe("archived");

    // The reservation itself must be completely untouched.
    const reservationAfter = await prisma.reservation.findUnique({ where: { id: reservation.id } });
    expect(reservationAfter).toMatchObject({ status: "confirmed", listingId: listing.id });

    // The driver's own view of their reservation is unaffected by the
    // listing's archive status — it does not filter on listing status.
    const driverView = await fetch(`${baseUrl}/reservations/${reservation.reference}`, {
      headers: { Cookie: driver.cookie },
    });
    const driverBody = (await driverView.json()) as { listing: { title: string } };
    expect(driverView.status).toBe(200);
    expect(driverBody.listing.title).toBe("Has an upcoming confirmed booking");

    // Archived listings are excluded from public search.
    const searchRes = await fetch(`${baseUrl}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: "",
        center: { lat: 37.7749, lng: -122.4194 },
        sort: "recommended",
        filters: {
          includePaid: true,
          includeFree: false,
          availableNow: false,
          parkingTypes: [],
          amenities: [],
          instantBookOnly: false,
        },
      }),
    });
    const searchBody = (await searchRes.json()) as { listings: Array<{ id: string }> };
    expect(searchBody.listings.some((l) => l.id === listing.id)).toBe(false);
  });

  it(
    "also archives (does not hard-delete) a listing whose only reservation is long cancelled — " +
      "Reservation.listingId is onDelete: Restrict at the database level, so this is not a looser " +
      "app-level choice that could be tightened later: Postgres refuses the hard delete regardless " +
      "of the referencing reservation's status. If this test ever starts asserting a real delete " +
      "here, the schema's FK behavior has changed and the archive-on-any-reservation logic needs a " +
      "matching update, not the other way around.",
    async () => {
      const host = await createUser("host");
      const driver = await createUser("driver");
      const vehicle = await prisma.vehicle.create({
        data: { userId: driver.user.id, make: "Test", model: "Car", color: "Black", licensePlate: "TEST456", plateRegion: "CA", size: "standard", isDefault: true },
      });
      const listing = await createListing(host.user.id, "Only a long-cancelled booking");
      await createReservation(
        listing.id,
        driver.user.id,
        vehicle.id,
        "canceled",
        new Date(Date.now() - 365 * 24 * 3600_000), // a year ago
      );

      const res = await fetch(`${baseUrl}/host/listings/${listing.id}`, {
        method: "DELETE",
        headers: { Cookie: host.cookie },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ archived: true });
      expect((await prisma.listing.findUnique({ where: { id: listing.id } }))!.status).toBe("archived");
    },
  );

  it("refuses to delete or archive a listing owned by someone else", async () => {
    const host = await createUser("host");
    const attacker = await createUser("host");
    const listing = await createListing(host.user.id, "Not yours");

    const res = await fetch(`${baseUrl}/host/listings/${listing.id}`, {
      method: "DELETE",
      headers: { Cookie: attacker.cookie },
    });

    expect(res.status).toBe(403);
    expect((await prisma.listing.findUnique({ where: { id: listing.id } }))!.status).toBe("active");
  });
});
