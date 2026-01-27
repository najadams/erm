/*
  Warnings:

  - You are about to drop the column `email` on the `AccessRequest` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `AccessRequest` table. All the data in the column will be lost.
  - You are about to drop the `RecordAccessRequest` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `requesterId` to the `AccessRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resourceType` to the `AccessRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `AccessRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('RECORD', 'COMPANY');

-- DropForeignKey
ALTER TABLE "RecordAccessRequest" DROP CONSTRAINT "RecordAccessRequest_recordId_fkey";

-- DropForeignKey
ALTER TABLE "RecordAccessRequest" DROP CONSTRAINT "RecordAccessRequest_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "RecordAccessRequest" DROP CONSTRAINT "RecordAccessRequest_reviewedById_fkey";

-- DropIndex
DROP INDEX "AccessRequest_email_key";

-- AlterTable
ALTER TABLE "AccessRequest" DROP COLUMN "email",
DROP COLUMN "name",
ADD COLUMN     "approvedLevel" "AccessLevel",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "recordId" TEXT,
ADD COLUMN     "registeredCompanyId" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requestedLevel" "AccessLevel" NOT NULL DEFAULT 'READ',
ADD COLUMN     "requesterId" TEXT NOT NULL,
ADD COLUMN     "resourceType" "ResourceType" NOT NULL,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "RecordAccessRequest";

-- CreateTable
CREATE TABLE "CompanyAccess" (
    "id" TEXT NOT NULL,
    "registeredCompanyId" TEXT NOT NULL,
    "userId" TEXT,
    "groupId" TEXT,
    "level" "AccessLevel" NOT NULL DEFAULT 'VIEW',
    "accessType" "AccessType" NOT NULL DEFAULT 'ALLOW',
    "grantedById" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountRequest" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountRequest_email_key" ON "AccountRequest"("email");

-- AddForeignKey
ALTER TABLE "CompanyAccess" ADD CONSTRAINT "CompanyAccess_registeredCompanyId_fkey" FOREIGN KEY ("registeredCompanyId") REFERENCES "RegisteredCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAccess" ADD CONSTRAINT "CompanyAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAccess" ADD CONSTRAINT "CompanyAccess_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_registeredCompanyId_fkey" FOREIGN KEY ("registeredCompanyId") REFERENCES "RegisteredCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
