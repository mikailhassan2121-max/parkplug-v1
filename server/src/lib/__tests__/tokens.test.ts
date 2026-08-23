import { describe, expect, it } from "vitest";
import { generateSensorToken, hashToken, SENSOR_TOKEN_PREFIX, sensorTokenLastFour } from "../tokens.js";

describe("sensor token utilities", () => {
  it("generates distinct opaque tokens with the sensor prefix", () => {
    const first = generateSensorToken();
    const second = generateSensorToken();
    expect(first).toMatch(/^pp_sensor_[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
    expect(first.startsWith(SENSOR_TOKEN_PREFIX)).toBe(true);
  });

  it("hashes deterministically without retaining the raw token", () => {
    const token = generateSensorToken();
    expect(hashToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
    expect(sensorTokenLastFour(token)).toBe(token.slice(-4));
  });
});
