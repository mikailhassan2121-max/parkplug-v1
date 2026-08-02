import { serialize, parse } from "cookie";
import type { Request, Response } from "express";
import { env } from "../env.js";

export const SESSION_COOKIE = "pp_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// The frontend (Netlify) and API (Railway) are on different registrable
// domains, so every request between them is cross-site. SameSite=Lax cookies
// are never sent on cross-site fetch/XHR (only on top-level navigation), so
// the browser would silently drop the session on every request. SameSite=None
// is required for a cross-site cookie to be sent at all, and browsers reject
// SameSite=None without Secure — so both flip together, and only in
// production, since local dev (localhost <-> 127.0.0.1) is same-site enough
// for Lax and doesn't need it.
const isProd = env.NODE_ENV === "production";
const sessionCookieAttrs = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ("none" as const) : ("lax" as const),
  path: "/",
};

export function setSessionCookie(res: Response, sessionId: string, expiresAt: Date) {
  res.setHeader(
    "Set-Cookie",
    serialize(SESSION_COOKIE, sessionId, { ...sessionCookieAttrs, expires: expiresAt }),
  );
}

export function clearSessionCookie(res: Response) {
  res.setHeader(
    "Set-Cookie",
    serialize(SESSION_COOKIE, "", { ...sessionCookieAttrs, expires: new Date(0) }),
  );
}

export function readSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  return parse(header)[SESSION_COOKIE] || undefined;
}

function readBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice("Bearer ".length).trim() || undefined;
}

/**
 * Resolves the session id from the cookie first, falling back to an
 * `Authorization: Bearer <token>` header. Some browsers block third-party
 * cookies outright (Safari ITP, Firefox ETP, privacy extensions) regardless
 * of SameSite — Netlify and Railway are different root domains, so this is a
 * real, common case, not a hypothetical one. The token is the same session
 * id the cookie carries: sign-in/sign-up also return it as `sessionToken`,
 * and the frontend stores and replays it as a bearer token when it has one.
 */
export function resolveSessionId(req: Request): string | undefined {
  return readSessionCookie(req) ?? readBearerToken(req);
}
