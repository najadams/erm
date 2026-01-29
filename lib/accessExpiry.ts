/**
 * ACCESS EXPIRY PROCESSOR
 *
 * Cleans up expired RecordAccess and CompanyAccess entries.
 * Called by /api/cron/access-expiry endpoint.
 */

import { prisma } from '@/lib/prisma';

export async function processExpiredAccess(): Promise<number> {
  const now = new Date();
  let totalProcessed = 0;

  // 1. Find and remove expired RecordAccess entries
  const expiredRecordAccess = await prisma.recordAccess.findMany({
    where: { expiresAt: { lt: now } },
    include: {
      user: { select: { id: true, name: true } },
      record: { select: { id: true, title: true } }
    }
  });

  for (const grant of expiredRecordAccess) {
    await prisma.$transaction([
      prisma.recordAccess.delete({ where: { id: grant.id } }),
      prisma.auditLog.create({
        data: {
          action: 'ACCESS_EXPIRED',
          recordId: grant.recordId,
          userId: grant.userId || 'SYSTEM',
          source: 'CRON',
          newValue: JSON.stringify({
            level: grant.level,
            principalType: grant.principalType,
            expiredAt: grant.expiresAt,
            userName: grant.user?.name,
            recordTitle: grant.record?.title
          })
        }
      })
    ]);
    totalProcessed++;
  }

  // 2. Find and remove expired CompanyAccess entries
  const expiredCompanyAccess = await prisma.companyAccess.findMany({
    where: { expiresAt: { lt: now } },
    include: {
      user: { select: { id: true, name: true } },
      registeredCompany: { select: { id: true, name: true } }
    }
  });

  for (const grant of expiredCompanyAccess) {
    await prisma.$transaction([
      prisma.companyAccess.delete({ where: { id: grant.id } }),
      prisma.auditLog.create({
        data: {
          action: 'ACCESS_EXPIRED',
          userId: grant.userId || 'SYSTEM',
          source: 'CRON',
          newValue: JSON.stringify({
            level: grant.level,
            registeredCompanyId: grant.registeredCompanyId,
            expiredAt: grant.expiresAt,
            userName: grant.user?.name,
            companyName: grant.registeredCompany?.name
          })
        }
      })
    ]);
    totalProcessed++;
  }

  return totalProcessed;
}
