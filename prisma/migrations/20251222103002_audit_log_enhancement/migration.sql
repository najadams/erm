-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "actorRole" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'WEB',
ADD COLUMN     "userAgent" TEXT;
