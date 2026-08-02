import { prisma } from "../db.js";

/**
 * Confirmed reservations become "completed" once their departure time
 * passes. There is no cron running in this deployment, so the transition is
 * applied lazily: every route that lists or reads reservations calls this
 * first. It is cheap (one indexed update) and idempotent, and it's what
 * unlocks review eligibility and host earnings — without it, canReview can
 * never become true and a reservation stays "confirmed" forever.
 */
export async function settleOverdueReservations(): Promise<void> {
  const now = new Date();
  const overdue = await prisma.reservation.findMany({
    where: { status: "confirmed", endAt: { lt: now } },
    select: { id: true },
  });
  if (overdue.length === 0) return;

  const ids = overdue.map((r) => r.id);
  await prisma.$transaction([
    prisma.reservation.updateMany({ where: { id: { in: ids } }, data: { status: "completed" } }),
    prisma.reservationTimelineEvent.createMany({
      data: ids.map((id) => ({ reservationId: id, at: now, label: "Reservation completed" })),
    }),
  ]);
}
