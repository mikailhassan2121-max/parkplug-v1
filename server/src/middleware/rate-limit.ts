import rateLimit, { type Options } from "express-rate-limit";
import type { Request } from "express";

/**
 * Every limiter in this file returns the same JSON shape the rest of the API
 * uses for errors ({message, code}) so the frontend's request() helper maps
 * it to the "rate_limited" ApiErrorCode exactly like any other error.
 */
function jsonOn429(retryAfterMessage: string) {
  return (req: Request, res: import("express").Response) => {
    res.status(429).json({ message: retryAfterMessage });
  };
}

const DEFAULTS = { standardHeaders: true, legacyHeaders: false } as const;

/** Per-IP limiter. `req.ip` is correct here because app.set("trust proxy", 1) runs before this. */
export function ipLimiter(opts: { windowMs: number; limit: number; message: string }) {
  return rateLimit({
    ...DEFAULTS,
    windowMs: opts.windowMs,
    limit: opts.limit,
    handler: jsonOn429(opts.message),
  });
}

function normalizeEmail(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim() ? raw.trim().toLowerCase() : undefined;
}

/**
 * Keyed by the email address in the request body rather than the caller's IP
 * — this is what actually stops a distributed attack (many IPs, one victim
 * email) that a pure per-IP limiter cannot see. Requests with no email in the
 * body fall back to the IP, rather than sharing one bucket across every
 * unauthenticated caller.
 */
export function emailLimiter(opts: { windowMs: number; limit: number; message: string }) {
  return rateLimit({
    ...DEFAULTS,
    windowMs: opts.windowMs,
    limit: opts.limit,
    keyGenerator: (req: Request) => normalizeEmail(req.body?.email) ?? req.ip ?? "unknown",
    handler: jsonOn429(opts.message),
  });
}

/**
 * Keyed by the authenticated user's id. Only ever mounted after `requireAuth`
 * (or after `attachSession` when a route allows a signed-out caller through),
 * so `req.user` is guaranteed to be resolved by the time this runs.
 */
export function userLimiter(opts: { windowMs: number; limit: number; message: string }) {
  return rateLimit({
    ...DEFAULTS,
    windowMs: opts.windowMs,
    limit: opts.limit,
    keyGenerator: (req: Request) => req.user?.id ?? req.ip ?? "unknown",
    handler: jsonOn429(opts.message),
  });
}

export type { Options as RateLimitOptions };
