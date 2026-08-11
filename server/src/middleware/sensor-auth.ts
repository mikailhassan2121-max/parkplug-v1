import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env, sensorIngestConfigured } from "../env.js";
import { ApiError } from "../lib/errors.js";

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Compare bufA against itself so a length mismatch still costs a real
    // comparison — otherwise an early return leaks the real token's length
    // through response timing.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Guards every /api/v1/sensors/* write. Real hardware and the admin
 * simulator's server-side proxy both authenticate the same way: a Bearer
 * token compared in constant time against SENSOR_INGEST_TOKEN. Left
 * unconfigured, ingest is refused outright rather than silently accepting
 * unauthenticated writes.
 */
export function requireSensorToken(req: Request, _res: Response, next: NextFunction) {
  if (!sensorIngestConfigured) {
    next(new ApiError(503, "Sensor ingest is not configured on this server."));
    return;
  }

  const header = req.header("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token || !constantTimeEqual(token, env.SENSOR_INGEST_TOKEN)) {
    next(new ApiError(401, "Invalid or missing sensor token."));
    return;
  }

  next();
}
