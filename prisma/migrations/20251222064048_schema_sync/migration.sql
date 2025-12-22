/*
  Warnings:

  - A unique constraint covering the columns `[referenceNumber]` on the table `Record` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ClassificationNode" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "lastSequenceNumber" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "referenceNumber" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "departmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Record_referenceNumber_key" ON "Record"("referenceNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationNode" ADD CONSTRAINT "ClassificationNode_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Record"("id") ON DELETE SET NULL ON UPDATE CASCADE;
