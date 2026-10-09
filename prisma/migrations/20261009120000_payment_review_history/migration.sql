CREATE TABLE "PaymentReviewEntry" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "paymentReference" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "externalReference" TEXT,
  "adminId" TEXT NOT NULL,
  "adminName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentReviewEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentReviewEntry_kind_check" CHECK ("kind" IN ('order', 'campaign')),
  CONSTRAINT "PaymentReviewEntry_status_check" CHECK ("status" IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REFUND_RECORDED'))
);
CREATE INDEX "PaymentReviewEntry_kind_targetId_createdAt_idx" ON "PaymentReviewEntry"("kind", "targetId", "createdAt");
CREATE INDEX "PaymentReviewEntry_createdAt_idx" ON "PaymentReviewEntry"("createdAt");
