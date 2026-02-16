-- UserVisibleRecords: Materialized cache of each user's visible record IDs
-- This is a cache table, NOT a domain entity — it's rebuilt on access change events

CREATE TABLE "UserVisibleRecords" (
    "userId"   TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "level"    TEXT NOT NULL DEFAULT 'DISCOVERY',
    "cachedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("userId", "recordId")
);

-- Fast lookup by user (the main query path)
CREATE INDEX idx_uvr_user ON "UserVisibleRecords" ("userId");

-- Fast invalidation by record (when a record's ACL changes)
CREATE INDEX idx_uvr_record ON "UserVisibleRecords" ("recordId");

-- Staleness tracking
CREATE INDEX idx_uvr_cached_at ON "UserVisibleRecords" ("cachedAt");