import { prisma } from "../db.js";
import type { NotificationType } from "@prisma/client";

/**
 * Central place every route creates a notification from, so the set of
 * events that actually produce one stays in sync with NotificationType.
 */
export async function createNotification(
  userId: string,
  input: { type: NotificationType; title: string; body: string; href?: string },
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type: input.type, title: input.title, body: input.body, href: input.href },
  });
}
