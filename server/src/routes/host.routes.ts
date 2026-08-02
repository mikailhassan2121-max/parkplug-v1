import { Router } from "express";
import Stripe from "stripe";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/session.js";
import { feesConfigured, env, paymentsConfigured } from "../env.js";
import { paymentUnavailable } from "../lib/errors.js";
import { settleOverdueReservations } from "../lib/reservation-lifecycle.js";

export const hostRouter = Router();
hostRouter.use(requireAuth);

const stripe = paymentsConfigured ? new Stripe(env.STRIPE_SECRET_KEY) : null;

hostRouter.get(
  "/earnings",
  asyncRoute(async (req, res) => {
    await settleOverdueReservations();

    const [lifetime, pending] = await Promise.all([
      prisma.reservation.aggregate({
        where: { listing: { hostId: req.user!.id }, status: "completed" },
        _sum: { hostEarningsCents: true },
      }),
      prisma.reservation.aggregate({
        where: { listing: { hostId: req.user!.id }, status: { in: ["confirmed", "in_progress"] } },
        _sum: { hostEarningsCents: true },
      }),
    ]);

    res.json({
      currency: "USD",
      availableBalanceCents: feesConfigured ? (lifetime._sum.hostEarningsCents ?? 0) : 0,
      pendingCents: feesConfigured ? (pending._sum.hostEarningsCents ?? 0) : 0,
      lifetimeCents: feesConfigured ? (lifetime._sum.hostEarningsCents ?? 0) : 0,
    });
  }),
);

hostRouter.get(
  "/transactions",
  asyncRoute(async (req, res) => {
    await settleOverdueReservations();

    const reservations = await prisma.reservation.findMany({
      where: { listing: { hostId: req.user!.id }, hostEarningsCents: { not: null } },
      include: { listing: true },
      orderBy: { startAt: "desc" },
      take: 200,
    });

    res.json(
      reservations.map((r) => ({
        id: r.id,
        kind: "reservation" as const,
        description: r.listing.title,
        occurredAt: r.startAt.toISOString(),
        amountCents: r.hostEarningsCents ?? 0,
        feeCents: r.hostFeeCents ?? undefined,
        status: r.status === "completed" ? ("paid" as const) : ("pending" as const),
        reservationReference: r.reference,
      })),
    );
  }),
);

hostRouter.get(
  "/payouts",
  asyncRoute(async (req, res) => {
    const account = await prisma.payoutAccount.findUnique({ where: { userId: req.user!.id } });
    if (!account) {
      res.json({ state: "not_started" });
      return;
    }
    if (account.state === "incomplete") {
      res.json({ state: "incomplete", missing: account.missingFields });
    } else if (account.state === "action_required") {
      res.json({ state: "action_required", reason: account.actionReason ?? "Additional information is needed." });
    } else if (account.state === "complete") {
      res.json({ state: "complete", methodSummary: account.methodSummary ?? "your linked bank account" });
    } else {
      res.json({ state: account.state });
    }
  }),
);

/**
 * Real Stripe Connect Express onboarding. Requires STRIPE_SECRET_KEY; the
 * frontend button that calls this shows the existing "not connected" state
 * on a payment_unavailable response rather than doing nothing.
 */
hostRouter.post(
  "/payouts/start",
  asyncRoute(async (req, res) => {
    if (!stripe) {
      throw paymentUnavailable("Payouts require a payment provider, which is not connected in this environment.");
    }

    let account = await prisma.payoutAccount.findUnique({ where: { userId: req.user!.id } });

    if (!account?.stripeAccountId) {
      const stripeAccount = await stripe.accounts.create({
        type: "express",
        email: req.user!.email,
        capabilities: { transfers: { requested: true } },
      });
      account = await prisma.payoutAccount.upsert({
        where: { userId: req.user!.id },
        create: { userId: req.user!.id, state: "incomplete", stripeAccountId: stripeAccount.id, missingFields: [] },
        update: { stripeAccountId: stripeAccount.id, state: "incomplete" },
      });
    }

    const link = await stripe.accountLinks.create({
      account: account.stripeAccountId!,
      refresh_url: `${env.FRONTEND_URL}/host/payouts`,
      return_url: `${env.FRONTEND_URL}/host/payouts`,
      type: "account_onboarding",
    });

    res.json({ url: link.url });
  }),
);
