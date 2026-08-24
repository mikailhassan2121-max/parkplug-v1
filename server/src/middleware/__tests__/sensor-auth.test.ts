import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashToken } from "../../lib/tokens.js";

const findUnique = vi.fn();

vi.mock("../../db.js", () => ({ prisma: { sensor: { findUnique } } }));
vi.mock("../../env.js", () => ({
  env: { SENSOR_INGEST_TOKEN: "legacy-secret" },
  sensorIngestConfigured: true,
}));

const { requireAuthenticatedSensor, requireSensorToken } = await import("../sensor-auth.js");

function request(headers: Record<string, string> = {}): Request {
  return {
    header(name: string) {
      return headers[name.toLowerCase()];
    },
  } as Request;
}

async function authenticate(req: Request) {
  const next = vi.fn();
  await requireSensorToken(req, {} as Response, next);
  return next;
}

describe("sensor authentication", () => {
  beforeEach(() => findUnique.mockReset());

  it("prefers and resolves the per-device header", async () => {
    const token = "pp_sensor_device-token";
    const sensor = { id: "one", sensorId: "PP-001", tokenRevokedAt: null };
    findUnique.mockResolvedValue(sensor);
    const req = request({ "x-parkplugs-sensor-token": token, authorization: "Bearer legacy-secret" });

    const next = await authenticate(req);

    expect(findUnique).toHaveBeenCalledWith({ where: { tokenHash: hashToken(token) } });
    expect(req.sensor).toBe(sensor);
    expect(req.sensorAuth).toBe("device");
    expect(next).toHaveBeenCalledWith();
  });

  it("accepts the legacy Bearer fallback when no device header is present", async () => {
    const req = request({ authorization: "Bearer legacy-secret" });
    const next = await authenticate(req);
    expect(findUnique).not.toHaveBeenCalled();
    expect(req.sensorAuth).toBe("legacy");
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects revoked tokens without falling back to Bearer", async () => {
    findUnique.mockResolvedValue({ sensorId: "PP-001", tokenRevokedAt: new Date() });
    const next = await authenticate(
      request({ "x-parkplugs-sensor-token": "pp_sensor_revoked", authorization: "Bearer legacy-secret" }),
    );
    expect(next.mock.calls[0]?.[0]).toMatchObject({ status: 401 });
  });

  it("binds a device credential to its sensor id", () => {
    const deviceReq = { sensorAuth: "device", sensor: { sensorId: "PP-001" } } as Request;
    expect(() =>
      requireAuthenticatedSensor(deviceReq, { sensorId: "PP-001", tokenHash: "irrelevant" }),
    ).not.toThrow();
    expect(() =>
      requireAuthenticatedSensor(deviceReq, { sensorId: "PP-002", tokenHash: "irrelevant" }),
    ).toThrow(expect.objectContaining({ status: 403 }));
  });

  it("accepts the legacy secret only for a sensor that has never been issued a device token", () => {
    const legacyReq = { sensorAuth: "legacy" } as Request;
    expect(() =>
      requireAuthenticatedSensor(legacyReq, { sensorId: "PP-002", tokenHash: null }),
    ).not.toThrow();
  });

  it("rejects the legacy secret for a sensor that already has a device token, closing the cross-facility spoofing gap", () => {
    const legacyReq = { sensorAuth: "legacy" } as Request;
    expect(() =>
      requireAuthenticatedSensor(legacyReq, { sensorId: "PP-002", tokenHash: "some-hash" }),
    ).toThrow(expect.objectContaining({ status: 403 }));
  });
});
