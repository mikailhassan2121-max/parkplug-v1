import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { attachSession, requireAuth } from "../middleware/session.js";
import { toListingHostDto, toListingPublicDto, toReviewDto, obfuscate } from "../lib/dto.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { slugify } from "../lib/tokens.js";
import { env } from "../env.js";

export const listingsRouter = Router();
export const hostListingsRouter = Router();

const PARKING_TYPES = [
  "driveway",
  "garage",
  "private_lot",
  "apartment_space",
  "business_lot",
  "organization_lot",
  "other",
] as const;
const VEHICLE_SIZES = ["compact", "standard", "large", "oversized"] as const;
const AMENITIES = [
  "covered",
  "ev_charging",
  "accessible",
  "lit",
  "gated",
  "camera_monitored",
  "attended",
  "paved",
  "level_entry",
] as const;
const SURFACES = ["asphalt", "concrete", "gravel", "grass", "paver"] as const;

const photoSchema = z.object({
  // Must be one of our own uploaded files (from POST /media/listing-photo) —
  // never an arbitrary external URL or an inline data: URI. Otherwise a
  // client could point a "photo" at unmoderated external content, or embed
  // a multi-MB base64 image directly in this JSON body with none of the
  // EXIF-stripping/format validation the real upload path enforces.
  url: z.string().trim().startsWith(env.PUBLIC_UPLOAD_BASE_URL, "Photos must be uploaded through ParkPlugs."),
  alt: z.string().default(""),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const availabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const draftSchema = z.object({
  street: z.string().trim().min(1),
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  center: z.object({ lat: z.number(), lng: z.number() }),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  parkingType: z.enum(PARKING_TYPES),
  photos: z.array(photoSchema).default([]),
  pricePerHourCents: z.number().int().positive(),
  dailyMaxCents: z.number().int().positive().optional().nullable(),
  currency: z.string().default("USD"),
  spacesTotal: z.number().int().min(1).default(1),
  maxVehicleSize: z.enum(VEHICLE_SIZES),
  heightClearanceCm: z.number().int().positive().optional().nullable(),
  amenities: z.array(z.enum(AMENITIES)).default([]),
  surface: z.enum(SURFACES).optional().nullable(),
  entranceNotes: z.string().optional().nullable(),
  accessibilityNotes: z.string().optional().nullable(),
  minimumMinutes: z.number().int().positive(),
  maximumMinutes: z.number().int().positive(),
  advanceNoticeMinutes: z.number().int().min(0).default(0),
  availability: z.array(availabilitySchema).default([]),
  rules: z.array(z.string()).default([]),
  cancellationPolicy: z.object({
    summary: z.string(),
    fullRefundHoursBefore: z.number().int().min(0),
  }),
  instantBook: z.boolean().default(true),
  privateAddress: z.object({
    line1: z.string().trim().min(1),
    line2: z.string().optional().nullable(),
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    postalCode: z.string().trim().min(1),
    country: z.string().default("US"),
  }),
  privateInstructions: z.string().default(""),
});

/* -------------------------------------------------------------------------
   Public: GET /listings/:slug
   ------------------------------------------------------------------------- */

listingsRouter.get(
  "/:slug",
  attachSession,
  asyncRoute(async (req, res) => {
    const listing = await prisma.listing.findUnique({
      where: { slug: req.params.slug },
      include: { photos: true, availability: true, host: true },
    });
    if (!listing) throw notFound("This space is no longer listed.");

    const isOwner = req.user?.id === listing.hostId;
    if (listing.status !== "active" && !isOwner) {
      throw notFound("This space is no longer listed.");
    }

    if (!isOwner) {
      await prisma.listing.update({ where: { id: listing.id }, data: { viewCount: { increment: 1 } } });
    }

    const [ratingAgg, completedReservations] = await Promise.all([
      prisma.review.aggregate({
        where: { listingId: listing.id, role: "driver" },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.reservation.count({
        where: { listing: { hostId: listing.hostId }, status: "completed" },
      }),
    ]);

    res.json(
      toListingPublicDto(listing, {
        rating:
          ratingAgg._count.rating > 0
            ? { average: ratingAgg._avg.rating ?? 0, count: ratingAgg._count.rating }
            : undefined,
        completedReservations: completedReservations > 0 ? completedReservations : undefined,
      }),
    );
  }),
);

listingsRouter.get(
  "/:id/reviews",
  asyncRoute(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { listingId: req.params.id, role: "driver" },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(reviews.map(toReviewDto));
  }),
);

/* -------------------------------------------------------------------------
   Host: /host/listings
   ------------------------------------------------------------------------- */

hostListingsRouter.use(requireAuth);

hostListingsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const listings = await prisma.listing.findMany({
      where: { hostId: req.user!.id },
      include: { photos: true, availability: true, host: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json(listings.map((l) => toListingHostDto(l)));
  }),
);

hostListingsRouter.post(
  "/",
  asyncRoute(async (req, res) => {
    const parsed = draftSchema.safeParse(req.body?.draft ?? req.body);
    if (!parsed.success) {
      throw badRequest("Check the highlighted fields and try again.", flatten(parsed.error));
    }
    const d = parsed.data;

    const slug = slugify(d.title, crypto.randomUUID());
    const approxCenter = obfuscate(d.center, slug, 200);

    const listing = await prisma.$transaction(async (tx) => {
      const created = await tx.listing.create({
        data: {
          slug,
          hostId: req.user!.id,
          title: d.title,
          description: d.description,
          parkingType: d.parkingType,
          status: env.LISTINGS_AUTO_PUBLISH ? "active" : "in_review",
          pricePerHourCents: d.pricePerHourCents,
          dailyMaxCents: d.dailyMaxCents ?? undefined,
          currency: d.currency,
          spacesTotal: d.spacesTotal,
          maxVehicleSize: d.maxVehicleSize,
          heightClearanceCm: d.heightClearanceCm ?? undefined,
          amenities: d.amenities,
          surface: d.surface ?? undefined,
          entranceNotes: d.entranceNotes ?? undefined,
          accessibilityNotes: d.accessibilityNotes ?? undefined,
          minimumMinutes: d.minimumMinutes,
          maximumMinutes: d.maximumMinutes,
          advanceNoticeMinutes: d.advanceNoticeMinutes,
          rules: d.rules,
          cancellationSummary: d.cancellationPolicy.summary,
          cancellationFullRefundHoursBefore: d.cancellationPolicy.fullRefundHoursBefore,
          instantBook: d.instantBook,
          locationLabel: `Near ${d.street.replace(/^\s*[\d-]+\s+/, "").trim() || d.city}, ${d.city}`,
          neighborhood: d.street.replace(/^\s*[\d-]+\s+/, "").trim() || undefined,
          city: d.city,
          state: d.state,
          centerLat: approxCenter.lat,
          centerLng: approxCenter.lng,
          addressLine1: d.privateAddress.line1,
          addressLine2: d.privateAddress.line2 ?? undefined,
          addressCity: d.privateAddress.city,
          addressState: d.privateAddress.state,
          addressPostalCode: d.privateAddress.postalCode,
          addressCountry: d.privateAddress.country,
          privateInstructions: d.privateInstructions,
          photos: { create: d.photos.map((p, i) => ({ ...p, position: i })) },
          availability: { create: d.availability },
        },
        include: { photos: true, availability: true, host: true },
      });

      if (!req.user!.isHost) {
        await tx.user.update({ where: { id: req.user!.id }, data: { isHost: true } });
      }

      return created;
    });

    res.status(201).json(toListingHostDto(listing));
  }),
);

async function ownedListing(hostId: string, id: string) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw notFound("That listing no longer exists.");
  if (listing.hostId !== hostId) throw forbidden();
  return listing;
}

const updateSchema = draftSchema.partial().extend({
  status: z.enum(["draft", "in_review", "needs_changes", "active", "paused", "archived"]).optional(),
});

hostListingsRouter.patch(
  "/:id",
  asyncRoute(async (req, res) => {
    await ownedListing(req.user!.id, req.params.id!);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Check the highlighted fields and try again.", flatten(parsed.error));
    const d = parsed.data;

    const listing = await prisma.$transaction(async (tx) => {
      if (d.photos) {
        await tx.listingPhoto.deleteMany({ where: { listingId: req.params.id } });
      }
      if (d.availability) {
        await tx.listingAvailability.deleteMany({ where: { listingId: req.params.id } });
      }

      return tx.listing.update({
        where: { id: req.params.id },
        data: {
          ...(d.title !== undefined ? { title: d.title } : {}),
          ...(d.description !== undefined ? { description: d.description } : {}),
          ...(d.parkingType !== undefined ? { parkingType: d.parkingType } : {}),
          ...(d.status !== undefined ? { status: d.status } : {}),
          ...(d.pricePerHourCents !== undefined ? { pricePerHourCents: d.pricePerHourCents } : {}),
          ...(d.dailyMaxCents !== undefined ? { dailyMaxCents: d.dailyMaxCents } : {}),
          ...(d.spacesTotal !== undefined ? { spacesTotal: d.spacesTotal } : {}),
          ...(d.maxVehicleSize !== undefined ? { maxVehicleSize: d.maxVehicleSize } : {}),
          ...(d.heightClearanceCm !== undefined ? { heightClearanceCm: d.heightClearanceCm } : {}),
          ...(d.amenities !== undefined ? { amenities: d.amenities } : {}),
          ...(d.surface !== undefined ? { surface: d.surface } : {}),
          ...(d.entranceNotes !== undefined ? { entranceNotes: d.entranceNotes } : {}),
          ...(d.accessibilityNotes !== undefined ? { accessibilityNotes: d.accessibilityNotes } : {}),
          ...(d.minimumMinutes !== undefined ? { minimumMinutes: d.minimumMinutes } : {}),
          ...(d.maximumMinutes !== undefined ? { maximumMinutes: d.maximumMinutes } : {}),
          ...(d.advanceNoticeMinutes !== undefined ? { advanceNoticeMinutes: d.advanceNoticeMinutes } : {}),
          ...(d.rules !== undefined ? { rules: d.rules } : {}),
          ...(d.privateInstructions !== undefined ? { privateInstructions: d.privateInstructions } : {}),
          ...(d.cancellationPolicy
            ? {
                cancellationSummary: d.cancellationPolicy.summary,
                cancellationFullRefundHoursBefore: d.cancellationPolicy.fullRefundHoursBefore,
              }
            : {}),
          ...(d.photos ? { photos: { create: d.photos.map((p, i) => ({ ...p, position: i })) } } : {}),
          ...(d.availability ? { availability: { create: d.availability } } : {}),
        },
        include: { photos: true, availability: true, host: true },
      });
    });

    res.json(toListingHostDto(listing));
  }),
);

hostListingsRouter.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    await ownedListing(req.user!.id, req.params.id!);
    const reservationCount = await prisma.reservation.count({ where: { listingId: req.params.id } });
    // A listing with reservation history can't be hard-deleted (Reservation
    // -> Listing is onDelete: Restrict on purpose, the same reason DELETE
    // /auth/account archives rather than deletes) — archive it instead of
    // making the caller retry as a separate step.
    if (reservationCount > 0) {
      await prisma.listing.update({ where: { id: req.params.id }, data: { status: "archived" } });
      res.json({ archived: true });
      return;
    }
    await prisma.listing.delete({ where: { id: req.params.id } });
    res.json({ archived: false });
  }),
);

function flatten(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key) out[key] = issue.message;
  }
  return out;
}
