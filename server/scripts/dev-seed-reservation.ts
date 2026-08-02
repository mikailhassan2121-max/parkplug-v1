/**
 * DEV-ONLY TEST FIXTURE. Not part of the application, not reachable via any
 * HTTP route, and never imported by app.ts.
 *
 * Reservation creation is correctly gated behind a real payment provider
 * (see reservations.routes.ts) — that is by design, matching the product's
 * hard rule against ever fabricating a paid outcome. But it also means that
 * without real Stripe test keys, every downstream feature that depends on a
 * reservation existing (cancellation, reviews, host earnings, messaging)
 * cannot be exercised at all through the real API.
 *
 * This script inserts one reservation directly via Prisma — bypassing the
 * payment gate the same way a real Stripe webhook confirmation would after
 * a successful charge — purely so those downstream endpoints can be tested
 * against real data in this session. It is not shipped, not run in
 * production, and does not change what the live API will do for a real user.
 *
 * Usage: npx tsx scripts/dev-seed-reservation.ts <email> <listingSlug>
 */
import { prisma } from "../src/db.js";
import { quote } from "../src/lib/pricing.js";
import { newReservationReference } from "../src/lib/tokens.js";

async function main() {
  const [email, slug] = process.argv.slice(2);
  if (!email || !slug) {
    console.error("Usage: npx tsx scripts/dev-seed-reservation.ts <email> <listingSlug>");
    process.exit(1);
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const listing = await prisma.listing.findUniqueOrThrow({ where: { slug } });
  const vehicle = await prisma.vehicle.findFirstOrThrow({ where: { userId: user.id } });

  const startAt = new Date(Date.now() - 3 * 3600_000);
  const endAt = new Date(Date.now() - 1 * 3600_000); // already ended, so it settles to "completed"
  const minutes = 120;

  const price = quote({
    pricePerHourCents: listing.pricePerHourCents,
    dailyMaxCents: listing.dailyMaxCents,
    minutes,
    currency: listing.currency,
  });

  const reservation = await prisma.reservation.create({
    data: {
      reference: newReservationReference(),
      status: "confirmed",
      listingId: listing.id,
      userId: user.id,
      vehicleId: vehicle.id,
      startAt,
      endAt,
      currency: price.currency,
      subtotalCents: price.subtotalCents,
      serviceFeeCents: price.serviceFeeCents,
      taxCents: price.taxCents,
      totalCents: price.totalCents,
      hostEarningsCents: price.hostEarningsCents,
      hostFeeCents: price.hostFeeCents,
      exactAddressLine1: listing.addressLine1,
      exactAddressLine2: listing.addressLine2,
      exactAddressCity: listing.addressCity,
      exactAddressState: listing.addressState,
      exactAddressPostalCode: listing.addressPostalCode,
      exactAddressCountry: listing.addressCountry,
      hostInstructions: listing.privateInstructions,
      cancellationSummary: listing.cancellationSummary,
      cancellationFullRefundHoursBefore: listing.cancellationFullRefundHoursBefore,
      timeline: { create: [{ label: "Reservation confirmed", description: "Payment authorised (dev fixture)." }] },
    },
  });

  await prisma.conversation.create({
    data: { reservationId: reservation.id, listingId: listing.id, driverId: user.id, hostId: listing.hostId },
  });

  console.log(`Created reservation ${reservation.reference} (${reservation.id}), already past its endAt.`);
  console.log("Call settleOverdueReservations (any GET /reservations) to flip it to 'completed'.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
