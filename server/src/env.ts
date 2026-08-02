import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().min(1),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default("ParkPlug <no-reply@parkplug.example>"),
  UPLOAD_DIR: z.string().optional().default("./uploads"),
  PUBLIC_UPLOAD_BASE_URL: z.string().optional().default("http://localhost:4000/uploads"),
  FRONTEND_URL: z.string().optional().default("http://localhost:3000"),

  // Fees in basis points (1000 = 10%). Left unset means "not yet confirmed" —
  // mirrors src/config/business.ts on the frontend exactly: quotes compute
  // with a $0 fee and `feesKnown: false` rather than guessing a rate.
  SERVICE_FEE_BPS: z.coerce.number().optional(),
  HOST_FEE_BPS: z.coerce.number().optional(),
  TAX_BPS: z.coerce.number().optional(),

  LISTINGS_AUTO_PUBLISH: z
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
export const emailConfigured = env.SMTP_HOST.length > 0;
export const feesConfigured = env.SERVICE_FEE_BPS !== undefined;

