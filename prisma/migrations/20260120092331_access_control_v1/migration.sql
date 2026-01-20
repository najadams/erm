/*
  Warnings:

  - The `status` column on the `LegalHold` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `permission` on the `RecordAccess` table. All the data in the column will be lost.
  - You are about to drop the column `durationYears` on the `RetentionPolicy` table. All the data in the column will be lost.
  - You are about to drop the column `startDateField` on the `RetentionPolicy` table. All the data in the column will be lost.
  - The `trigger` column on the `RetentionPolicy` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[classificationNodeId]` on the table `RecordType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `RetentionPolicy` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RetentionTrigger" AS ENUM ('CREATION_DATE', 'LAST_MODIFIED', 'CASE_CLOSED', 'CONTRACT_END', 'EMPLOYMENT_TERMINATION', 'FISCAL_YEAR_END');

-- CreateEnum
CREATE TYPE "DispositionAction" AS ENUM ('DESTROY', 'REVIEW', 'ARCHIVE', 'ARCHIVE_THEN_DESTROY');

-- CreateEnum
CREATE TYPE "RetentionStatus" AS ENUM ('ACTIVE', 'DRAFT', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "DurationUnit" AS ENUM ('DAYS', 'MONTHS', 'YEARS', 'PERMANENT');

-- CreateEnum
CREATE TYPE "LegalHoldStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('VIEW', 'READ', 'EDIT', 'FULL');

-- CreateEnum
CREATE TYPE "AccessType" AS ENUM ('ALLOW', 'DENY');

-- DropForeignKey
ALTER TABLE "RecordAccess" DROP CONSTRAINT "RecordAccess_recordId_fkey";

-- DropForeignKey
ALTER TABLE "RecordLegalHold" DROP CONSTRAINT "RecordLegalHold_recordId_fkey";

-- DropForeignKey
ALTER TABLE "RecordMetadata" DROP CONSTRAINT "RecordMetadata_recordId_fkey";

-- DropForeignKey
ALTER TABLE "RecordVersion" DROP CONSTRAINT "RecordVersion_recordId_fkey";

-- AlterTable
ALTER TABLE "ClassificationNode" ADD COLUMN     "retentionPolicyId" TEXT,
ADD COLUMN     "securityLevel" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "LegalHold" ADD COLUMN     "caseReference" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "notificationRecipients" TEXT,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "status",
ADD COLUMN     "status" "LegalHoldStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "RecordAccess" DROP COLUMN "permission",
ADD COLUMN     "accessType" "AccessType" NOT NULL DEFAULT 'ALLOW',
ADD COLUMN     "level" "AccessLevel" NOT NULL DEFAULT 'VIEW';

-- AlterTable
ALTER TABLE "RecordType" ADD COLUMN     "classificationNodeId" TEXT,
ADD COLUMN     "retentionPolicyId" TEXT;

-- AlterTable
ALTER TABLE "RetentionPolicy" DROP COLUMN "durationYears",
DROP COLUMN "startDateField",
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "dispositionAction" "DispositionAction" NOT NULL DEFAULT 'DESTROY',
ADD COLUMN     "durationUnit" "DurationUnit" NOT NULL DEFAULT 'YEARS',
ADD COLUMN     "durationValue" INTEGER,
ADD COLUMN     "preventDeletion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "status" "RetentionStatus" NOT NULL DEFAULT 'ACTIVE',
DROP COLUMN "trigger",
ADD COLUMN     "trigger" "RetentionTrigger" NOT NULL DEFAULT 'CREATION_DATE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clearanceLevel" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "RecordType_classificationNodeId_key" ON "RecordType"("classificationNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionPolicy_name_key" ON "RetentionPolicy"("name");

-- AddForeignKey
ALTER TABLE "RecordType" ADD CONSTRAINT "RecordType_retentionPolicyId_fkey" FOREIGN KEY ("retentionPolicyId") REFERENCES "RetentionPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordType" ADD CONSTRAINT "RecordType_classificationNodeId_fkey" FOREIGN KEY ("classificationNodeId") REFERENCES "ClassificationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordMetadata" ADD CONSTRAINT "RecordMetadata_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationNode" ADD CONSTRAINT "ClassificationNode_retentionPolicyId_fkey" FOREIGN KEY ("retentionPolicyId") REFERENCES "RetentionPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionPolicy" ADD CONSTRAINT "RetentionPolicy_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalHold" ADD CONSTRAINT "LegalHold_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordLegalHold" ADD CONSTRAINT "RecordLegalHold_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordVersion" ADD CONSTRAINT "RecordVersion_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordAccess" ADD CONSTRAINT "RecordAccess_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;
