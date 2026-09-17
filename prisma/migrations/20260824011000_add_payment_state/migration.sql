CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

ALTER TABLE "Payment"
  ADD COLUMN "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "authorizationUrl" TEXT,
  ADD COLUMN "verifiedAt" TIMESTAMP(3);
