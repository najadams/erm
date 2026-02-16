-- Partial Indexes: Active records get their own indexes so archived records don't pollute query plans

-- Active records filtered by owner
CREATE INDEX idx_record_active_owner
  ON "Record" ("ownerUserId")
  WHERE status IN ('DRAFT', 'SUBMITTED', 'REGISTERED') AND "deletedAt" IS NULL;

-- Active records filtered by department
CREATE INDEX idx_record_active_dept
  ON "Record" ("departmentId")
  WHERE status IN ('DRAFT', 'SUBMITTED', 'REGISTERED') AND "deletedAt" IS NULL;

-- Active records sorted by creation date (most common list ordering)
CREATE INDEX idx_record_active_created
  ON "Record" ("createdAt" DESC)
  WHERE status IN ('DRAFT', 'SUBMITTED', 'REGISTERED') AND "deletedAt" IS NULL;

-- Active records filtered by security classification
CREATE INDEX idx_record_active_classification
  ON "Record" ("securityClassification")
  WHERE status IN ('DRAFT', 'SUBMITTED', 'REGISTERED') AND "deletedAt" IS NULL;

-- Archived records get a separate covering index
CREATE INDEX idx_record_archived
  ON "Record" ("createdAt" DESC)
  WHERE status = 'ARCHIVED';

-- Soft-deleted records index for admin recovery queries
CREATE INDEX idx_record_deleted
  ON "Record" ("deletedAt" DESC)
  WHERE "deletedAt" IS NOT NULL;