import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/session.js";
import { toReviewDto } from "../lib/dto.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";
import { createNotification } from "../lib/notifications.js";
import { settleOverdueReservations } from "../lib/reservation-lifecycle.js";

export const reviewsRouter = Router();

const scoreSchema = z.number().int().min(1).max(5);

const createSchema = z.object({
  reservationId: z.string().min(1),
  // listingId is deliberately not accepted here — it's always derived from
  // the reservation itself, never trusted from the client.
  rating: scoreSchema,
  categories: z
    .object({ accuracy: scoreSchema, access: scoreSchema, safety: scoreSchema, value: scoreSchema })
    .optional(),
  driverScores: z
    .object({ communication: scoreSchema, timeliness: scoreSchema, ruleCompliance: scoreSchema })
    .optional(),
  body: z.string().trim().min(10, "Write at least a sentence about your experience."),
  privateFeedback: z.string().trim().optional(),
});

reviewsRouter.post(
  "/",
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Check your review and try again.");
    const d = parsed.data;

    await settleOverdueReservations();

    const reservation = await prisma.reservation.findUnique({
      where: { id: d.reservationId },
      include: { listing: true, review: true },
    });
    if (!reservation) throw notFound("We could not find that reservation.");

    // The role is inferred from the reservation, never trusted from the
    // client — a driver cannot submit a "host" review or vice versa by
    // tampering with the request body.
    const role: "driver" | "host" =
      reservation.userId === req.user!.id
        ? "driver"
        : reservation.listing.hostId === req.user!.id
          ? "host"
          : (() => {
              throw forbidden("You were not part of this reservation.");
            })();

    if (reservation.status !== "completed") {
      throw badRequest("You can review this reservation after it is complete.");
    }
    if (reservation.review) {
      throw conflict("You have already reviewed this reservation.");
    }

    const review = await prisma.review.create({
      data: {
        // The reservation's own listing, never the client-supplied one — a
        // driver could otherwise attach a review to any active listing.
        listingId: reservation.listingId,
        reservationId: d.reservationId,
        authorId: req.user!.id,
        role,
        rating: d.rating,
        body: d.body,
        privateFeedback: d.privateFeedback,
        ...(role === "driver" && d.categories
          ? {
              categoryAccuracy: d.categories.accuracy,
              categoryAccess: d.categories.access,
              categorySafety: d.categories.safety,
              categoryValue: d.categories.value,
            }
          : {}),
        ...(role === "host" && d.driverScores
          ? {
              categoryCommunication: d.driverScores.communication,
              categoryTimeliness: d.driverScores.timeliness,
              categoryRuleCompliance: d.driverScores.ruleCompliance,
            }
          : {}),
      },
      include: { author: true },
    });

    await createNotification(role === "driver" ? reservation.listing.hostId : reservation.userId, {
      type: "review_reminder",
      title: "You have a new review",
      body: reservation.listing.title,
      href: role === "driver" ? "/host/reviews" : `/spaces/${reservation.listing.slug}`,
    });

    res.status(201).json(toReviewDto(review));
  }),
);
