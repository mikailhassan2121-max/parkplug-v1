import { Router, raw } from "express";
import Stripe from "stripe";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { env, paymentsConfigured } from "../env.js";
import { sendMail, reservationConfirmedEmail } from "../lib/mailer.js";
import { createNotification } from "../lib/notifications.js";

/**
 * Stripe webhooks. Mounted in app.ts BEFORE express.json() — this route needs
 * the exact raw request bytes to verify the signature (constructEvent hashes
 * the raw body; a JSON-parsed-and-restringified body will not match).
 */
export const webhooksRouter = Router();

const stripe = paymentsConfigured ? new Stripe(env.STRIPE_SECRET_KEY) : null;

const include = {
  listing: { include: { photos: true, availability: true, host: true } },
  vehicle: true,
  timeline: true,
  user: true,
} as const;

// Two independent Stripe webhook destinations point at this same URL: the
// "Your account" one (payment_intent.*, charge.refunded) and a
// "Connected accounts" one (account.updated on a host's Express account —
// Stripe will not deliver Connect events to an account-scoped destination).
// Each destination signs with its own secret, so a single signature check
// against one secret would reject the other destination's events outright.
const webhookSecrets: Array<{ label: string; secret: string }> = [
  { label: "account", secret: env.STRIPE_WEBHOOK_SECRET },
  { label: "connect", secret: env.STRIPE_CONNECT_WEBHOOK_SECRET },
].filter((candidate): candidate is { label: string; secret: string } => Boolean(candidate.secret));

webhooksRouter.post(
  "/stripe",
  raw({ type: "application/json" }),
  asyncRoute(async (req, res) => {
    if (!stripe || webhookSecrets.length === 0) {
      // Nothing configured to verify against — reject rather than trusting an
      // unverified payload. (Stripe retries failed deliveries, so this is
      // safe to leave until at least one secret is actually set.)
      res.status(503).json({ message: "Stripe webhooks are not configured." });
      return;
    }

    const signature = req.headers["stripe-signature"];
    let event: Stripe.Event | undefined;
    let lastError: unknown;
    for (const { label, secret } of webhookSecrets) {
      try {
        event = stripe.webhooks.constructEvent(req.body as Buffer, signature ?? "", secret);
        console.log(`[stripe webhook] verified against the "${label}" secret (event: ${event.type})`);
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!event) {
      console.error("[stripe webhook] signature verification failed against all configured secrets:", lastError);
      res.status(400).json({ message: "Invalid signature." });
      return;
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      }
      case "payment_intent.payment_failed": {
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      }
      case "charge.refunded": {
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      }
      case "account.updated": {
        // event.account is the connected account id on a Connect-context
        // event — the reliable field for "which connected account is this
        // about", distinct from event.data.object.id (which is also that
        // account's id here, but only because this particular event type
        // happens to carry the Account object itself as its payload).
        await handleAccountUpdated(event.data.object as Stripe.Account, event.account);
        break;
      }
      default:
        break;
    }

    // Stripe only needs a 2xx to stop retrying — the payload isn't otherwise used.
    res.json({ received: true });
  }),
);

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent): Promise<void> {
  const reservation = await prisma.reservation.findFirst({
    where: { stripePaymentIntentId: intent.id },
    include,
  });
  if (!reservation) return; // Not one of ours, or already deleted.
  if (reservation.paymentStatus === "succeeded") return; // Idempotent — Stripe can redeliver the same event.

  const now = new Date();
  const wasPending = reservation.status === "pending";
  const updated = await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: wasPending ? "confirmed" : reservation.status,
      paymentStatus: "succeeded",
      ...(wasPending
        ? { timeline: { create: { at: now, label: "Reservation confirmed", description: "Payment captured." } } }
        : {}),
    },
    include,
  });

  if (!wasPending) return; // Booking was already confirmed; just kept paymentStatus in sync.

  void sendMail({
    to: updated.user.email,
    ...reservationConfirmedEmail({
      reference: updated.reference,
      listingTitle: updated.listing.title,
      startAt: updated.startAt,
      endAt: updated.endAt,
      totalCents: updated.totalCents,
      currency: updated.currency,
    }),
  });

  await createNotification(updated.userId, {
    type: "reservation_confirmed",
    title: "Reservation confirmed",
    body: `${updated.listing.title} · ${updated.reference}`,
    href: `/reservations/${updated.reference}`,
  });
  await createNotification(updated.listing.hostId, {
    type: "host_new_booking",
    title: "New booking",
    body: `${updated.listing.title} was just reserved for ${updated.startAt.toLocaleDateString()}`,
    href: `/host/reservations`,
  });
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent): Promise<void> {
  const reservation = await prisma.reservation.findFirst({ where: { stripePaymentIntentId: intent.id } });
  if (!reservation || reservation.status !== "pending") return; // Only ever cancels an unconfirmed hold.

  const now = new Date();
  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: "canceled",
      paymentStatus: "failed",
      canceledAt: now,
      timeline: {
        create: {
          at: now,
          label: "Reservation canceled",
          description: intent.last_payment_error?.message ?? "Payment failed.",
        },
      },
    },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!intentId) return;

  const reservation = await prisma.reservation.findFirst({
    where: { stripePaymentIntentId: intentId },
    include: { listing: true },
  });
  if (!reservation) return;

  const fullyRefunded = charge.amount_refunded >= charge.amount;
  const now = new Date();
  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      paymentStatus: fullyRefunded ? "refunded" : reservation.paymentStatus,
      status: fullyRefunded && reservation.status !== "canceled" ? "refunded" : reservation.status,
      timeline: {
        create: {
          at: now,
          label: fullyRefunded ? "Refund issued" : "Partial refund issued",
          description: `${(charge.amount_refunded / 100).toFixed(2)} ${charge.currency.toUpperCase()} refunded.`,
        },
      },
    },
  });

  await createNotification(reservation.userId, {
    type: "refund_update",
    title: fullyRefunded ? "Refund issued" : "Partial refund issued",
    body: `${reservation.listing.title} · ${reservation.reference}`,
    href: `/reservations/${reservation.reference}`,
  });
}

/**
 * The bug this closes: onboarding (host.routes.ts, POST /host/payouts/start)
 * only ever wrote state: "incomplete" — nothing ever moved a host past that,
 * even after they actually finished Stripe's own onboarding flow. This is
 * the event Stripe sends when that flow's requirements are actually met.
 */
async function handleAccountUpdated(account: Stripe.Account, connectedAccountId?: string): Promise<void> {
  if (!account.charges_enabled || !account.payouts_enabled) return;

  const accountId = connectedAccountId ?? account.id;
  const payoutAccount = await prisma.payoutAccount.findFirst({ where: { stripeAccountId: accountId } });
  if (!payoutAccount || payoutAccount.state === "complete") return;

  await prisma.payoutAccount.update({
    where: { id: payoutAccount.id },
    data: { state: "complete", actionReason: null, missingFields: [] },
  });
}
