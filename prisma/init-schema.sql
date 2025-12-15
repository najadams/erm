-- Create tables based on Prisma schema

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT NOT NULL,
  "name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Group" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "_UserGroups" (
  "A" TEXT NOT NULL REFERENCES "Group"("id") ON DELETE CASCADE,
  "B" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "_UserGroups_AB_unique" ON "_UserGroups"("A", "B");
CREATE INDEX IF NOT EXISTS "_UserGroups_B_index" ON "_UserGroups"("B");

CREATE TABLE IF NOT EXISTS "Record" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "fileUrl" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "tags" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "groupId" TEXT REFERENCES "Group"("id"),
  "visibility" TEXT NOT NULL DEFAULT 'PUBLIC'
);

CREATE TABLE IF NOT EXISTS "RecordHistory" (
  "id" TEXT PRIMARY KEY,
  "recordId" TEXT NOT NULL REFERENCES "Record"("id"),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "fileUrl" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "tags" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "groupId" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
  "version" INTEGER NOT NULL,
  "changedBy" TEXT,
  "changedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "changeReason" TEXT
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "action" TEXT NOT NULL,
  "recordId" TEXT REFERENCES "Record"("id"),
  "userId" TEXT NOT NULL REFERENCES "User"("id"),
  "timestamp" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "AccessRequest" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
