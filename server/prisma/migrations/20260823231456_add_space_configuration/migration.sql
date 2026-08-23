-- AlterTable
ALTER TABLE "ParkingSpace" ADD COLUMN     "accessible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reservable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "restrictions" TEXT;
