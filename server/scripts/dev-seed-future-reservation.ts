/**
 * DEV-ONLY TEST FIXTURE — see dev-seed-reservation.ts for the rationale.
 * Creates an UPCOMING reservation (not yet ended) so cancellation and
 * conflict-detection logic can be exercised.
 *
 * Usage: npx tsx scripts/dev-seed-future-reservation.ts <email> <listingSlug> [hoursFromNow]
 */
import { prisma } from "../src/db.js";
import { quote } from "../src/lib/pricing.js";
import { newReservationReference } from "../src/lib/tokens.js";

async function main() {
  const [email, slug, hoursArg] = process.argv.slice(2);
  if (!email || !slug) {
    console.error("Usage: npx tsx scripts/dev-seed-future-reservation.ts <email> <listingSlug> [hoursFromNow]");
    process.exit(1);
  }
  const hoursFromNow = hoursArg ? Number(hoursArg) : 48;

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const listing = await prisma.listing.findUniqueOrThrow({ where: { slug } });
  const vehicle = await prisma.vehicle.findFirstOrThrow({ where: { userId: user.id } });

  const startAt = new Date(Date.now() + hoursFromNow * 3600_000);
  const endAt = new Date(startAt.getTime() + 4 * 3600_000);
  const price = quote({
    pricePerHourCents: listing.pricePerHourCents,
    dailyMaxCents: listing.dailyMaxCents,
    minutes: 240,
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
      exactAddressCity: listing.addressCity,
      exactAddressState: listing.addressState,
      exactAddressPostalCode: listing.addressPostalCode,
      exactAddressCountry: listing.addressCountry,
      hostInstructions: listing.privateInstructions,
      cancellationSummary: listing.cancellationSummary,
      cancellationFullRefundHoursBefore: listing.cancellationFullRefundHoursBefore,
      timeline: { create: [{ label: "Reservation confirmed" }] },
    },
  });

  await prisma.conversation.create({
    data: { reservationId: reservation.id, listingId: listing.id, driverId: user.id, hostId: listing.hostId },
  });

  console.log(`Created ${reservation.reference}, starting in ${hoursFromNow}h.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
