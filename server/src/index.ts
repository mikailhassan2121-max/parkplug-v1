import { createApp } from "./app.js";
import { env, paymentsConfigured, emailConfigured, mailProvider, feesConfigured } from "./env.js";
import { prisma } from "./db.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`ParkPlugs API listening on :${env.PORT} (${env.NODE_ENV})`);
  console.log(
    `  payments: ${paymentsConfigured ? "connected" : "not configured"} · ` +
      `email: ${emailConfigured ? `connected (${mailProvider!.name})` : "logging to console"} · ` +
      `fees: ${feesConfigured ? "configured" : "not configured"}`,
  );
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
