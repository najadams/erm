/*
  Warnings:

  - The `status` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[referenceNumber]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('INVESTMENT', 'EXPANSION', 'INCENTIVE', 'COMPLIANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "registeredCompanyId" TEXT,
ADD COLUMN     "sector" TEXT,
ADD COLUMN     "type" "ProjectType" NOT NULL DEFAULT 'INVESTMENT',
DROP COLUMN "status",
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE UNIQUE INDEX "Project_referenceNumber_key" ON "Project"("referenceNumber");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_registeredCompanyId_fkey" FOREIGN KEY ("registeredCompanyId") REFERENCES "RegisteredCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
