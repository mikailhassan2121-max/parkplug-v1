import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().min(1),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  // Signs webhook payloads from the Stripe dashboard's endpoint config — see
  // routes/webhooks.routes.ts. Left unset, incoming webhooks are rejected
  // rather than trusted unverified.
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  // account.updated for a host's Express account is a Connect event — Stripe
  // only delivers it to a destination whose "Events from" is "Connected
  // accounts", which is a separate destination (and separate signing secret)
  // from the "Your account" one STRIPE_WEBHOOK_SECRET verifies. Optional:
  // without it, Connect events silently fail signature verification and
  // webhooks.routes.ts falls back to STRIPE_WEBHOOK_SECRET alone.
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().optional().default(""),

  // Email goes through a provider's HTTP API (not SMTP) — some hosts,
  // including Railway's trial tier, block outbound SMTP ports 465/587
  // entirely, while plain HTTPS (443) is never blocked. MAIL_PROVIDER picks
  // which one; leaving it unset infers from whichever API key is present
  // (Resend first, for backward compatibility with existing deploys).
  MAIL_PROVIDER: z.enum(["resend", "brevo"]).optional(),
  RESEND_API_KEY: z.string().optional().default(""),
  // Brevo needs only single-sender verification (not a whole verified
  // domain) to send to any recipient, unlike Resend — useful while a domain
  // isn't verified yet, since Resend refuses to deliver to anyone but the
  // account owner until one is.
  BREVO_API_KEY: z.string().optional().default(""),
  MAIL_FROM: z.string().optional().default("ParkPlugs <no-reply@parkplug.example>"),
  // Internal address that gets a copy of each support ticket. Optional —
  // leave unset to skip the internal notice (the reporter's own confirmation
  // email still sends).
  SUPPORT_NOTIFY_EMAIL: z.string().optional().default(""),
  UPLOAD_DIR: z.string().optional().default("./uploads"),
  PUBLIC_UPLOAD_BASE_URL: z.string().optional().default("http://localhost:4000/uploads"),
  FRONTEND_URL: z.string().optional().default("http://localhost:3000"),

  // Fees in basis points (1000 = 10%). The commission split is confirmed —
  // ParkPlugs keeps 15% of the driver's subtotal (HOST_FEE_BPS, deducted
  // from the host's payout) and charges no separate markup on top
  // (SERVICE_FEE_BPS = 0) — so these default rather than reading as
  // unconfirmed. Still overridable via env if the split ever changes.
  // Mirrors src/config/business.ts on the frontend exactly.
  SERVICE_FEE_BPS: z.coerce.number().optional().default(0),
  HOST_FEE_BPS: z.coerce.number().optional().default(1500),
  // Sales tax has no confirmed rate yet, so this one stays genuinely unset.
  TAX_BPS: z.coerce.number().optional(),

  // Defaults on — listings go live immediately with no review step. Set to
  // "false" to hold new listings at "in_review" instead.
  LISTINGS_AUTO_PUBLISH: z
    .string()
    .optional()
    .transform((v) => v !== "false"),

  // --- Live sensor platform -------------------------------------------
  // Temporary shared Bearer credential for legacy sensor hardware and the
  // server-side simulator. New hardware uses a database-backed per-sensor
  // token. Leaving this unset disables only the legacy fallback.
  SENSOR_INGEST_TOKEN: z.string().optional().default(""),
  // How long a sensor can go quiet before the background sweeper flips its
  // space to OFFLINE.
  SENSOR_OFFLINE_AFTER_SECONDS: z.coerce.number().optional().default(90),
  // Gates /admin/sensor-simulator server-side, in addition to the frontend's
  // own NEXT_PUBLIC_ADMIN_SIMULATOR_ENABLED flag and the route's normal
  // admin-auth check — off by default so it's never reachable by accident.
  ADMIN_SIMULATOR_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim());
export const paymentsConfigured = env.STRIPE_SECRET_KEY.length > 0;
export const feesConfigured = env.SERVICE_FEE_BPS !== undefined;
export const sensorIngestConfigured = env.SENSOR_INGEST_TOKEN.length > 0;

export type ResolvedMailProvider = { name: "resend" | "brevo"; apiKey: string };

function resolveMailProvider(): ResolvedMailProvider | null {
  if (env.MAIL_PROVIDER === "resend") return env.RESEND_API_KEY ? { name: "resend", apiKey: env.RESEND_API_KEY } : null;
  if (env.MAIL_PROVIDER === "brevo") return env.BREVO_API_KEY ? { name: "brevo", apiKey: env.BREVO_API_KEY } : null;
  // No explicit choice — infer from whichever key is set.
  if (env.RESEND_API_KEY) return { name: "resend", apiKey: env.RESEND_API_KEY };
  if (env.BREVO_API_KEY) return { name: "brevo", apiKey: env.BREVO_API_KEY };
  return null;
}

export const mailProvider = resolveMailProvider();
export const emailConfigured = mailProvider !== null;

