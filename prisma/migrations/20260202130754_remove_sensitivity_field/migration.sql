/*
  Warnings:

  - You are about to drop the column `sensitivity` on the `Record` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Record" DROP COLUMN "sensitivity";

-- DropEnum
DROP TYPE "Sensitivity";
