import { test, expect, type Page } from "@playwright/test";

/**
 * Regression coverage for two related fixes, in one focused pass:
 *   1. The Reserve CTA on the listing page disables itself — with an
 *      explicit text reason, never color alone — when the host's payout
 *      account isn't ready, instead of letting the driver reach a request
 *      that would 409.
 *   2. If a booking is somehow submitted anyway (e.g. the host's readiness
 *      changed between page load and submit), the 409 host_not_ready
 *      response from POST /reservations surfaces as a clear inline error
 *      (24c773f) instead of failing silently or resetting the wizard.
 *
 * The whole backend is mocked via page.route() — this is a frontend
 * contract test, not an integration test against a real server.
 */

const SESSION_USER = {
  id: "user_driver_1",
  fullName: "Dana Driver",
  email: "dana@example.com",
  emailVerified: true,
  isHost: false,
  createdAt: new Date().toISOString(),
  notificationPrefs: {
    reservationUpdates: true,
    reminders: true,
    messages: true,
    productNews: false,
    channelEmail: true,
    channelPush: false,
  },
};

const VEHICLE = {
  id: "veh_1",
  make: "Honda",
  model: "Civic",
  color: "Blue",
  licensePlate: "ABC123",
  plateRegion: "NJ",
  size: "standard",
  isDefault: true,
};

function baseListing(overrides: Record<string, unknown>) {
  const fullAvailability = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    startTime: "00:00",
    endTime: "23:59",
  }));
  return {
    id: "lst_1",
    slug: overrides.slug,
    title: "Driveway near downtown",
    description: "A quiet residential driveway.",
    parkingType: "driveway",
    photos: [],
    location: {
      label: "Near Downtown",
      city: "Chatham",
      state: "NJ",
      center: { lat: 40.74, lng: -74.38 },
      radiusMeters: 200,
    },
    pricePerHourCents: 300,
    currency: "USD",
    spacesTotal: 1,
    maxVehicleSize: "standard",
    amenities: [],
    minimumMinutes: 60,
    maximumMinutes: 1440,
    advanceNoticeMinutes: 0,
    availability: fullAvailability,
    rules: [],
    cancellationPolicy: {
      id: "standard",
      label: "Standard",
      summary: "Free cancellation up to 1 hour before your arrival time.",
      fullRefundHoursBefore: 1,
    },
    host: { id: "user_host_1", displayName: "Hank", joinedAt: new Date().toISOString() },
    instantBook: true,
    status: "active",
    ...overrides,
  };
}

async function mockCommonSession(page: Page) {
  await page.route("**/auth/session", (route) => route.fulfill({ json: SESSION_USER }));
  await page.route("**/notifications", (route) => route.fulfill({ json: [] }));
  await page.route("**/vehicles", (route) => route.fulfill({ json: [VEHICLE] }));
}

test("Reserve CTA disables for a payout-not-ready host, and a 409 host_not_ready submit surfaces inline", async ({
  page,
}) => {
  await mockCommonSession(page);

  // --- Phase 1: listing page, host not payout-ready -----------------------
  const notReadySlug = "not-ready-space";
  await page.route(`**/listings/${notReadySlug}`, (route) =>
    route.fulfill({ json: baseListing({ slug: notReadySlug, hostPayoutReady: false }) }),
  );
  await page.route(`**/listings/${notReadySlug}/reviews`, (route) => route.fulfill({ json: [] }));

  await page.goto(`/spaces/${notReadySlug}`);

  const reasonText = page.getByText("The host has not finished setting up payouts yet", { exact: false });
  await expect(reasonText).toBeVisible();

  const reserveButtons = page.getByRole("button", { name: "Reserve" });
  const count = await reserveButtons.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(reserveButtons.nth(i)).toBeDisabled();
  }

  // --- Phase 2: a submitted reservation still gets a real 409 -------------
  // (payout-ready listing this time, so the CTA itself isn't the blocker —
  // this exercises the server-error path independently of phase 1's gate)
  const readySlug = "ready-space";
  await page.route(`**/listings/${readySlug}`, (route) =>
    route.fulfill({ json: baseListing({ slug: readySlug, hostPayoutReady: true }) }),
  );
  await page.route(`**/listings/${readySlug}/reviews`, (route) => route.fulfill({ json: [] }));
  await page.route("**/reservations", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    return route.fulfill({
      status: 409,
      json: { message: "This host has not finished setting up payouts yet, so this space cannot accept bookings right now.", code: "host_not_ready" },
    });
  });

  const start = new Date(Date.now() + 2 * 24 * 3600_000);
  const end = new Date(start.getTime() + 2 * 3600_000);
  const qs = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
  await page.goto(`/book/${readySlug}?${qs.toString()}`);

  // Step 0: Reservation details -> Continue
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // Step 1: Vehicle (the saved default vehicle auto-selects) -> Continue
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // Step 2: Rules acknowledgements
  await page.getByLabel("My vehicle fits this space").check();
  await page.getByLabel("My arrival and departure times are correct").check();
  await page.getByLabel("I have read and understand the parking rules").check();
  await page.getByLabel("I understand the cancellation policy").check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // Step 3: Review and pay -> submits the reservation
  await page.getByLabel(/I agree to ParkPlugs.{0,2}s/).check();
  await page.getByRole("button", { name: "Continue to payment" }).click();

  await expect(page.getByText("This space can't be booked right now", { exact: true })).toBeVisible();
  await expect(page.getByText("This host hasn't finished setting up payouts yet", { exact: false })).toBeVisible();

  // The wizard did not reset — still on the review step with vehicle intact.
  await expect(page.getByRole("button", { name: "Continue to payment" })).toBeVisible();
});
