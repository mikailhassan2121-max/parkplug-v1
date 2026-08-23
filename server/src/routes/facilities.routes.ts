import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/session.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { toFacilityDto, toFacilitySummaryDto, toOccupancyEventDto } from "../lib/sensor-dto.js";
import { subscribeFacility } from "../lib/sensor-realtime.js";
import { computeFacilityAnalytics } from "../lib/sensor-analytics.js";

export const facilitiesRouter = Router();

const bboxSchema = z.object({
  minLat: z.coerce.number().optional(),
  maxLat: z.coerce.number().optional(),
  minLng: z.coerce.number().optional(),
  maxLng: z.coerce.number().optional(),
});

/** Public, unauthenticated — used by the driver-facing /live map. */
facilitiesRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const parsedBbox = bboxSchema.safeParse(req.query);
    if (!parsedBbox.success) throw badRequest("Invalid bounding box.");
    const bbox = parsedBbox.data;
    const hasBbox =
      bbox.minLat !== undefined && bbox.maxLat !== undefined && bbox.minLng !== undefined && bbox.maxLng !== undefined;

    const facilities = await prisma.parkingFacility.findMany({
      where: hasBbox
        ? {
            latitude: { gte: bbox.minLat, lte: bbox.maxLat },
            longitude: { gte: bbox.minLng, lte: bbox.maxLng },
          }
        : undefined,
      include: { spaces: { select: { status: true } } },
    });

    res.json(facilities.map((f) => toFacilitySummaryDto(f, f.spaces)));
  }),
);

/**
 * Owner dashboard listing. A facility with no owner (ownerId null) is
 * unclaimed/demo data and visible to any signed-in host — there is no
 * separate admin role in this app yet, and sensor occupancy itself is not
 * private (the same numbers are already public on /live and the facility
 * page); this only scopes which facilities show up as "yours to manage."
 */
facilitiesRouter.get(
  "/mine",
  requireAuth,
  asyncRoute(async (req, res) => {
    const facilities = await prisma.parkingFacility.findMany({
      where: { OR: [{ ownerId: req.user!.id }, { ownerId: null }] },
      include: { spaces: { include: { sensor: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(facilities.map((f) => toFacilityDto(f, f.spaces)));
  }),
);

async function findFacilityOrThrow(facilityId: string) {
  const facility = await prisma.parkingFacility.findUnique({
    where: { facilityId },
    include: { spaces: { include: { sensor: true } } },
  });
  if (!facility) throw notFound("We could not find that facility.");
  return facility;
}

facilitiesRouter.get(
  "/:facilityId",
  asyncRoute(async (req, res) => {
    const facility = await findFacilityOrThrow(req.params.facilityId!);
    res.json(toFacilityDto(facility, facility.spaces));
  }),
);

/** Same ownership rule as /mine and /analytics: unclaimed (ownerId null) is editable by any signed-in host. */
function assertOwnable(facility: { ownerId: string | null }, userId: string) {
  if (facility.ownerId !== null && facility.ownerId !== userId) {
    throw forbidden("This facility belongs to a different account.");
  }
}

const facilityConfigSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  address: z.string().trim().min(1).max(240).optional(),
});

/** Owner-editable facility configuration — name and address only; location, sensors, and spaces are not editable here. */
facilitiesRouter.patch(
  "/:facilityId",
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = facilityConfigSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid facility configuration.");
    if (Object.keys(parsed.data).length === 0) throw badRequest("Nothing to update.");

    const existing = await prisma.parkingFacility.findUnique({ where: { facilityId: req.params.facilityId! } });
    if (!existing) throw notFound("We could not find that facility.");
    assertOwnable(existing, req.user!.id);

    const facility = await prisma.parkingFacility.update({
      where: { id: existing.id },
      data: parsed.data,
      include: { spaces: { include: { sensor: true } } },
    });
    res.json(toFacilityDto(facility, facility.spaces));
  }),
);

const spaceConfigSchema = z.object({
  active: z.boolean().optional(),
  reservable: z.boolean().optional(),
  accessible: z.boolean().optional(),
  restrictions: z.string().trim().max(280).nullable().optional(),
});

/**
 * Owner-editable space configuration. Deliberately separate from the
 * sensor-reported `status` field — nothing here can be used to fake an
 * occupancy reading, only to describe how the space should be treated
 * operationally (active/inactive, reservable, accessible, restrictions).
 */
facilitiesRouter.patch(
  "/:facilityId/spaces/:spaceId",
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = spaceConfigSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid space configuration.");
    if (Object.keys(parsed.data).length === 0) throw badRequest("Nothing to update.");

    const facility = await prisma.parkingFacility.findUnique({ where: { facilityId: req.params.facilityId! } });
    if (!facility) throw notFound("We could not find that facility.");
    assertOwnable(facility, req.user!.id);

    const space = await prisma.parkingSpace.findUnique({ where: { id: req.params.spaceId! } });
    if (!space || space.facilityId !== facility.id) throw notFound("We could not find that space.");

    await prisma.parkingSpace.update({ where: { id: space.id }, data: parsed.data });

    const updated = await prisma.parkingFacility.findUniqueOrThrow({
      where: { id: facility.id },
      include: { spaces: { include: { sensor: true } } },
    });
    res.json(toFacilityDto(updated, updated.spaces));
  }),
);

/** Recent activity for the owner dashboard — the one place OccupancyEvent history is exposed. */
facilitiesRouter.get(
  "/:facilityId/events",
  requireAuth,
  asyncRoute(async (req, res) => {
    const facility = await prisma.parkingFacility.findUnique({ where: { facilityId: req.params.facilityId! } });
    if (!facility) throw notFound("We could not find that facility.");

    const events = await prisma.occupancyEvent.findMany({
      where: { facilityId: facility.id },
      include: { space: true },
      orderBy: { occurredAt: "desc" },
      take: 30,
    });
    res.json(events.map(toOccupancyEventDto));
  }),
);

/**
 * Owner-scoped analytics — same ownership rule as /mine (an unclaimed,
 * ownerId-null facility is visible to any signed-in host; an owned one only
 * to its owner). See server/src/lib/sensor-analytics.ts for how the
 * sparkline and busiest-hour rollups are derived from real OccupancyEvent
 * history, and why timezone matters only for the latter.
 */
facilitiesRouter.get(
  "/:facilityId/analytics",
  requireAuth,
  asyncRoute(async (req, res) => {
    const facility = await prisma.parkingFacility.findUnique({
      where: { facilityId: req.params.facilityId! },
      include: { spaces: { select: { id: true, status: true } } },
    });
    if (!facility) throw notFound("We could not find that facility.");
    if (facility.ownerId !== null && facility.ownerId !== req.user!.id) {
      throw forbidden("This facility belongs to a different account.");
    }

    // Every event ever recorded for this facility — the sparkline needs the
    // full history to correctly know each space's status going into the
    // 24h window, not just events that happened to land inside it. Bounded
    // to a generous cap since this is demo-scale data; a facility running
    // long enough to exceed it would want a narrower lookback query instead.
    const events = await prisma.occupancyEvent.findMany({
      where: { facilityId: facility.id },
      select: { spaceId: true, previousStatus: true, newStatus: true, occurredAt: true, source: true },
      orderBy: { occurredAt: "asc" },
      take: 5000,
    });

    res.json(computeFacilityAnalytics(facility.timezone, facility.spaces, events));
  }),
);

/**
 * Server-Sent Events. Consumed directly by the browser — Netlify serverless
 * functions can't hold a connection like this open, so the frontend hook
 * talks to this Railway origin directly rather than through a Next.js route.
 */
facilitiesRouter.get(
  "/:facilityId/stream",
  asyncRoute(async (req, res) => {
    const facility = await findFacilityOrThrow(req.params.facilityId!);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders?.();

    function send(event: string, data: unknown) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }

    send("update", { facility: toFacilityDto(facility, facility.spaces) });

    const unsubscribe = subscribeFacility(facility.id, (update) => send("update", update));

    // Keeps the connection alive through proxies/load balancers that would
    // otherwise time out an idle stream.
    const keepAlive = setInterval(() => res.write(`: ping\n\n`), 20_000);

    req.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
      res.end();
    });
  }),
);
