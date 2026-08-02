import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Stamps every response with `X-Request-Id`. The frontend's error handling
 * (src/lib/api/index.ts) reads this header on a failed response and shows it
 * to the user as "Reference: xxxx" on error screens and the support form, so
 * a support agent can correlate a report with a server log line.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = crypto.randomUUID().slice(0, 8);
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
