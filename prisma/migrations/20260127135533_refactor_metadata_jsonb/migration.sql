/*
  Warnings:

  - You are about to drop the `RecordMetadata` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RecordMetadata" DROP CONSTRAINT "RecordMetadata_metadataFieldId_fkey";

-- DropForeignKey
ALTER TABLE "RecordMetadata" DROP CONSTRAINT "RecordMetadata_recordId_fkey";

-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "metadata" JSONB;

-- DropTable
DROP TABLE "RecordMetadata";

-- CreateIndex
CREATE INDEX "Record_metadata_idx" ON "Record" USING GIN ("metadata" jsonb_ops);
