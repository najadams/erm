/**
 * ACCESS CACHE SERVICE
 *
 * Manages the UserVisibleRecords materialized cache table.
 * Pre-computes each user's visible record IDs to replace the expensive
 * ACS WHERE clause with a simple `id IN (...)` query.
 *
 * Invalidation Strategy:
 * - User-level: When user's role, department, or clearance changes
 * - Record-level: When a record's ACL, status, or classification changes
 * - Global: When ACS logic changes (manual trigger)
 */

import { prisma } from '@/lib/prisma';
import { ACS } from '@/lib/acs';
import { invalidateCache, CacheKeys } from '@/lib/cache';

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Rebuild the visible records cache for a specific user.
 * Runs the full ACS WHERE clause once, stores result IDs.
 */
export async function rebuildForUser(userId: string): Promise<number> {
  // 1. Get the full ACS WHERE clause (this is the expensive computation we're caching)
  const whereClause = await ACS.getWhereClauseRaw(userId);

  // 2. Query all visible record IDs using the clause
  const visibleRecords = await prisma.record.findMany({
    where: whereClause,
    select: { id: true }
  });

  const recordIds = visibleRecords.map(r => r.id);

  // 3. Replace the user's cache atomically
  await prisma.$transaction([
    // Delete old cache for this user
    prisma.$executeRaw`DELETE FROM "UserVisibleRecords" WHERE "userId" = ${userId}`,
    // Insert new cache
    ...(recordIds.length > 0
      ? [prisma.$executeRaw`
          INSERT INTO "UserVisibleRecords" ("userId", "recordId", "level", "cachedAt")
          SELECT ${userId}, unnest(${recordIds}::text[]), 'DISCOVERY', NOW()
        `]
      : [])
  ]);

  // 4. Also invalidate the Redis ACS cache for this user
  await invalidateCache(CacheKeys.acs(userId));

  return recordIds.length;
}

/**
 * Get cached visible record IDs for a user.
 * Returns null if cache is stale/missing (caller should fall back to full computation).
 */
export async function getVisibleRecordIds(userId: string): Promise<string[] | null> {
  // Check if cache exists and is fresh
  const cacheCheck: any[] = await prisma.$queryRaw`
    SELECT MIN("cachedAt") as oldest
    FROM "UserVisibleRecords"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;

  if (!cacheCheck.length || !cacheCheck[0].oldest) {
    return null; // No cache — stale
  }

  const age = Date.now() - new Date(cacheCheck[0].oldest).getTime();
  if (age > STALE_THRESHOLD_MS) {
    return null; // Cache too old
  }

  // Cache is fresh — return IDs
  const cached: any[] = await prisma.$queryRaw`
    SELECT "recordId"
    FROM "UserVisibleRecords"
    WHERE "userId" = ${userId}
  `;

  return cached.map(r => r.recordId);
}

/**
 * Invalidate cache for a specific user (e.g., when their role or department changes).
 */
export async function invalidateForUser(userId: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM "UserVisibleRecords" WHERE "userId" = ${userId}`;
  await invalidateCache(CacheKeys.acs(userId));
}

/**
 * Invalidate cache for all users who have a specific record cached.
 * Called when a record's ACL, status, or classification changes.
 */
export async function invalidateForRecord(recordId: string): Promise<void> {
  // Find which users had this record cached
  const affectedUsers: any[] = await prisma.$queryRaw`
    SELECT DISTINCT "userId"
    FROM "UserVisibleRecords"
    WHERE "recordId" = ${recordId}
  `;

  if (affectedUsers.length > 0) {
    // Delete all cache entries for those users
    const userIds = affectedUsers.map(u => u.userId);
    await prisma.$executeRaw`DELETE FROM "UserVisibleRecords" WHERE "userId" = ANY(${userIds}::text[])`;

    // Also invalidate their Redis ACS caches
    for (const uid of userIds) {
      await invalidateCache(CacheKeys.acs(uid));
    }
  }
}

/**
 * Full rebuild for all active users. Use sparingly (e.g., after ACS logic changes).
 * Processes users in parallel batches of CONCURRENCY_LIMIT to avoid overwhelming the DB.
 */
export async function rebuildAll(): Promise<number> {
  const CONCURRENCY_LIMIT = 5;

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true }
  });

  let total = 0;

  for (let i = 0; i < users.length; i += CONCURRENCY_LIMIT) {
    const batch = users.slice(i, i + CONCURRENCY_LIMIT);
    const results = await Promise.all(
      batch.map(user => rebuildForUser(user.id))
    );
    total += results.reduce((sum, count) => sum + count, 0);
  }

  return total;
}
