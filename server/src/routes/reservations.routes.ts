import { Router } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/session.js";
import { toReservationDto } from "../lib/dto.js";
import { badRequest, conflict, hostNotReady, notFound, paymentFailed, paymentUnavailable } from "../lib/errors.js";
import { quote } from "../lib/pricing.js";
import { isWithinAvailability } from "../lib/availability.js";
import { newReservationReference } from "../lib/tokens.js";
import { env, paymentsConfigured } from "../env.js";
import { createNotification } from "../lib/notifications.js";
import { settleOverdueReservations } from "../lib/reservation-lifecycle.js";

export const reservationsRouter = Router();
reservationsRouter.use(requireAuth);

const stripe = paymentsConfigured ? new Stripe(env.STRIPE_SECRET_KEY) : null;

function minutesBetween(startIso: string, endIso: string): number {
  return Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
}

const include = {
  listing: { include: { photos: true, availability: true, host: true } },
  vehicle: true,
  timeline: true,
} as const;

reservationsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    await settleOverdueReservations();
    const reservations = await prisma.reservation.findMany({
      where: { userId: req.user!.id },
      include,
      orderBy: { startAt: "desc" },
    });
    res.json(reservations.map(toReservationDto));
  }),
);

reservationsRouter.get(
  "/:reference",
  asyncRoute(async (req, res) => {
    await settleOverdueReservations();
    const reservation = await prisma.reservation.findFirst({
      where: { reference: req.params.reference, userId: req.user!.id },
      include,
    });
    if (!reservation) throw notFound("We could not find that reservation.");
    res.json(toReservationDto(reservation));
  }),
);

const createSchema = z.object({
  listingSlug: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  vehicleId: z.string().min(1),
});

reservationsRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Check your reservation details and try again.");
    const d = parsed.data;

    const listing = await prisma.listing.findUnique({
      where: { slug: d.listingSlug },
      include: { availability: true },
    });
    if (!listing || listing.status !== "active") throw notFound("This space is no longer listed.");

    const vehicle = await prisma.vehicle.findUnique({ where: { id: d.vehicleId } });
    if (!vehicle || vehicle.userId !== req.user!.id) {
      throw badRequest("Choose a vehicle for this reservation.");
    }

    const startAt = new Date(d.startAt);
    const endAt = new Date(d.endAt);
    const minutes = minutesBetween(d.startAt, d.endAt);

    if (!(endAt > startAt)) throw badRequest("Departure must be after arrival.");
    if (minutes < listing.minimumMinutes) {
      throw badRequest(`This space has a minimum reservation of ${listing.minimumMinutes} minutes.`);
    }
    if (minutes > listing.maximumMinutes) {
      throw badRequest(`This space allows at most ${listing.maximumMinutes} minutes.`);
    }
    if (!isWithinAvailability(startAt, endAt, listing.availability)) {
      throw badRequest("This time falls outside the space's posted availability.");
    }

    // Every free validation has passed — only now is it worth attempting a
    // real charge (or reporting that no payment provider is connected).
    if (!paymentsConfigured) {
      throw paymentUnavailable(
        "ParkPlugs is not connected to a payment provider yet, so this reservation cannot be completed.",
      );
    }

    // A destination charge needs a Stripe Connect account on the other end —
    // without one, the platform would be left holding the full payment with
    // no way to pay the host, so this fails the booking outright rather than
    // quietly keeping money that was never ParkPlugs's to keep.
    const payoutAccount = await prisma.payoutAccount.findUnique({ where: { userId: listing.hostId } });
    if (!payoutAccount || payoutAccount.state !== "complete" || !payoutAccount.stripeAccountId) {
      throw hostNotReady("This host has not finished setting up payouts yet, so this space cannot accept bookings right now.");
    }

    const price = quote({
      pricePerHourCents: listing.pricePerHourCents,
      dailyMaxCents: listing.dailyMaxCents,
      minutes,
      currency: listing.currency,
    });
    if (price.hostEarningsCents === undefined) {
      throw paymentUnavailable("Fees are not configured, so this reservation cannot be priced.");
    }
    // Everything that isn't the host's share — the platform's cut, in cents.
    const applicationFeeAmount = price.totalCents - price.hostEarningsCents;

    const reference = newReservationReference();
    const now = new Date();

    // The clash check and the insert must be atomic, or two requests can
    // both pass the check before either commits (TOCTOU) — a real Stripe
    // network round-trip used to sit between the two, widening that window
    // further. pg_advisory_xact_lock serializes concurrent booking attempts
    // for the same listing; it's released automatically at transaction end
    // either way. The reservation is created here, before any charge is
    // attempted — this reserves the slot first and charges second, so a
    // failed charge just deletes an unpaid row instead of needing to unwind
    // a real payment.
    const reservation = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${listing.id})::bigint)`;

      // Counted against spacesTotal, not rejected on any overlap — a
      // multi-space listing should accept as many concurrent bookings as it
      // has physical spaces for.
      const overlapping = await tx.reservation.count({
        where: {
          listingId: listing.id,
          status: { in: ["pending", "confirmed", "in_progress"] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });
      if (overlapping >= listing.spacesTotal) {
        throw conflict("That time was just reserved by someone else.");
      }

      return tx.reservation.create({
        data: {
          reference,
          status: "pending",
          paymentStatus: "requires_payment",
          listingId: listing.id,
          userId: req.user!.id,
          vehicleId: vehicle.id,
          startAt,
          endAt,
          currency: price.currency,
          subtotalCents: price.subtotalCents,
          discountCents: price.discountCents,
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
          timeline: { create: [{ at: now, label: "Reservation started", description: "Awaiting payment confirmation." }] },
        },
        include,
      });
    });

    let intent: Stripe.PaymentIntent;
    try {
      // Not confirmed here — the frontend confirms client-side against the
      // returned client_secret with Stripe Elements (see booking-flow.tsx).
      // Stripe's own webhook (payment_intent.succeeded) is what actually
      // confirms the reservation, not this synchronous response.
      intent = await stripe!.paymentIntents.create({
        amount: price.totalCents,
        currency: listing.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        transfer_data: { destination: payoutAccount.stripeAccountId },
        application_fee_amount: applicationFeeAmount,
        metadata: { listingId: listing.id, userId: req.user!.id, reservationReference: reference },
      });
    } catch (error) {
      console.error("[stripe] payment intent failed:", error);
      // The slot was reserved above but no charge could be started — release
      // it rather than leaving an unpayable row occupying the window.
      await prisma.reservation.delete({ where: { id: reservation.id } });
      throw paymentFailed("Your payment could not be started. Your reservation was not created.");
    }

    const withIntent = await prisma.reservation.update({
      where: { id: reservation.id },
      data: { stripePaymentIntentId: intent.id },
      include,
    });

    // Every reservation gets exactly one conversation, scoped to it, so a
    // driver and host can only reach each other about a booking they share.
    // Created immediately (not gated on payment) so it exists the moment a
    // reservation reference does.
    await prisma.conversation.create({
      data: {
        reservationId: withIntent.id,
        listingId: listing.id,
        driverId: req.user!.id,
        hostId: listing.hostId,
      },
    });

    // No "confirmed" notification yet — that fires from the
    // payment_intent.succeeded webhook once payment actually captures, not
    // from this synchronous response.
    res.status(201).json({ ...toReservationDto(withIntent), clientSecret: intent.client_secret });
  }),
);

reservationsRouter.post(
  "/:reference/cancel",
  asyncRoute(async (req, res) => {
    // Settles anything whose endAt has already passed to "completed" first,
    // so a reservation that finished moments ago can't slip through the
    // status check below while still showing a stale "confirmed".
    await settleOverdueReservations();
    const reservation = await prisma.reservation.findFirst({
      where: { reference: req.params.reference, userId: req.user!.id },
      include: { listing: true },
    });
    if (!reservation) throw notFound("We could not find that reservation.");
    if (reservation.status === "canceled") throw conflict("This reservation is already canceled.");
    if (reservation.status === "completed") {
      throw conflict("This reservation has already been completed and can no longer be canceled.");
    }

    const now = new Date();
    const hoursUntilArrival = (reservation.startAt.getTime() - now.getTime()) / 3600_000;
    const fullRefund = hoursUntilArrival >= reservation.cancellationFullRefundHoursBefore;

    if (stripe && reservation.stripePaymentIntentId) {
      try {
        await stripe.refunds.create({
          payment_intent: reservation.stripePaymentIntentId,
          amount: fullRefund ? undefined : Math.round(reservation.totalCents / 2),
        });
      } catch (error) {
        console.error("[stripe] refund failed:", error);
      }
    }

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: "canceled",
        canceledAt: now,
        timeline: {
          create: {
            at: now,
            label: "Reservation canceled",
            description: fullRefund ? "Refunded in full." : "Partial refund issued per the cancellation policy.",
          },
        },
      },
      include,
    });

    await createNotification(reservation.listing.hostId, {
      type: "reservation_canceled",
      title: "Reservation canceled",
      body: `${reservation.listing.title} · ${reservation.reference}`,
      href: `/host/reservations`,
    });

    res.json(toReservationDto(updated));
  }),
);

/* ------------------------------- Host-facing ------------------------------- */

export const hostReservationsRouter = Router();
hostReservationsRouter.use(requireAuth);

hostReservationsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    await settleOverdueReservations();
    const reservations = await prisma.reservation.findMany({
      where: { listing: { hostId: req.user!.id } },
      include,
      orderBy: { startAt: "asc" },
    });
    res.json(reservations.map(toReservationDto));
  }),
);
