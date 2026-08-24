/**
 * Integration tests for the reservation-creation and cancellation hardening
 * fixed in this pass: a real Postgres advisory lock now serializes the
 * clash-check + insert so two concurrent bookings for the same window can't
 * both slip through (previously a plain check-then-insert with a Stripe
 * network round-trip in between), capacity is counted against
 * listing.spacesTotal rather than rejecting on any overlap, and cancel now
 * refuses a reservation that has already completed. Runs against a real
 * Postgres connection and a mocked Stripe client (this environment has no
 * real STRIPE_SECRET_KEY configured) so the actual DB-level concurrency
 * behavior is what's being proven, not a mock's bookkeeping.
 */
process.env.STRIPE_SECRET_KEY ||= "sk_test_mock_for_reservations_hardening_test";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import crypto from "node:crypto";

vi.mock("stripe", () => {
  class MockStripe {
    paymentIntents = {
      create: vi.fn(async () => ({
        id: `pi_test_${crypto.randomUUID()}`,
        client_secret: `pi_test_secret_${crypto.randomUUID()}`,
      })),
    };
    refunds = { create: vi.fn(async () => ({ id: `re_test_${crypto.randomUUID()}` })) };
    webhooks = { constructEvent: vi.fn() };
  }
  return { default: MockStripe };
});

const { prisma } = await import("../../db.js");
const { createApp } = await import("../../app.js");
const { hashPassword } = await import("../../lib/password.js");
const { SESSION_COOKIE } = await import("../../lib/cookies.js");

let server: Server;
let baseUrl: string;

const TEST_PREFIX = "reservations-hardening-test";

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

async function createHostWithPayouts() {
  const host = await createUser("host");
  await prisma.payoutAccount.create({
    data: { userId: host.user.id, state: "complete", stripeAccountId: `acct_test_${crypto.randomUUID()}` },
  });
  return host;
}

async function createVehicle(userId: string) {
  return prisma.vehicle.create({
    data: {
      userId,
      make: "Test",
      model: "Car",
      color: "Black",
      licensePlate: `T${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      plateRegion: "CA",
      size: "standard",
      isDefault: true,
    },
  });
}

async function createListing(hostId: string, spacesTotal: number) {
  return prisma.listing.create({
    data: {
      slug: `${TEST_PREFIX}-${crypto.randomUUID()}`,
      hostId,
      title: "Hardening test listing",
      description: "Test fixture listing.",
      parkingType: "driveway",
      status: "active",
      pricePerHourCents: 300,
      currency: "USD",
      spacesTotal,
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
      availability: {
        create: [{ dayOfWeek: 0, startTime: "00:00", endTime: "23:59" }, { dayOfWeek: 1, startTime: "00:00", endTime: "23:59" }, { dayOfWeek: 2, startTime: "00:00", endTime: "23:59" }, { dayOfWeek: 3, startTime: "00:00", endTime: "23:59" }, { dayOfWeek: 4, startTime: "00:00", endTime: "23:59" }, { dayOfWeek: 5, startTime: "00:00", endTime: "23:59" }, { dayOfWeek: 6, startTime: "00:00", endTime: "23:59" }],
      },
    },
  });
}

function bookingWindow() {
  const startAt = new Date(Date.now() + 3 * 24 * 3600_000);
  const endAt = new Date(startAt.getTime() + 2 * 3600_000);
  return { startAt: startAt.toISOString(), endAt: endAt.toISOString() };
}

async function book(cookie: string, listingSlug: string, vehicleId: string) {
  const { startAt, endAt } = bookingWindow();
  return fetch(`${baseUrl}/reservations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ listingSlug, startAt, endAt, vehicleId }),
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
  const testUsers = await prisma.user.findMany({ where: { email: { contains: TEST_PREFIX } } });
  const userIds = testUsers.map((u) => u.id);
  await prisma.reservation.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.payoutAccount.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.vehicle.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.listing.deleteMany({ where: { hostId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("POST /reservations — concurrent booking hardening", () => {
  it("only lets one of two simultaneous overlapping bookings through on a single-space listing", async () => {
    const host = await createHostWithPayouts();
    const listing = await createListing(host.user.id, 1);
    const driverA = await createUser("driver");
    const driverB = await createUser("driver");
    const [vehicleA, vehicleB] = await Promise.all([
      createVehicle(driverA.user.id),
      createVehicle(driverB.user.id),
    ]);

    const [resA, resB] = await Promise.all([
      book(driverA.cookie, listing.slug, vehicleA.id),
      book(driverB.cookie, listing.slug, vehicleB.id),
    ]);
    const statuses = [resA.status, resB.status].sort();

    expect(statuses).toEqual([201, 409]);

    const reservations = await prisma.reservation.findMany({ where: { listingId: listing.id } });
    expect(reservations).toHaveLength(1);
  });

  it("allows exactly spacesTotal concurrent overlapping bookings, rejecting the one past capacity", async () => {
    const host = await createHostWithPayouts();
    const listing = await createListing(host.user.id, 2);
    const drivers = await Promise.all([createUser("driver"), createUser("driver"), createUser("driver")]);
    const vehicles = await Promise.all(drivers.map((d) => createVehicle(d.user.id)));

    const results = await Promise.all(
      drivers.map((d, i) => book(d.cookie, listing.slug, vehicles[i]!.id)),
    );
    const statuses = results.map((r) => r.status).sort();

    expect(statuses).toEqual([201, 201, 409]);

    const reservations = await prisma.reservation.findMany({ where: { listingId: listing.id } });
    expect(reservations).toHaveLength(2);
  });
});

describe("POST /reservations/:reference/cancel — state-machine guard", () => {
  it("refuses to cancel a reservation that has already completed", async () => {
    const host = await createHostWithPayouts();
    const listing = await createListing(host.user.id, 1);
    const driver = await createUser("driver");
    const vehicle = await createVehicle(driver.user.id);

    const startAt = new Date(Date.now() - 5 * 3600_000);
    const endAt = new Date(Date.now() - 3 * 3600_000);
    const reservation = await prisma.reservation.create({
      data: {
        reference: `PP-TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        status: "completed",
        paymentStatus: "succeeded",
        listingId: listing.id,
        userId: driver.user.id,
        vehicleId: vehicle.id,
        startAt,
        endAt,
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
      },
    });

    const res = await fetch(`${baseUrl}/reservations/${reservation.reference}/cancel`, {
      method: "POST",
      headers: { Cookie: driver.cookie },
    });

    expect(res.status).toBe(409);
    const updated = await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
    expect(updated.status).toBe("completed");
  });
});
