import { serialize, parse } from "cookie";
import type { Request, Response } from "express";
import { env } from "../env.js";

export const SESSION_COOKIE = "pp_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function setSessionCookie(res: Response, sessionId: string, expiresAt: Date) {
  res.setHeader(
    "Set-Cookie",
    serialize(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    }),
  );
}

export function clearSessionCookie(res: Response) {
  res.setHeader(
    "Set-Cookie",
    serialize(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    }),
  );
}

export function readSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  return parse(header)[SESSION_COOKIE];
}
