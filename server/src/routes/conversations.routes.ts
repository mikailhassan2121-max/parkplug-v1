import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/session.js";
import { toConversationDto, toMessageDto } from "../lib/dto.js";
import { badRequest, forbidden, notFound } from "../lib/errors.js";
import { createNotification } from "../lib/notifications.js";

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

const include = {
  listing: true,
  driver: true,
  host: true,
  reservation: true,
  messages: { orderBy: { sentAt: "asc" as const } },
};

conversationsRouter.get(
  "/",
  asyncRoute(async (req, res) => {
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ driverId: req.user!.id }, { hostId: req.user!.id }] },
      include,
      orderBy: { createdAt: "desc" },
    });
    res.json(conversations.map((c) => toConversationDto(c, req.user!.id)));
  }),
);

async function ownedConversation(userId: string, id: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id }, include });
  if (!conversation) throw notFound("This conversation is no longer available.");
  if (conversation.driverId !== userId && conversation.hostId !== userId) throw forbidden();
  return conversation;
}

conversationsRouter.get(
  "/:id/messages",
  asyncRoute(async (req, res) => {
    const conversation = await ownedConversation(req.user!.id, req.params.id!);
    res.json(conversation.messages.map((m) => toMessageDto(m, req.user!.id)));
  }),
);

conversationsRouter.post(
  "/:id/messages",
  asyncRoute(async (req, res) => {
    const conversation = await ownedConversation(req.user!.id, req.params.id!);
    const parsed = z.object({ body: z.string().trim().min(1).max(2000) }).safeParse(req.body);
    if (!parsed.success) throw badRequest("Enter a message.");

    const message = await prisma.message.create({
      data: { conversationId: conversation.id, senderId: req.user!.id, body: parsed.data.body },
    });

    const recipientId = req.user!.id === conversation.driverId ? conversation.hostId : conversation.driverId;
    await createNotification(recipientId, {
      type: "new_message",
      title: "New message",
      body: conversation.listing.title,
      href: req.user!.id === conversation.driverId ? `/host/messages/${conversation.id}` : `/messages/${conversation.id}`,
    });

    res.status(201).json(toMessageDto(message, req.user!.id));
  }),
);
