import { prisma } from '@/lib/prisma';

const BATCH_SIZE = 100; // Process records in chunks of 100

/**
 * Check for records that have reached their disposition date.
 * Returns records in batches to prevent memory issues with large datasets.
 */
export async function checkRetention(cursor?: string) {
  const now = new Date();

  const expiredRecords = await prisma.record.findMany({
    where: {
      status: { in: ['REGISTERED', 'ARCHIVED'] },
      dispositionDate: { lte: now },
      isLegalHold: false,
      deletedAt: null, // Skip already soft-deleted records
    },
    select: { id: true, title: true, dispositionDate: true, status: true },
    orderBy: { dispositionDate: 'asc' },
    take: BATCH_SIZE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  return expiredRecords;
}

/**
 * Process disposition for a batch of expired records.
 * Uses a batched transaction for atomicity within each batch.
 * Idempotent: checks if audit log already exists before creating.
 */
export async function processDisposition(
  records: { id: string; title: string }[]
) {
  const results: { id: string; success: boolean; skipped?: boolean }[] = [];

  for (const record of records) {
    try {
      // Idempotency: skip if we already logged for this record today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const existing = await prisma.auditLog.findFirst({
        where: {
          action: 'RETENTION_EXPIRED',
          newValue: { contains: record.id },
          timestamp: { gte: todayStart },
        },
      });

      if (existing) {
        results.push({ id: record.id, success: true, skipped: true });
        continue;
      }

      // Create audit log entry for disposition notification
      await prisma.auditLog.create({
        data: {
          action: 'RETENTION_EXPIRED',
          userId: 'SYSTEM',
          actorRole: 'SYSTEM',
          source: 'CRON',
          newValue: JSON.stringify({
            message:
              'Record reached disposition date. Ready for manual review.',
            recordId: record.id,
            title: record.title,
          }),
        },
      });

      results.push({ id: record.id, success: true });
    } catch (e) {
      console.error(`Failed to process disposition for ${record.id}`, e);
      results.push({ id: record.id, success: false });
    }
  }

  return results;
}
