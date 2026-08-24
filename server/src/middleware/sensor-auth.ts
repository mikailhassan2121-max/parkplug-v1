import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { env, sensorIngestConfigured } from "../env.js";
import { ApiError } from "../lib/errors.js";
import { hashToken, SENSOR_TOKEN_PREFIX } from "../lib/tokens.js";

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
 * Guards every /api/v1/sensors/* write. A per-device header is preferred and
 * resolved to one Sensor row. The shared Bearer secret is retained only as a
 * legacy compatibility path and can be disabled by leaving it unset.
 */
export async function requireSensorToken(req: Request, _res: Response, next: NextFunction) {
  try {
    const deviceToken = req.header("x-parkplugs-sensor-token")?.trim();
    if (deviceToken) {
      if (!deviceToken.startsWith(SENSOR_TOKEN_PREFIX)) throw new ApiError(401, "Invalid or missing sensor token.");
      const sensor = await prisma.sensor.findUnique({ where: { tokenHash: hashToken(deviceToken) } });
      if (!sensor || sensor.tokenRevokedAt) throw new ApiError(401, "Invalid or missing sensor token.");
      req.sensor = sensor;
      req.sensorAuth = "device";
      next();
      return;
    }

    const header = req.header("authorization") ?? "";
    const match = /^Bearer\s+(\S+)$/.exec(header);
    if (sensorIngestConfigured && match?.[1] && constantTimeEqual(match[1], env.SENSOR_INGEST_TOKEN)) {
      req.sensorAuth = "legacy";
      next();
      return;
    }
    throw new ApiError(401, "Invalid or missing sensor token.");
  } catch (err) {
    next(err);
  }
}

/**
 * Call after loading the target Sensor row (so its tokenHash is known), not
 * before — a device-token caller must be bound to that exact sensor, and a
 * legacy-secret caller is only trusted for a sensor that has never been
 * issued a per-device token. Once a sensor has a real token, the shared
 * secret can no longer speak for it, closing the gap where anyone holding
 * SENSOR_INGEST_TOKEN could report occupancy for any sensor_id/spot_id in
 * the body, including ones belonging to other facilities.
 */
export function requireAuthenticatedSensor(
  req: Request,
  sensor: { sensorId: string; tokenHash: string | null },
): void {
  if (req.sensorAuth === "device") {
    if (!req.sensor || req.sensor.sensorId !== sensor.sensorId) {
      throw new ApiError(403, "This device token is not authorized for that sensor.");
    }
    return;
  }
  if (sensor.tokenHash) {
    throw new ApiError(
      403,
      `Sensor "${sensor.sensorId}" has a device token issued; the shared legacy secret is no longer accepted for it.`,
    );
  }
}
