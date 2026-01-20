/*
  Warnings:

  - A unique constraint covering the columns `[referenceNumber,versionNumber]` on the table `Record` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Record_referenceNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "Record_referenceNumber_versionNumber_key" ON "Record"("referenceNumber", "versionNumber");
