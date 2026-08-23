import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../error-handler.js";

describe("JSON parse errors", () => {
  it("returns a useful 400 instead of a generic 500", () => {
    const status = vi.fn();
    const json = vi.fn();
    status.mockReturnValue({ json });
    const err = Object.assign(new SyntaxError("Unexpected end of JSON input"), {
      status: 400,
      body: '{"sensor_id":',
    });

    errorHandler(err, {} as Request, { status, locals: {} } as unknown as Response, vi.fn());

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: "Request body contains malformed JSON." });
  });
});
