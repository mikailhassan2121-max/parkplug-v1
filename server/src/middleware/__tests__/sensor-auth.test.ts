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

  it("binds a device credential to its sensor id while leaving legacy requests compatible", () => {
    const deviceReq = { sensor: { sensorId: "PP-001" } } as Request;
    expect(() => requireAuthenticatedSensor(deviceReq, "PP-001")).not.toThrow();
    expect(() => requireAuthenticatedSensor(deviceReq, "PP-002")).toThrow(
      expect.objectContaining({ status: 403 }),
    );
    expect(() => requireAuthenticatedSensor({ sensorAuth: "legacy" } as Request, "PP-002")).not.toThrow();
  });
});
