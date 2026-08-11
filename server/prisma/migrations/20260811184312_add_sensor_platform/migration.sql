-- CreateEnum
CREATE TYPE "SpaceStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'UNKNOWN', 'OFFLINE');

-- CreateEnum
CREATE TYPE "SensorOnlineStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "OccupancyEventSource" AS ENUM ('SENSOR', 'SIMULATOR', 'MANUAL');

-- CreateTable
CREATE TABLE "ParkingFacility" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "totalSpaces" INTEGER NOT NULL,
    "sensorEnabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "ownerId" TEXT,
    "listingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParkingSpace" (
    "id" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "SpaceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSensorValue" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ParkingSpace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sensor" (
    "id" TEXT NOT NULL,
    "sensorId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL DEFAULT 'ESP32+BMM150',
    "firmwareVersion" TEXT,
    "onlineStatus" "SensorOnlineStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastSeen" TIMESTAMP(3),
    "batteryLevel" DOUBLE PRECISION,
    "signalStrength" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccupancyEvent" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "previousStatus" "SpaceStatus" NOT NULL,
    "newStatus" "SpaceStatus" NOT NULL,
    "source" "OccupancyEventSource" NOT NULL,
    "sensorValue" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OccupancyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParkingFacility_facilityId_key" ON "ParkingFacility"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "ParkingFacility_listingId_key" ON "ParkingFacility"("listingId");

-- CreateIndex
CREATE INDEX "ParkingFacility_ownerId_idx" ON "ParkingFacility"("ownerId");

-- CreateIndex
CREATE INDEX "ParkingFacility_latitude_longitude_idx" ON "ParkingFacility"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "ParkingSpace_spotId_key" ON "ParkingSpace"("spotId");

-- CreateIndex
CREATE INDEX "ParkingSpace_facilityId_idx" ON "ParkingSpace"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_sensorId_key" ON "Sensor"("sensorId");

-- CreateIndex
CREATE UNIQUE INDEX "Sensor_spaceId_key" ON "Sensor"("spaceId");

-- CreateIndex
CREATE INDEX "OccupancyEvent_facilityId_occurredAt_idx" ON "OccupancyEvent"("facilityId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "OccupancyEvent_spaceId_idx" ON "OccupancyEvent"("spaceId");

-- AddForeignKey
ALTER TABLE "ParkingFacility" ADD CONSTRAINT "ParkingFacility_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingFacility" ADD CONSTRAINT "ParkingFacility_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParkingSpace" ADD CONSTRAINT "ParkingSpace_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "ParkingFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sensor" ADD CONSTRAINT "Sensor_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "ParkingSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupancyEvent" ADD CONSTRAINT "OccupancyEvent_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "ParkingSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupancyEvent" ADD CONSTRAINT "OccupancyEvent_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "ParkingFacility"("id") ON DELETE CASCADE ON UPDATE CASCADE;
