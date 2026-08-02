import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { boundingBox, distanceMeters } from "../lib/geo.js";
import { toListingSummaryDto, toReportDto } from "../lib/dto.js";
import { badRequest } from "../lib/errors.js";

export const searchRouter = Router();

const querySchema = z.object({
  destination: z.string().default(""),
  center: z.object({ lat: z.number(), lng: z.number() }).optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  vehicleSize: z.enum(["compact", "standard", "large", "oversized"]).optional(),
  sort: z
    .enum(["recommended", "closest", "price_low", "rating_high", "recently_reported", "available_soonest"])
    .default("recommended"),
  filters: z.object({
    includePaid: z.boolean().default(true),
    includeFree: z.boolean().default(true),
    availableNow: z.boolean().default(false),
    maxPriceCents: z.number().optional(),
    maxDistanceMeters: z.number().optional(),
    parkingTypes: z.array(z.string()).default([]),
    amenities: z.array(z.string()).default([]),
    instantBookOnly: z.boolean().default(false),
    minRating: z.number().optional(),
    minHeightClearanceCm: z.number().optional(),
  }),
});

function minutesBetween(startIso?: string, endIso?: string): number {
  if (!startIso || !endIso) return 0;
  return Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
}

/** Minutes since Sunday 00:00 UTC, for the "available now" filter. */
function nowWithinWeek(): { day: number; time: string } {
  const now = new Date();
  return {
    day: now.getUTCDay(),
    time: `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`,
  };
}

searchRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const parsed = querySchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Check your search and try again.");
    const q = parsed.data;

    if (!q.center) throw badRequest("Choose a destination to search near.");

    const maxDistance = q.filters.maxDistanceMeters ?? 5000;
    const bbox = boundingBox(q.center, maxDistance);
    const minutes = minutesBetween(q.startAt, q.endAt);

    let listings: Awaited<ReturnType<typeof loadListings>> = [];
    let reports: Awaited<ReturnType<typeof loadReports>> = [];
    let partial: { failed: "listings" | "reports"; message: string } | undefined;

    async function loadListings() {
      const candidates = await prisma.listing.findMany({
        where: {
          status: "active",
          centerLat: { gte: bbox.south, lte: bbox.north },
          centerLng: { gte: bbox.west, lte: bbox.east },
          ...(q.filters.parkingTypes.length ? { parkingType: { in: q.filters.parkingTypes as never } } : {}),
          ...(q.filters.amenities.length ? { amenities: { hasSome: q.filters.amenities as never } } : {}),
          ...(q.filters.maxPriceCents !== undefined ? { pricePerHourCents: { lte: q.filters.maxPriceCents } } : {}),
          ...(q.filters.instantBookOnly ? { instantBook: true } : {}),
        },
        include: { photos: true, availability: true, host: true },
      });

      const withinRadius = candidates.filter(
        (l) => distanceMeters(q.center!, { lat: l.centerLat, lng: l.centerLng }) <= maxDistance,
      );

      const available = q.filters.availableNow
        ? (() => {
            const now = nowWithinWeek();
            return withinRadius.filter((l) =>
              l.availability.some(
                (w) => w.dayOfWeek === now.day && w.startTime <= now.time && w.endTime >= now.time,
              ),
            );
          })()
        : withinRadius;

      const heightFiltered = q.filters.minHeightClearanceCm
        ? available.filter(
            (l) => l.heightClearanceCm === null || l.heightClearanceCm >= q.filters.minHeightClearanceCm!,
          )
        : available;

      const ratings =
        heightFiltered.length > 0
          ? await prisma.review.groupBy({
              by: ["listingId"],
              where: { listingId: { in: heightFiltered.map((l) => l.id) }, role: "driver" },
              _avg: { rating: true },
              _count: { rating: true },
            })
          : [];
      const ratingById = new Map(ratings.map((r) => [r.listingId, { average: r._avg.rating ?? 0, count: r._count.rating }]));

      const rated = q.filters.minRating
        ? heightFiltered.filter((l) => (ratingById.get(l.id)?.average ?? 0) >= q.filters.minRating!)
        : heightFiltered;

      const summaries = rated.map((l) =>
        toListingSummaryDto(l, { center: q.center, minutes, rating: ratingById.get(l.id) }),
      );

      return summaries.sort((a, b) => {
        switch (q.sort) {
          case "price_low":
            return a.pricePerHourCents - b.pricePerHourCents;
          case "rating_high":
            return (b.rating?.average ?? 0) - (a.rating?.average ?? 0);
          default:
            return (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);
        }
      });
    }

    async function loadReports() {
      const candidates = await prisma.freeParkingReport.findMany({
        where: {
          status: "active",
          expiresAt: { gt: new Date() },
          centerLat: { gte: bbox.south, lte: bbox.north },
          centerLng: { gte: bbox.west, lte: bbox.east },
        },
      });
      const withinRadius = candidates.filter(
        (r) => distanceMeters(q.center!, { lat: r.centerLat, lng: r.centerLng }) <= maxDistance,
      );
      const sorted =
        q.sort === "recently_reported"
          ? [...withinRadius].sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime())
          : withinRadius;
      return sorted.map(toReportDto);
    }

    if (q.filters.includePaid) {
      try {
        listings = await loadListings();
      } catch (error) {
        console.error(error);
        partial = { failed: "listings", message: "Reservable parking could not be loaded right now." };
      }
    }
    if (q.filters.includeFree) {
      try {
        reports = await loadReports();
      } catch (error) {
        console.error(error);
        partial = { failed: "reports", message: "Community reports could not be loaded right now." };
      }
    }

    res.json({ listings, reports, center: q.center, partial });
  }),
);
