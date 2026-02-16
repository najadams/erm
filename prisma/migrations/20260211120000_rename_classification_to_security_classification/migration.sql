-- Rename the Classification enum type to SecurityClassification
ALTER TYPE "Classification" RENAME TO "SecurityClassification";

-- Rename the column on the Record table
ALTER TABLE "Record" RENAME COLUMN "classification" TO "securityClassification";
