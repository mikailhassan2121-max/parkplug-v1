import { Router } from "express";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/session.js";
import { toListingSummaryDto } from "../lib/dto.js";

export const savedRouter = Router();
savedRouter.use(requireAuth);

savedRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const saved = await prisma.savedListing.findMany({
      where: { userId: req.user!.id },
      include: { listing: { include: { photos: true, availability: true, host: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(saved.map((s) => toListingSummaryDto(s.listing)));
  }),
);

savedRouter.post(
  "/:listingId",
  asyncRoute(async (req, res) => {
    const existing = await prisma.savedListing.findUnique({
      where: { userId_listingId: { userId: req.user!.id, listingId: req.params.listingId! } },
    });

    if (existing) {
      await prisma.savedListing.delete({ where: { id: existing.id } });
      res.json({ saved: false });
      return;
    }

    await prisma.savedListing.create({
      data: { userId: req.user!.id, listingId: req.params.listingId! },
    });
    res.json({ saved: true });
  }),
);
