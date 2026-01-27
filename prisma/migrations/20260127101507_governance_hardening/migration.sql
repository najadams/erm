/*
  Warnings:

  - The values [READ,EDIT] on the enum `AccessLevel` will be removed. If these variants are still used in the database, this will fail.
  - The `status` column on the `Record` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REGISTERED', 'LOCKED', 'ARCHIVED');

-- AlterEnum
BEGIN;
CREATE TYPE "AccessLevel_new" AS ENUM ('VIEW', 'COMMENT', 'EDIT_METADATA', 'EDIT_CONTENT', 'GOVERNANCE', 'FULL');
ALTER TABLE "AccessRequest" ALTER COLUMN "requestedLevel" DROP DEFAULT;
ALTER TABLE "CompanyAccess" ALTER COLUMN "level" DROP DEFAULT;
ALTER TABLE "RecordAccess" ALTER COLUMN "level" DROP DEFAULT;
ALTER TABLE "CompanyAccess" ALTER COLUMN "level" TYPE "AccessLevel_new" USING ("level"::text::"AccessLevel_new");
ALTER TABLE "RecordAccess" ALTER COLUMN "level" TYPE "AccessLevel_new" USING ("level"::text::"AccessLevel_new");
ALTER TABLE "AccessRequest" ALTER COLUMN "requestedLevel" TYPE "AccessLevel_new" USING ("requestedLevel"::text::"AccessLevel_new");
ALTER TABLE "AccessRequest" ALTER COLUMN "approvedLevel" TYPE "AccessLevel_new" USING ("approvedLevel"::text::"AccessLevel_new");
ALTER TYPE "AccessLevel" RENAME TO "AccessLevel_old";
ALTER TYPE "AccessLevel_new" RENAME TO "AccessLevel";
DROP TYPE "AccessLevel_old";
ALTER TABLE "AccessRequest" ALTER COLUMN "requestedLevel" SET DEFAULT 'VIEW';
ALTER TABLE "CompanyAccess" ALTER COLUMN "level" SET DEFAULT 'VIEW';
ALTER TABLE "RecordAccess" ALTER COLUMN "level" SET DEFAULT 'VIEW';
COMMIT;

-- AlterTable
ALTER TABLE "AccessRequest" ALTER COLUMN "requestedLevel" SET DEFAULT 'VIEW';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "Record" DROP COLUMN "status",
ADD COLUMN     "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT';
