-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Record_ownerUserId_idx" ON "Record"("ownerUserId");

-- CreateIndex
CREATE INDEX "Record_departmentId_idx" ON "Record"("departmentId");

-- CreateIndex
CREATE INDEX "Record_status_idx" ON "Record"("status");

-- CreateIndex
CREATE INDEX "Record_securityClassification_idx" ON "Record"("securityClassification");

-- CreateIndex
CREATE INDEX "Record_registeredCompanyId_idx" ON "Record"("registeredCompanyId");

-- CreateIndex
CREATE INDEX "Record_deletedAt_idx" ON "Record"("deletedAt");
