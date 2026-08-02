import { PrismaClient } from "@prisma/client";

// Single shared client. tsx watch mode can re-evaluate this module on file
// changes, so it's cached on globalThis to avoid exhausting the Postgres
// connection pool across hot reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
