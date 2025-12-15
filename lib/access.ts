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

  // 1. Check Account Expiry
  if (user.accountExpiresAt && new Date() > user.accountExpiresAt) {
    return false;
  }

  // 2. Fetch Record with Sharing Info
  const record = await prisma.record.findUnique({
    where: { id: recordId },
    include: {
        sharedWithUsers: { select: { id: true } },
        sharedWithGroups: { select: { id: true } }
    }
  });

  if (!record) return false;

  // 3. LEGAL_HOLD Check
  if (record.status === 'LEGAL_HOLD') {
    // Block DELETE for EVERYONE (including Admin/Auditor logic below, usually)
    // But usually Admins can remove hold. 
    // For now, STRICTLY block DELETE for everyone as per requirement.
    if (level === 'DELETE') return false;
  }

  // ADMIN can do anything (except DELETE held records, if we want strict)
  // Let's allow Admin to VIEW/EDIT even if held, but DELETE is blocked above if status is 'LEGAL_HOLD'.
  // Actually, if we want Admins to be able to *remove* the hold, they need EDIT.
  // So the check above is correct for DELETE.
  if (user.role === 'ADMIN') return true;

  // AUDITOR can VIEW everything
  if (user.role === 'AUDITOR' && level === 'VIEW') return true;

  // Private records: Only owner (and ADMIN checked above)
  if (record.visibility === 'PRIVATE') {
    // Check direct sharing (User)
    if (record.sharedWithUsers.some(u => u.id === user.id)) {
        return level === 'VIEW'; // Shared users can usually only VIEW
    }
    return record.userId === user.id;
  }

  // Edit/Delete: Only owner (except Admin)
  if (level === 'EDIT' || level === 'DELETE') {
    // Shared users/groups typically don't get Edit rights in this simple model, 
    // unless we add 'permissionLevel' to the relation. 
    // For now, assume Sharing = VIEW ONLY.
    return record.userId === user.id;
  }

  // View Public: Everyone
  if (record.visibility === 'PUBLIC') {
    return true;
  }

  // View Group: Must be in group (Owner Group or Shared Group)
  if (record.visibility === 'GROUP') {
    const userGroupIds = user.groups.map(g => g.id);
    
    // Check Owner Group
    if (record.groupId && userGroupIds.includes(record.groupId)) return true;
    
    // Check Shared Groups
    if (record.sharedWithGroups.some(g => userGroupIds.includes(g.id))) return true;

    // Check Direct User Share (Overrides Group restriction)
    if (record.sharedWithUsers.some(u => u.id === user.id)) return true;
    
    return false;
  }

  return false;
}

export async function getAccessibleRecordsClause(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { groups: true }
  });

  if (!user) return { id: 'nothing' }; // invalid

  // Check Expiry (If expired, see nothing? Or just can't login? 
  // API usually checks this. Let's return 'nothing' if expired to be safe.)
  if (user.accountExpiresAt && new Date() > user.accountExpiresAt) {
      return { id: 'nothing' };
  }

  if (user.role === 'ADMIN' || user.role === 'AUDITOR') {
    return {}; // All records
  }

  const userGroupIds = user.groups.map(g => g.id);

  return {
    OR: [
      { visibility: 'PUBLIC' },
      { userId: user.id }, // Own records (Private/Group/Public)
      { 
        // Group Records (Owner Group OR Shared Group)
        OR: [
            { groupId: { in: userGroupIds } },
            { sharedWithGroups: { some: { id: { in: userGroupIds } } } }
        ]
      },
      {
        // Direct Shared Records
        sharedWithUsers: { some: { id: user.id } }
      }
    ]
  };
}
