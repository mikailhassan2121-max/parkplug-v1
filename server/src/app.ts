import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { corsOrigins, env } from "./env.js";
import { requestId } from "./middleware/request-id.js";
import { attachSession } from "./middleware/session.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { ipLimiter, emailLimiter } from "./middleware/rate-limit.js";
import { uploadRoot } from "./lib/uploads.js";

import { authRouter } from "./routes/auth.routes.js";
import { vehiclesRouter } from "./routes/vehicles.routes.js";
import { listingsRouter, hostListingsRouter } from "./routes/listings.routes.js";
import { searchRouter } from "./routes/search.routes.js";
import { reservationsRouter, hostReservationsRouter } from "./routes/reservations.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";
import { reviewsRouter } from "./routes/reviews.routes.js";
import { savedRouter } from "./routes/saved.routes.js";
import { notificationsRouter } from "./routes/notifications.routes.js";
import { supportRouter } from "./routes/support.routes.js";
import { hostRouter } from "./routes/host.routes.js";
import { conversationsRouter } from "./routes/conversations.routes.js";
import { uploadsRouter } from "./routes/uploads.routes.js";
import { geocodeRouter } from "./routes/geocode.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      // This server only ever returns JSON or static image files — never an
      // HTML document — so nothing here should ever be treated as a page
      // that loads other resources. Tighter than helmet's own default
      // (default-src 'self'), which still permits same-origin script/style.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
    }),
  );
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(requestId);
  app.use(express.json({ limit: "2mb" }));

  // The global fallback is mounted FIRST and the per-route limiters below it,
  // deliberately — express-rate-limit's standardHeaders overwrite
  // RateLimit-* on every matching middleware that runs, and Express runs
  // middleware in registration order. Global-first means each route's own
  // (much stricter) limiter runs last and is the one whose headers actually
  // reach the client, instead of every route misreportedly advertising the
  // global 300/min ceiling regardless of its real limit.
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

  // Stricter limit on auth endpoints — the ones most worth throttling against
  // credential stuffing and account-enumeration attempts.
  app.use(
    "/auth/sign-in",
    rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }),
  );
  // Per-IP alone only stops one attacker machine — a credential-stuffing run
  // spread across many IPs against a single victim email sails through it.
  // emailLimiter is keyed on the email in the body instead, so it catches
  // exactly that distributed case the IP limiter above cannot see.
  app.use(
    "/auth/sign-in",
    emailLimiter({ windowMs: 15 * 60_000, limit: 10, message: "Too many sign-in attempts for this account. Try again later." }),
  );
  app.use(
    "/auth/sign-up",
    rateLimit({ windowMs: 60 * 60_000, limit: 10, standardHeaders: true, legacyHeaders: false }),
  );
  app.use(
    "/auth/password-reset",
    rateLimit({ windowMs: 60 * 60_000, limit: 10, standardHeaders: true, legacyHeaders: false }),
  );
  // Same distributed gap as sign-in — without this, an attacker spread across
  // many IPs could still email-bomb one address with reset links well past
  // what the per-IP limiter above catches.
  app.use(
    "/auth/password-reset",
    emailLimiter({ windowMs: 60 * 60_000, limit: 5, message: "Too many password reset requests for this account. Try again later." }),
  );
  // Sends a real email on every call; only the 300/min global limit covered
  // it before, cheap enough for one signed-in account to burn through the
  // sending quota in seconds.
  app.use(
    "/auth/verify/resend",
    ipLimiter({ windowMs: 60 * 60_000, limit: 20, message: "Too many verification emails requested. Try again later." }),
  );
  // Nominatim's own usage policy caps free-tier traffic at roughly 1 req/sec
  // in aggregate — this keeps one client from burning through that budget.
  // A commercial geocoder is worth switching to before heavy production use.
  app.use(
    "/geocode",
    rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }),
  );
  // Each ticket sends a real confirmation email (plus an internal notice when
  // configured) — was covered only by the global limiter before.
  app.use(
    "/support/tickets",
    ipLimiter({ windowMs: 60 * 60_000, limit: 10, message: "Too many messages sent. Try again later." }),
  );
  app.use(
    "/support/tickets",
    emailLimiter({ windowMs: 60 * 60_000, limit: 5, message: "Too many messages sent from this email address. Try again later." }),
  );
  // Every upload writes a file to disk — was covered only by the global
  // limiter before.
  app.use(
    "/media",
    ipLimiter({ windowMs: 60 * 60_000, limit: 40, message: "Too many uploads. Try again later." }),
  );

  app.use(attachSession);

  app.use("/uploads", express.static(uploadRoot, { maxAge: "30d", immutable: true }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRouter);
  app.use("/vehicles", vehiclesRouter);
  app.use("/listings", listingsRouter);
  app.use("/host/listings", hostListingsRouter);
  app.use("/search", searchRouter);
  app.use("/reservations", reservationsRouter);
  app.use("/host/reservations", hostReservationsRouter);
  app.use("/reports", reportsRouter);
  app.use("/reviews", reviewsRouter);
  app.use("/saved", savedRouter);
  app.use("/notifications", notificationsRouter);
  app.use("/support", supportRouter);
  app.use("/host", hostRouter);
  app.use("/conversations", conversationsRouter);
  app.use("/media", uploadsRouter); // upload endpoints; served files are under /uploads (static, above)
  app.use("/geocode", geocodeRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export { env };
