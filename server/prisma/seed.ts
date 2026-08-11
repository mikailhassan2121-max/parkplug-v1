/**
 * DEMO DATA ONLY — seeds one sensor-monitored parking facility used by the
 * sensor simulator and the /live map to demonstrate the live occupancy
 * pipeline end to end. Everything this file writes is clearly namespaced
 * under the "TEST-" / "PP-00" prefixes and lives only in the additive
 * sensor-platform tables (ParkingFacility, ParkingSpace, Sensor) — it never
 * touches Listing, Reservation, or any other marketplace data.
 *
 * Gated behind DEMO_SEED=true so it never runs against a real deployment by
 * accident. Safe to run repeatedly (upserts on unique keys); safe to delete
 * this whole file later without touching anything else.
 *
 * Run with: npm run seed   (from server/)
 */
import "dotenv/config";
import { PrismaClient, SpaceStatus } from "@prisma/client";

const prisma = new PrismaClient();

const FACILITY_ID = "TEST-GARAGE-001";

// Real coordinates near Chatham, NJ — used only as a plausible map location
// for the demo pin, not a claim about an actual garage at this address.
const FACILITY = {
  facilityId: FACILITY_ID,
  name: "ParkPlugs Test Garage",
  address: "45 Main St, Chatham, NJ 07928",
  latitude: 40.7401,
  longitude: -74.3843,
  totalSpaces: 6,
  sensorEnabled: true,
  timezone: "America/New_York",
};

// spotId -> [displayName, initial status]
const SPACES: Array<[string, string, SpaceStatus]> = [
  ["TEST-A1", "A1", SpaceStatus.AVAILABLE],
  ["TEST-A2", "A2", SpaceStatus.AVAILABLE],
  ["TEST-A3", "A3", SpaceStatus.OCCUPIED],
  ["TEST-A4", "A4", SpaceStatus.AVAILABLE],
  ["TEST-A5", "A5", SpaceStatus.AVAILABLE],
  ["TEST-A6", "A6", SpaceStatus.OCCUPIED],
];

async function main() {
  if (process.env.DEMO_SEED !== "true") {
    console.log("DEMO_SEED is not \"true\" — skipping demo facility seed. Nothing changed.");
    return;
  }

  const facility = await prisma.parkingFacility.upsert({
    where: { facilityId: FACILITY.facilityId },
    update: FACILITY,
    create: FACILITY,
  });

  console.log(`Facility ${facility.facilityId} (${facility.name}) ready.`);

  for (let i = 0; i < SPACES.length; i++) {
    const [spotId, displayName, status] = SPACES[i];

    const space = await prisma.parkingSpace.upsert({
      where: { spotId },
      update: { displayName, sortOrder: i },
      create: {
        spotId,
        facilityId: facility.id,
        displayName,
        status,
        sortOrder: i,
      },
    });

    const sensorId = `PP-${String(i + 1).padStart(3, "0")}`;
    await prisma.sensor.upsert({
      where: { sensorId },
      update: { onlineStatus: "ONLINE", lastSeen: new Date() },
      create: {
        sensorId,
        spaceId: space.id,
        deviceType: "ESP32+BMM150",
        onlineStatus: "ONLINE",
        lastSeen: new Date(),
      },
    });

    console.log(`  space ${spotId} <- sensor ${sensorId} (${status})`);
  }

  console.log("Demo facility seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
