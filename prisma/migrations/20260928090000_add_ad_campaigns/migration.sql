CREATE TYPE "AdPackage" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "AdCampaignStatus" AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED');

CREATE TABLE "AdCampaign" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "package" "AdPackage" NOT NULL,
  "status" "AdCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "amount" DOUBLE PRECISION NOT NULL,
  "paymentProvider" TEXT,
  "paymentReference" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdCampaign_paymentReference_key" ON "AdCampaign"("paymentReference");
CREATE INDEX "AdCampaign_vendorId_status_idx" ON "AdCampaign"("vendorId", "status");
CREATE INDEX "AdCampaign_productId_status_idx" ON "AdCampaign"("productId", "status");
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
