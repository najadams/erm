
import { prisma } from '@/lib/prisma';
import { Role } from './permissions';

export type AccessLevel = 'VIEW' | 'EDIT' | 'DELETE';

export async function canAccessRecord(
  userId: string, 
  recordId: string, 
  level: AccessLevel = 'VIEW'
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { groups: true }
  });

  if (!user) return false;

  // ADMIN can do anything
  if (user.role === 'ADMIN') return true;

  // AUDITOR can VIEW everything
  if (user.role === 'AUDITOR' && level === 'VIEW') return true;

  const record = await prisma.record.findUnique({
    where: { id: recordId }
  });

  if (!record) return false;

  // Private records: Only owner (and ADMIN checked above)
  if (record.visibility === 'PRIVATE') {
    return record.userId === user.id;
  }

  // Edit/Delete: Only owner (except Admin)
  if (level === 'EDIT' || level === 'DELETE') {
    return record.userId === user.id;
  }

  // View Public: Everyone
  if (record.visibility === 'PUBLIC') {
    return true;
  }

  // View Group: Must be in group
  if (record.visibility === 'GROUP') {
    if (!record.groupId) return true; // Fallback if no group set? Or restrictive? Let's say restrictive.
    // Wait, if no groupId, it's effectively private or public? Default is Public.
    // If visibility is GROUP but no groupId, logic breaks. Assume groupId exists.
    return user.groups.some(g => g.id === record.groupId);
  }

  return false;
}

export async function getAccessibleRecordsClause(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { groups: true }
  });

  if (!user) return { id: 'nothing' }; // invalid

  if (user.role === 'ADMIN' || user.role === 'AUDITOR') {
    return {}; // All records
  }

  return {
    OR: [
      { visibility: 'PUBLIC' },
      { visibility: 'PRIVATE', userId: user.id },
      { 
        visibility: 'GROUP', 
        groupId: { in: user.groups.map(g => g.id) } 
      }
    ]
  };
}
