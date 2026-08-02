import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/session.js";
import { userLimiter } from "../middleware/rate-limit.js";
import { toReportDto } from "../lib/dto.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { newTicketReference } from "../lib/tokens.js";

export const reportsRouter = Router();

const RESTRICTIONS = [
  "time_limited",
  "metered",
  "free_certain_hours",
  "permit_required",
  "street_cleaning",
  "loading_zone",
  "accessible_only",
  "other",
  "unknown",
] as const;

reportsRouter.get(
  "/mine",
  requireAuth,
  asyncRoute(async (req, res) => {
    const reports = await prisma.freeParkingReport.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(reports.map(toReportDto));
  }),
);

reportsRouter.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const report = await prisma.freeParkingReport.findUnique({ where: { id: req.params.id } });
    if (!report) throw notFound("This report is no longer available.");
    res.json(toReportDto(report));
  }),
);

const createSchema = z.object({
  location: z.object({
    label: z.string(),
    neighborhood: z.string().optional().nullable(),
    city: z.string(),
    state: z.string(),
    center: z.object({ lat: z.number(), lng: z.number() }),
    radiusMeters: z.number().default(150),
  }),
  observedAt: z.string(),
  spacesObserved: z.number().int().min(1),
  sideOfStreet: z.string().optional().nullable(),
  landmark: z.string().optional().nullable(),
  restrictions: z.array(z.enum(RESTRICTIONS)).min(1),
  restrictionNotes: z.string().optional().nullable(),
  timeLimitMinutes: z.number().int().optional().nullable(),
  confidence: z.enum(["low", "medium", "high"]),
  notes: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
});

reportsRouter.post(
  "/",
  requireAuth,
  userLimiter({ windowMs: 60 * 60_000, limit: 20, message: "Too many reports submitted. Try again later." }),
  asyncRoute(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Check your report and try again.");
    const d = parsed.data;

    const observedAt = new Date(d.observedAt);
    if (observedAt.getTime() > Date.now() + 60_000) {
      throw badRequest("The time you observed the parking cannot be in the future.");
    }

    const lifetimeHours = d.confidence === "high" ? 4 : d.confidence === "medium" ? 2 : 1;
    const now = new Date();

    const report = await prisma.freeParkingReport.create({
      data: {
        userId: req.user!.id,
        locationLabel: d.location.label,
        neighborhood: d.location.neighborhood ?? undefined,
        city: d.location.city,
        state: d.location.state,
        centerLat: d.location.center.lat,
        centerLng: d.location.center.lng,
        radiusMeters: d.location.radiusMeters,
        observedAt,
        expiresAt: new Date(now.getTime() + lifetimeHours * 3600_000),
        spacesObserved: d.spacesObserved,
        sideOfStreet: d.sideOfStreet ?? undefined,
        landmark: d.landmark ?? undefined,
        restrictions: d.restrictions,
        restrictionNotes: d.restrictionNotes ?? undefined,
        timeLimitMinutes: d.timeLimitMinutes ?? undefined,
        confidence: d.confidence,
        notes: d.notes ?? undefined,
        photoUrl: d.photoUrl ?? undefined,
      },
    });

    res.status(201).json(toReportDto(report));
  }),
);

reportsRouter.post(
  "/:id/confirm",
  requireAuth,
  asyncRoute(async (req, res) => {
    const report = await prisma.freeParkingReport.findUnique({ where: { id: req.params.id } });
    if (!report) throw notFound("This report is no longer available.");

    const alreadyVoted = await prisma.reportVote.findUnique({
      where: { reportId_userId_kind: { reportId: report.id, userId: req.user!.id, kind: "confirm" } },
    });

    if (!alreadyVoted) {
      await prisma.$transaction([
        prisma.reportVote.create({ data: { reportId: report.id, userId: req.user!.id, kind: "confirm" } }),
        prisma.freeParkingReport.update({
          where: { id: report.id },
          data: {
            confirmations: { increment: 1 },
            // A fresh confirmation extends how long the report stays visible.
            expiresAt: new Date(Date.now() + 60 * 60_000),
          },
        }),
      ]);
    }

    const updated = await prisma.freeParkingReport.findUniqueOrThrow({ where: { id: report.id } });
    res.json(toReportDto(updated));
  }),
);

reportsRouter.post(
  "/:id/taken",
  requireAuth,
  asyncRoute(async (req, res) => {
    const report = await prisma.freeParkingReport.findUnique({ where: { id: req.params.id } });
    if (!report) throw notFound("This report is no longer available.");

    const alreadyVoted = await prisma.reportVote.findUnique({
      where: { reportId_userId_kind: { reportId: report.id, userId: req.user!.id, kind: "taken" } },
    });

    if (!alreadyVoted) {
      const nextCount = report.markedTakenCount + 1;
      await prisma.$transaction([
        prisma.reportVote.create({ data: { reportId: report.id, userId: req.user!.id, kind: "taken" } }),
        prisma.freeParkingReport.update({
          where: { id: report.id },
          data: {
            markedTakenCount: { increment: 1 },
            status: nextCount >= 2 ? "taken" : undefined,
          },
        }),
      ]);
    }

    const updated = await prisma.freeParkingReport.findUniqueOrThrow({ where: { id: report.id } });
    res.json(toReportDto(updated));
  }),
);

async function ownedReport(userId: string, id: string) {
  const report = await prisma.freeParkingReport.findUnique({ where: { id } });
  if (!report) throw notFound("This report is no longer available.");
  if (report.userId !== userId) throw forbidden();
  return report;
}

reportsRouter.delete(
  "/:id",
  requireAuth,
  asyncRoute(async (req, res) => {
    const report = await ownedReport(req.user!.id, req.params.id!);
    // Soft delete — withdrawn reports keep their row (audit trail) but drop
    // out of search/map/homepage the same as any other non-active status.
    const updated = await prisma.freeParkingReport.update({
      where: { id: report.id },
      data: { status: "withdrawn" },
    });
    res.json(toReportDto(updated));
  }),
);

reportsRouter.post(
  "/:id/expire",
  requireAuth,
  asyncRoute(async (req, res) => {
    const report = await ownedReport(req.user!.id, req.params.id!);
    const updated = await prisma.freeParkingReport.update({
      where: { id: report.id },
      data: { expiresAt: new Date() },
    });
    res.json(toReportDto(updated));
  }),
);

reportsRouter.post(
  "/:id/flag",
  requireAuth,
  asyncRoute(async (req, res) => {
    const report = await prisma.freeParkingReport.findUnique({ where: { id: req.params.id } });
    if (!report) throw notFound("This report is no longer available.");

    const reason = typeof req.body?.reason === "string" ? req.body.reason : "No reason given";
    await prisma.supportTicket.create({
      data: {
        reference: newTicketReference(),
        category: "Public-parking report",
        name: req.user!.fullName,
        email: req.user!.email,
        description: `Report ${report.id} flagged as inaccurate.\nReason: ${reason}`,
        preferredResponse: "email",
        userId: req.user!.id,
      },
    });

    res.json(null);
  }),
);
