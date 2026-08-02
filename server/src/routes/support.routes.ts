import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { attachSession } from "../middleware/session.js";
import { badRequest } from "../lib/errors.js";
import { newTicketReference } from "../lib/tokens.js";
import { sendMail } from "../lib/mailer.js";
import { env } from "../env.js";

export const supportRouter = Router();

const schema = z.object({
  category: z.string().min(1),
  reference: z.string().optional(),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  description: z.string().trim().min(1),
  preferredResponse: z.string().min(1),
  attachmentUrl: z.string().optional(),
});

// The support form is reachable while signed out, so this only attaches a
// session when one exists rather than requiring sign-in.
supportRouter.post(
  "/tickets",
  attachSession,
  asyncRoute(async (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Check the highlighted fields and try again.");
    const d = parsed.data;

    const reference = newTicketReference();
    await prisma.supportTicket.create({
      data: {
        reference,
        category: d.category,
        reservationReference: d.reference,
        name: d.name,
        email: d.email,
        description: d.description,
        preferredResponse: d.preferredResponse,
        attachmentUrl: d.attachmentUrl,
        userId: req.user?.id,
      },
    });

    void sendMail({
      to: d.email,
      subject: `We received your message — ${reference}`,
      text: `Thanks for contacting ParkPlug support.\n\nReference: ${reference}\nCategory: ${d.category}\n\n${d.description}\n\nWe will follow up at this address.`,
    });
    if (env.SUPPORT_NOTIFY_EMAIL) {
      // Best-effort internal notice; failure here must never fail the ticket.
      void sendMail({
        to: env.SUPPORT_NOTIFY_EMAIL,
        subject: `New support ticket ${reference}`,
        text: d.description,
      });
    }

    res.status(201).json({ ticketReference: reference });
  }),
);
