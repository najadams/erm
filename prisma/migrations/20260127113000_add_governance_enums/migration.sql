-- CreateEnum
CREATE TYPE "Sensitivity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Classification" AS ENUM ('OFFICIAL', 'OFFICIAL_CONFIDENTIAL', 'RESTRICTED', 'SECRET');

-- AlterTable
ALTER TABLE "Record" ADD COLUMN     "classification" "Classification" NOT NULL DEFAULT 'OFFICIAL',
ADD COLUMN     "sensitivity" "Sensitivity" NOT NULL DEFAULT 'LOW';
