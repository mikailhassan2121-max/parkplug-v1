import { createApp } from "./app.js";
import {
  env,
  paymentsConfigured,
  emailConfigured,
  mailProvider,
  feesConfigured,
  sensorIngestConfigured,
} from "./env.js";
import { prisma } from "./db.js";
import { startSensorSweeper } from "./lib/sensor-sweeper.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`ParkPlugs API listening on :${env.PORT} (${env.NODE_ENV})`);
  console.log(
    `  payments: ${paymentsConfigured ? "connected" : "not configured"} · ` +
      `email: ${emailConfigured ? `connected (${mailProvider!.name})` : "logging to console"} · ` +
      `fees: ${feesConfigured ? "configured" : "not configured"} · ` +
      `sensors: ${sensorIngestConfigured ? "configured" : "not configured"}`,
  );
});

const stopSweeper = startSensorSweeper();

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  stopSweeper();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
