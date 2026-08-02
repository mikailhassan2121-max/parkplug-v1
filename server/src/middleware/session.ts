import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { resolveSessionId, clearSessionCookie } from "../lib/cookies.js";
import { unauthorized } from "../lib/errors.js";

/**
 * Resolves the session cookie into `req.user`, when present and unexpired.
 * Never rejects by itself — routes that need a signed-in user compose this
 * with `requireAuth`, so public GETs (a listing page, search) can still read
 * `req.user` to personalise a response without forcing sign-in.
 */
export async function attachSession(req: Request, res: Response, next: NextFunction) {
  const sessionId = resolveSessionId(req);
  if (!sessionId) return next();

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt.getTime() < Date.now()) {
    if (session) await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    clearSessionCookie(res);
    return next();
  }

  req.user = session.user;
  req.sessionId = session.id;
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized("Sign in to continue."));
  next();
}
