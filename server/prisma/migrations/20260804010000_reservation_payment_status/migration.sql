-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('requires_payment', 'processing', 'succeeded', 'failed', 'refunded');

-- AlterTable
ALTER TABLE "Reservation" ALTER COLUMN "status" SET DEFAULT 'pending';
ALTER TABLE "Reservation" ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'requires_payment';
