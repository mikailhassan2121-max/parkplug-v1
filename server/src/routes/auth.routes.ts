import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "../db.js";
import { asyncRoute } from "../middleware/error-handler.js";
import { requireAuth } from "../middleware/session.js";
import { setSessionCookie, clearSessionCookie, SESSION_TTL_MS } from "../lib/cookies.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { generateToken, hashToken } from "../lib/tokens.js";
import { sendMail, verificationEmail, passwordResetEmail } from "../lib/mailer.js";
import { toSessionUser } from "../lib/dto.js";
import { badRequest, unauthorized } from "../lib/errors.js";

export const authRouter = Router();

function passwordMeetsRequirements(value: string): boolean {
  return value.length >= 10 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);
}

async function createSession(userId: string, userAgent: string | undefined) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await prisma.session.create({ data: { userId, expiresAt, userAgent } });
  return session;
}

/* --------------------------------- Sign up -------------------------------- */

const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1),
});

authRouter.post(
  "/sign-up",
  asyncRoute(async (req, res) => {
    const parsed = signUpSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest("Check the highlighted fields and try again.", flatten(parsed.error));
    }
    const { fullName, password } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    if (!passwordMeetsRequirements(password)) {
      throw badRequest("Your password does not meet all the requirements.", {
        password: "Your password does not meet all the requirements.",
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw badRequest("An account with this email already exists.", {
        email: "An account with this email already exists.",
      });
    }

    const user = await prisma.user.create({
      data: { fullName, email, passwordHash: await hashPassword(password) },
    });

    const token = generateToken();
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 3600_000) },
    });
    const mail = verificationEmail(token);
    void sendMail({ to: user.email, ...mail });

    const session = await createSession(user.id, req.headers["user-agent"]);
    setSessionCookie(res, session.id, session.expiresAt);
    // sessionToken lets the frontend fall back to an Authorization header
    // when third-party cookies are blocked (Safari ITP, Firefox ETP, privacy
    // extensions) — it's the same session id the cookie carries, not a
    // separate secret.
    res.status(201).json({ ...toSessionUser(user), sessionToken: session.id });
  }),
);

/* --------------------------------- Sign in -------------------------------- */

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/sign-in",
  asyncRoute(async (req, res) => {
    const parsed = signInSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Enter your email and password.");

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;

    if (!user || !valid) {
      throw unauthorized("That email and password do not match an account.");
    }

    const session = await createSession(user.id, req.headers["user-agent"]);
    setSessionCookie(res, session.id, session.expiresAt);
    res.json({ ...toSessionUser(user), sessionToken: session.id });
  }),
);

/* -------------------------------- Sign out -------------------------------- */

authRouter.post(
  "/sign-out",
  asyncRoute(async (req, res) => {
    const allDevices = req.body?.allDevices === true;
    if (req.sessionId) {
      if (allDevices && req.user) {
        await prisma.session.deleteMany({ where: { userId: req.user.id } });
      } else {
        await prisma.session.delete({ where: { id: req.sessionId } }).catch(() => {});
      }
    }
    clearSessionCookie(res);
    res.json(null);
  }),
);

/* --------------------------------- Session -------------------------------- */

authRouter.get(
  "/session",
  asyncRoute(async (req, res) => {
    res.json(req.user ? toSessionUser(req.user) : null);
  }),
);

/* --------------------------------- Profile -------------------------------- */

const profileSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  isHost: z.boolean().optional(),
  notificationPrefs: z
    .object({
      reservationUpdates: z.boolean().optional(),
      reminders: z.boolean().optional(),
      messages: z.boolean().optional(),
      productNews: z.boolean().optional(),
      channelEmail: z.boolean().optional(),
      channelPush: z.boolean().optional(),
    })
    .optional(),
});

authRouter.patch(
  "/profile",
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Check the highlighted fields and try again.", flatten(parsed.error));

    const { notificationPrefs, email, ...rest } = parsed.data;

    if (email && email.toLowerCase() !== req.user!.email) {
      const taken = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (taken) {
        throw badRequest("An account with this email already exists.", {
          email: "An account with this email already exists.",
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...rest,
        ...(email ? { email: email.toLowerCase(), emailVerified: email.toLowerCase() === req.user!.email } : {}),
        ...(notificationPrefs
          ? {
              notifyReservationUpdates: notificationPrefs.reservationUpdates,
              notifyReminders: notificationPrefs.reminders,
              notifyMessages: notificationPrefs.messages,
              notifyProductNews: notificationPrefs.productNews,
              notifyChannelEmail: notificationPrefs.channelEmail,
              notifyChannelPush: notificationPrefs.channelPush,
            }
          : {}),
      },
    });

    // A changed email needs re-verifying before the account can book again.
    if (email && email.toLowerCase() !== req.user!.email) {
      const token = generateToken();
      await prisma.emailVerificationToken.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 3600_000) },
      });
      const mail = verificationEmail(token);
      void sendMail({ to: user.email, ...mail });
    }

    res.json(toSessionUser(user));
  }),
);

/* ---------------------------- Password reset ------------------------------ */

authRouter.post(
  "/password-reset",
  asyncRoute(async (req, res) => {
    const parsed = z.object({ email: z.string().trim().email() }).safeParse(req.body);
    if (parsed.success) {
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
      // Same response whether or not the account exists — the response
      // itself must never be usable to probe registered emails.
      if (user) {
        const token = generateToken();
        await prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
        });
        const mail = passwordResetEmail(token);
        void sendMail({ to: user.email, ...mail });
      }
    }
    res.json(null);
  }),
);

const resetConfirmSchema = z.object({ token: z.string().min(1), password: z.string().min(1) });

authRouter.post(
  "/password-reset/confirm",
  asyncRoute(async (req, res) => {
    const parsed = resetConfirmSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("This reset link is no longer valid.");
    if (!passwordMeetsRequirements(parsed.data.password)) {
      throw badRequest("Your password does not meet all the requirements.", {
        password: "Your password does not meet all the requirements.",
      });
    }

    // The account-settings "change password while signed in" form reuses this
    // endpoint with the sentinel token "session" rather than a mailed token.
    if (parsed.data.token === "session") {
      if (!req.user) throw unauthorized("Sign in to change your password.");
      await prisma.user.update({
        where: { id: req.user.id },
        data: { passwordHash: await hashPassword(parsed.data.password) },
      });
      await prisma.session.deleteMany({ where: { userId: req.user.id, NOT: { id: req.sessionId } } });
      res.json(null);
      return;
    }

    const tokenHash = hashToken(parsed.data.token);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw badRequest("This reset link is no longer valid.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await hashPassword(parsed.data.password) },
      }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.session.deleteMany({ where: { userId: record.userId } }),
    ]);

    res.json(null);
  }),
);

/* --------------------------- Email verification ---------------------------- */

authRouter.post(
  "/verify/resend",
  requireAuth,
  asyncRoute(async (req, res) => {
    const token = generateToken();
    await prisma.emailVerificationToken.create({
      data: { userId: req.user!.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 3600_000) },
    });
    const mail = verificationEmail(token);
    await sendMail({ to: req.user!.email, ...mail });
    res.json(null);
  }),
);

authRouter.post(
  "/verify",
  asyncRoute(async (req, res) => {
    const parsed = z.object({ token: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) throw badRequest("This verification link is invalid or has expired.");

    const tokenHash = hashToken(parsed.data.token);
    const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw badRequest("This verification link is invalid or has expired.");
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
      prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    res.json(null);
  }),
);

/* -------------------------------- Deletion --------------------------------- */

authRouter.delete(
  "/account",
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = req.user!.id;

    await prisma.$transaction([
      // Listings can't be hard-deleted once a reservation references them
      // (onDelete: Restrict, deliberately — a driver's booking history must
      // survive a host closing their account). Archiving takes them out of
      // search immediately without breaking that history.
      prisma.listing.updateMany({ where: { hostId: userId }, data: { status: "archived" } }),
      prisma.savedListing.deleteMany({ where: { userId } }),
      prisma.notification.deleteMany({ where: { userId } }),
      prisma.vehicle.deleteMany({ where: { userId, reservations: { none: {} } } }),
      prisma.session.deleteMany({ where: { userId } }),
      prisma.emailVerificationToken.deleteMany({ where: { userId } }),
      prisma.passwordResetToken.deleteMany({ where: { userId } }),
      // Anonymise rather than delete the row itself: reservation and review
      // history that legally must be retained stays intact, detached from
      // any identifying name or email, per the Data & Account Deletion policy.
      prisma.user.update({
        where: { id: userId },
        data: {
          fullName: "Deleted user",
          email: `deleted-${userId}@parkplug.invalid`,
          passwordHash: crypto.randomBytes(32).toString("hex"),
          avatarUrl: null,
          notifyReservationUpdates: false,
          notifyReminders: false,
          notifyMessages: false,
          notifyProductNews: false,
          notifyChannelEmail: false,
          notifyChannelPush: false,
        },
      }),
    ]);

    clearSessionCookie(res);
    res.json(null);
  }),
);

function flatten(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") out[key] = issue.message;
  }
  return out;
}
