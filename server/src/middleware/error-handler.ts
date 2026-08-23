import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ApiError } from "../lib/errors.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `No route for ${req.method} ${req.path}.` });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // Express identifies error-handling middleware by arity — this parameter
  // must stay even though it is unused.
  _next: NextFunction,
) {
  if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
    res.status(400).json({ message: "Request body contains malformed JSON." });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json(err.toJSON());
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ message: "That already exists." });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ message: "We could not find that." });
      return;
    }
    if (err.code === "P2003") {
      res.status(409).json({ message: "This has related records and cannot be deleted." });
      return;
    }
  }

  console.error(`[${res.locals.requestId ?? "-"}]`, err);
  res.status(500).json({ message: "Something went wrong on our end." });
}

/** Wraps an async route handler so a rejected promise reaches errorHandler. */
export function asyncRoute<T extends (req: Request, res: Response) => Promise<void>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}
