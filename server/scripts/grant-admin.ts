/**
 * One-off promotion tool — grants isAdmin to an existing user by email.
 * Never leaks a secret: it takes only an email argument and writes a single
 * boolean column. Run manually, by someone with direct database access,
 * never from a user-facing route.
 *
 * Usage (from server/):
 *   npm run grant-admin -- someone@example.com
 *
 * To revoke, pass --revoke:
 *   npm run grant-admin -- someone@example.com --revoke
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const revoke = process.argv.includes("--revoke");

  if (!email || email.startsWith("--")) {
    console.error("Usage: npm run grant-admin -- <email> [--revoke]");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.update({
    where: { email: email.trim().toLowerCase() },
    data: { isAdmin: !revoke },
  });

  console.log(`${revoke ? "Revoked" : "Granted"} admin ${revoke ? "from" : "to"} ${user.email} (${user.id}).`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
