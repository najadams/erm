/*
  Warnings:

  - The values [LOCKED] on the enum `RecordStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RecordStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'REGISTERED', 'ARCHIVED');
ALTER TABLE "Record" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Record" ALTER COLUMN "status" TYPE "RecordStatus_new" USING ("status"::text::"RecordStatus_new");
ALTER TYPE "RecordStatus" RENAME TO "RecordStatus_old";
ALTER TYPE "RecordStatus_new" RENAME TO "RecordStatus";
DROP TYPE "RecordStatus_old";
ALTER TABLE "Record" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedById" TEXT,
ADD COLUMN     "lockedReason" TEXT;
