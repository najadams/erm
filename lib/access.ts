import { prisma } from '@/lib/prisma';

export type AccessLevel = 'VIEW' | 'EDIT' | 'DELETE';

export async function canAccessRecord(
  userId: string, 
  recordId: string, 
  level: AccessLevel = 'VIEW'
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) return false;

  // 1. Check Account Expiry
  if (user.accountExpiresAt && new Date() > user.accountExpiresAt) {
    return false;
  }

  // Admin and Auditors
  if (user.role === 'ADMIN') return true;
  if (user.role === 'AUDITOR' && level === 'VIEW') return true;

  // 2. Fetch Record
  const record = await prisma.record.findUnique({
    where: { id: recordId },
    select: { ownerUserId: true, departmentId: true }
  });

  if (!record) return false;

  // 3. Ownership Check
  if (record.ownerUserId === userId) return true;

  // TODO: Implement Department/Group checks via RecordAccess table
  // For now, restrictive default
  return false;
}

export async function getAccessibleRecordsClause(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) return { id: 'nothing' }; 

  if (user.accountExpiresAt && new Date() > user.accountExpiresAt) {
      return { id: 'nothing' };
  }

  if (user.role === 'ADMIN' || user.role === 'AUDITOR') {
    return {}; // All records
  }

  // Basic: Users see their own records
  return {
    ownerUserId: userId
  };
}
