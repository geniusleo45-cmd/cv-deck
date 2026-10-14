CREATE TYPE "OpportunityKind" AS ENUM ('JOB', 'PROCUREMENT');
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "OpportunityResponseStatus" AS ENUM ('SUBMITTED', 'SHORTLISTED', 'SELECTED', 'DECLINED');

CREATE TABLE "RecruiterOpportunity" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "kind" "OpportunityKind" NOT NULL,
  "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "terms" TEXT,
  "quantity" INTEGER,
  "closesAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecruiterOpportunity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecruiterOpportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RecruiterOpportunity_quantity_check" CHECK ("quantity" IS NULL OR "quantity" > 0)
);
CREATE TABLE "OpportunityResponse" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "quoteAmount" DECIMAL(12,2),
  "status" "OpportunityResponseStatus" NOT NULL DEFAULT 'SUBMITTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OpportunityResponse_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OpportunityResponse_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "RecruiterOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OpportunityResponse_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OpportunityResponse_quoteAmount_check" CHECK ("quoteAmount" IS NULL OR "quoteAmount" > 0)
);
CREATE INDEX "RecruiterOpportunity_ownerId_kind_createdAt_idx" ON "RecruiterOpportunity"("ownerId", "kind", "createdAt");
CREATE INDEX "RecruiterOpportunity_status_kind_closesAt_idx" ON "RecruiterOpportunity"("status", "kind", "closesAt");
CREATE UNIQUE INDEX "OpportunityResponse_opportunityId_applicantId_key" ON "OpportunityResponse"("opportunityId", "applicantId");
CREATE INDEX "OpportunityResponse_applicantId_createdAt_idx" ON "OpportunityResponse"("applicantId", "createdAt");
