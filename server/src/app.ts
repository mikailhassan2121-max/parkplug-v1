import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { corsOrigins, env } from "./env.js";
import { requestId } from "./middleware/request-id.js";
import { attachSession } from "./middleware/session.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
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

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(requestId);
  app.use(express.json({ limit: "2mb" }));

  // Stricter limit on auth endpoints — the ones most worth throttling against
  // credential stuffing and account-enumeration attempts.
  app.use(
    "/auth/sign-in",
    rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false }),
  );
  app.use(
    "/auth/sign-up",
    rateLimit({ windowMs: 60 * 60_000, limit: 10, standardHeaders: true, legacyHeaders: false }),
  );
  app.use(
    "/auth/password-reset",
    rateLimit({ windowMs: 60 * 60_000, limit: 10, standardHeaders: true, legacyHeaders: false }),
  );
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export { env };
