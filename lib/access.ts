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
    where: { id: userId },
    include: { groups: true }
  });

  if (!user) return { id: 'nothing' }; 

  if (user.accountExpiresAt && new Date() > user.accountExpiresAt) {
      return { id: 'nothing' };
  }

  // 1. Admin / Auditor / Records Manager see ALL
  // (Records Manager might need scoping, but usually sees all for management)
  if (['ADMIN', 'AUDITOR', 'RECORDS_MANAGER', 'RECORDS_OFFICER'].includes(user.role)) {
    return {}; // All records
  }

  // 2. ABAC Clause construction
  // Rules:
  // - Own records
  // - Department records (if user has department)
  // - Explicitly shared (User or Group)
  
  const userGroupsIds = user.groups.map(g => g.id);

  return {
    OR: [
        // Rule A: Ownership
        { ownerUserId: userId },
        
        // Rule B: Department Visibility
        // If the record is associated with my department, I can view it.
        ...(user.departmentId ? [{ departmentId: user.departmentId }] : []),
        
        // Rule C: Explicit Shared Access (Direct)
        { 
            access: { 
                some: { 
                    userId: userId,
                    permission: { in: ['VIEW', 'EDIT', 'DOWNLOAD'] } 
                } 
            } 
        },

        // Rule D: Group Access
        ...(userGroupsIds.length > 0 ? [{
            access: {
                some: {
                    groupId: { in: userGroupsIds },
                    permission: { in: ['VIEW', 'EDIT', 'DOWNLOAD'] }
                }
            }
        }] : [])
    ]
  };
}
