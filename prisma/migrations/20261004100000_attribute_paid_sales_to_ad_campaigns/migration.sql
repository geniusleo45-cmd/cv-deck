ALTER TABLE "CartItem"
  ADD COLUMN "adCampaignId" TEXT,
  ADD COLUMN "attributedQuantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "OrderItem"
  ADD COLUMN "adCampaignId" TEXT,
  ADD COLUMN "attributedQuantity" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "CartItem_adCampaignId_idx" ON "CartItem"("adCampaignId");
CREATE INDEX "OrderItem_adCampaignId_idx" ON "OrderItem"("adCampaignId");

ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_adCampaignId_fkey"
  FOREIGN KEY ("adCampaignId") REFERENCES "AdCampaign"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_adCampaignId_fkey"
  FOREIGN KEY ("adCampaignId") REFERENCES "AdCampaign"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
