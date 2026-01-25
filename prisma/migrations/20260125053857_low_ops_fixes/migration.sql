/*
  Warnings:

  - A unique constraint covering the columns `[versionGroupId,versionNumber]` on the table `Record` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "linkedGroupId" TEXT;

-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "search_vector" tsvector;

-- CreateIndex
CREATE INDEX "Record_search_vector_idx" ON "Record" USING GIN ("search_vector");

-- FTS Trigger Function
CREATE OR REPLACE FUNCTION records_search_vector_update() RETURNS trigger AS $$
BEGIN
  -- Concatenate Title, Reference, and Company Snapshot with weights
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW."referenceNumber", '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW."companySnapshotName", '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Trigger on Record Insert/Update
DROP TRIGGER IF EXISTS tsvectorupdate ON "Record";
CREATE TRIGGER tsvectorupdate
BEFORE INSERT OR UPDATE ON "Record"
FOR EACH ROW EXECUTE FUNCTION records_search_vector_update();

-- CreateIndex
CREATE UNIQUE INDEX "Record_versionGroupId_versionNumber_key" ON "Record"("versionGroupId", "versionNumber");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_linkedGroupId_fkey" FOREIGN KEY ("linkedGroupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
