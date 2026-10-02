CREATE TYPE "AdEventType" AS ENUM ('IMPRESSION', 'CLICK');

CREATE TABLE "AdCampaignEvent" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "type" "AdEventType" NOT NULL,
  "visitorId" TEXT NOT NULL,
  "day" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdCampaignEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdCampaignEvent_campaignId_type_visitorId_day_key" ON "AdCampaignEvent"("campaignId", "type", "visitorId", "day");
CREATE INDEX "AdCampaignEvent_campaignId_type_idx" ON "AdCampaignEvent"("campaignId", "type");

ALTER TABLE "AdCampaignEvent" ADD CONSTRAINT "AdCampaignEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
