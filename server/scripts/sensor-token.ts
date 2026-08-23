import { PrismaClient } from "@prisma/client";
import { generateSensorToken, hashToken, sensorTokenLastFour } from "../src/lib/tokens.js";

const prisma = new PrismaClient();

function usage(): never {
  console.error("Usage: npm run sensor-token -- <issue|rotate|revoke> <sensor-id>");
  process.exit(1);
}

const [action, sensorId, ...extra] = process.argv.slice(2);
if (!action || !sensorId || extra.length || !["issue", "rotate", "revoke"].includes(action)) usage();

async function main() {
  const sensor = await prisma.sensor.findUnique({ where: { sensorId } });
  if (!sensor) throw new Error(`Sensor ${sensorId} was not found.`);

  if (action === "revoke") {
    if (!sensor.tokenHash || sensor.tokenRevokedAt) throw new Error(`Sensor ${sensorId} has no active token.`);
    await prisma.sensor.update({ where: { id: sensor.id }, data: { tokenRevokedAt: new Date() } });
    console.log(`Revoked the token for ${sensorId}.`);
    return;
  }

  if (action === "issue" && sensor.tokenHash && !sensor.tokenRevokedAt) {
    throw new Error(`Sensor ${sensorId} already has an active token; use rotate.`);
  }

  const token = generateSensorToken();
  await prisma.sensor.update({
    where: { id: sensor.id },
    data: {
      tokenHash: hashToken(token),
      tokenLastFour: sensorTokenLastFour(token),
      tokenIssuedAt: new Date(),
      tokenRevokedAt: null,
    },
  });
  console.log(`${action === "rotate" ? "Rotated" : "Issued"} token for ${sensorId}.`);
  console.log("Store this token now; it cannot be displayed again:");
  console.log(token);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
