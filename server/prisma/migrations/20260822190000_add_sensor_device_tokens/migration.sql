ALTER TABLE "Sensor"
ADD COLUMN "tokenHash" TEXT,
ADD COLUMN "tokenLastFour" TEXT,
ADD COLUMN "tokenIssuedAt" TIMESTAMP(3),
ADD COLUMN "tokenRevokedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Sensor_tokenHash_key" ON "Sensor"("tokenHash");
