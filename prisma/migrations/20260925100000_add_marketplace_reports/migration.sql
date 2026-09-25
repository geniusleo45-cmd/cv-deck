CREATE TYPE "ReportTarget" AS ENUM ('PRODUCT', 'VENDOR');
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED');
CREATE TABLE "Report" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "targetType" "ReportTarget" NOT NULL, "targetId" TEXT NOT NULL, "reason" TEXT NOT NULL, "status" "ReportStatus" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Report_pkey" PRIMARY KEY ("id"), CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE);
CREATE UNIQUE INDEX "Report_userId_targetType_targetId_key" ON "Report"("userId", "targetType", "targetId");
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");
