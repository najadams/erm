-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "isLatest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "versionGroupId" TEXT,
ADD COLUMN     "versionNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Record_versionGroupId_idx" ON "Record"("versionGroupId");
