import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { badRequest, notFound } from "../lib/errors.js";
import { toFacilityDto, toFacilitySummaryDto } from "../lib/sensor-dto.js";
import { subscribeFacility } from "../lib/sensor-realtime.js";

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
