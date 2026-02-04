-- AlterTable
ALTER TABLE "AccessRequest" ADD COLUMN     "batchId" TEXT;

-- CreateIndex
CREATE INDEX "AccessRequest_batchId_idx" ON "AccessRequest"("batchId");
