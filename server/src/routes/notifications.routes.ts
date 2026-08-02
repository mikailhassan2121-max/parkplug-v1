import { Router } from "express";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/session.js";
import { toNotificationDto } from "../lib/dto.js";
import { forbidden, notFound } from "../lib/errors.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(notifications.map(toNotificationDto));
  }),
);

notificationsRouter.post(
  "/read-all",
  asyncRoute(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json(null);
  }),
);

async function owned(userId: string, id: string) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw notFound();
  if (notification.userId !== userId) throw forbidden();
  return notification;
}

notificationsRouter.post(
  "/:id/read",
  asyncRoute(async (req, res) => {
    await owned(req.user!.id, req.params.id!);
    await prisma.notification.update({ where: { id: req.params.id }, data: { readAt: new Date() } });
    res.json(null);
  }),
);

notificationsRouter.delete(
  "/:id",
  asyncRoute(async (req, res) => {
    await owned(req.user!.id, req.params.id!);
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json(null);
  }),
);
