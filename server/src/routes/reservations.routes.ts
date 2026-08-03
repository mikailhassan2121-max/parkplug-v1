import { Router } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/session.js";
import { toReservationDto } from "../lib/dto.js";
import { badRequest, conflict, notFound, paymentFailed, paymentUnavailable } from "../lib/errors.js";
import { quote } from "../lib/pricing.js";
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
  paymentMethodId: z.string().optional(),
});

reservationsRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Check your reservation details and try again.");
    const d = parsed.data;

    const listing = await prisma.listing.findUnique({ where: { slug: d.listingSlug } });
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

    // Reject a double booking rather than silently overlapping it.
    const clash = await prisma.reservation.findFirst({
      where: {
        listingId: listing.id,
        status: { in: ["confirmed", "in_progress"] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (clash) throw conflict("That time was just reserved by someone else.");

    // Every free validation has passed — only now is it worth attempting a
    // real charge (or reporting that no payment provider is connected).
    if (!paymentsConfigured) {
      throw paymentUnavailable(
        "ParkPlugs is not connected to a payment provider yet, so this reservation cannot be completed.",
      );
    }

    const price = quote({
      pricePerHourCents: listing.pricePerHourCents,
      dailyMaxCents: listing.dailyMaxCents,
      minutes,
      currency: listing.currency,
    });

    let paymentIntentId: string | undefined;
    try {
      const intent = await stripe!.paymentIntents.create({
        amount: price.totalCents,
        currency: listing.currency.toLowerCase(),
        payment_method: d.paymentMethodId,
        confirm: Boolean(d.paymentMethodId),
        automatic_payment_methods: d.paymentMethodId ? undefined : { enabled: true },
        metadata: { listingId: listing.id, userId: req.user!.id },
      });
      paymentIntentId = intent.id;
      if (d.paymentMethodId && intent.status !== "succeeded" && intent.status !== "processing") {
        throw new Error(`Payment intent status: ${intent.status}`);
      }
    } catch (error) {
      console.error("[stripe] payment intent failed:", error);
      throw paymentFailed(
        "Your payment could not be completed. No charge was made and your reservation was not created.",
      );
    }

    const reference = newReservationReference();
    const now = new Date();

    const reservation = await prisma.reservation.create({
      data: {
        reference,
        status: "confirmed",
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
        stripePaymentIntentId: paymentIntentId,
        timeline: { create: [{ at: now, label: "Reservation confirmed", description: "Payment authorised." }] },
      },
      include,
    });

    // Every reservation gets exactly one conversation, scoped to it, so a
    // driver and host can only reach each other about a booking they share.
    await prisma.conversation.create({
      data: {
        reservationId: reservation.id,
        listingId: listing.id,
        driverId: req.user!.id,
        hostId: listing.hostId,
      },
    });

    await createNotification(req.user!.id, {
      type: "reservation_confirmed",
      title: "Reservation confirmed",
      body: `${listing.title} · ${reservation.reference}`,
      href: `/reservations/${reservation.reference}`,
    });
    await createNotification(listing.hostId, {
      type: "host_new_booking",
      title: "New booking",
      body: `${listing.title} was just reserved for ${startAt.toLocaleDateString()}`,
      href: `/host/reservations`,
    });

    res.status(201).json(toReservationDto(reservation));
  }),
);

reservationsRouter.post(
  "/:reference/cancel",
  asyncRoute(async (req, res) => {
    const reservation = await prisma.reservation.findFirst({
      where: { reference: req.params.reference, userId: req.user!.id },
      include: { listing: true },
    });
    if (!reservation) throw notFound("We could not find that reservation.");
    if (reservation.status === "canceled") throw conflict("This reservation is already canceled.");

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
