-- Keep a durable, auditable support record when a vendor's Premium Listing
-- checkout needs manual reconciliation. A campaign can have one case because
-- it represents one payment attempt and payment reference.
CREATE TABLE "AdCampaignSupportRequest" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaignSupportRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdCampaignSupportRequest_campaignId_key"
ON "AdCampaignSupportRequest"("campaignId");

CREATE INDEX "AdCampaignSupportRequest_status_createdAt_idx"
ON "AdCampaignSupportRequest"("status", "createdAt");

CREATE INDEX "AdCampaignSupportRequest_userId_idx"
ON "AdCampaignSupportRequest"("userId");

ALTER TABLE "AdCampaignSupportRequest"
ADD CONSTRAINT "AdCampaignSupportRequest_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdCampaignSupportRequest"
ADD CONSTRAINT "AdCampaignSupportRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
