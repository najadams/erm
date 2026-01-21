import { prisma } from '@/lib/prisma';
import { User, Record, AccessLevel, AccessType, Prisma } from '@prisma/client';
import { ROLES } from '@/lib/permissions';

export type Action = 'VIEW' | 'READ' | 'EDIT' | 'DELETE' | 'FULL';

/**
 * Access Control Service (ACS)
 * Centralized authority for all permission and visibility checks.
 * Unifies List (Search) and Single-Record security logic.
 */
export class ACS {

  /**
   * Evaluates if a user can perform a specific action on a record.
   * This is the single source of truth for "Can I...?"
   */
  static async evaluate(userId: string, recordId: string, action: Action): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { groups: true }
    });

    if (!user) return false;

    // Fix for "Department vs Group" disconnect (Same as getWhereClause):
    if (user.departmentId) {
        const dept = await prisma.department.findUnique({ 
            where: { id: user.departmentId },
            select: { name: true }
        });
        if (dept) {
            const groups = await prisma.group.findMany({
                where: {
                    type: 'DEPARTMENT',
                    OR: [
                        { name: dept.name },
                        { name: dept.name.replace(' Department', '') },
                        { name: `${dept.name} Department` }
                    ]
                },
                select: { id: true, name: true, type: true } // Need structure to match User.groups
            });
            // Append to user.groups in memory
            groups.forEach(g => {
                // @ts-ignore
                if (!user.groups.some(ug => ug.id === g.id)) {
                     // @ts-ignore
                     user.groups.push({ ...g, createdAt: new Date(), updatedAt: new Date() });
                }
            });
        }
    }

    // 1. GLOBAL ADMIN / AUDITOR OVERRIDES
    if (user.role === ROLES.ADMIN) return true;
    if (user.role === ROLES.AUDITOR && ['VIEW', 'READ'].includes(action)) return true;

    // 2. FETCH RESOURCE CONTEXT
    const record = await prisma.record.findUnique({
      where: { id: recordId },
      include: {
        classificationNode: true,
        access: true
      }
    });

    if (!record) return false;

    // 3. OWNER ACCESS
    if (record.ownerUserId === userId) return true;

    // 4. ABAC: SECURITY CLEARANCE CHECK (CRITICAL)
    const recordSecurityLevel = record.classificationNode?.securityLevel ?? 1;
    const userClearance = user.clearanceLevel ?? 1;
    if (userClearance < recordSecurityLevel) {
      return false; // Hard Fail: Insufficient Clearance
    }

    // 5. ACL: RECORD-LEVEL OVERRIDES (Highest Priority after Admin/Clearance)
    // Check for explicit DENY first
    const explicitDeny = record.access.some((a: any) => 
      a.accessType === AccessType.DENY && 
      (a.userId === userId || user.groups.some((g: any) => g.id === a.groupId))
    );
    if (explicitDeny) return false;

    // Check for explicit ALLOW
    const explicitAllow = record.access.find((a: any) => 
      a.accessType === AccessType.ALLOW &&
      (a.userId === userId || user.groups.some((g: any) => g.id === a.groupId))
    );

    if (explicitAllow) {
      // Check Level sufficiency
      if (this.isLevelSufficient(explicitAllow.level, action)) return true;
    }

    // 6. PROJECT / CASE MEMBERSHIP
    // If record belongs to a project, and user is in that project group -> ALLOW
    if (record.projectId) {
      const inProject = user.groups.some((g: any) => g.id === record.projectId);
      if (inProject && ['VIEW', 'READ', 'EDIT'].includes(action)) return true;
      // Note: Project member usually implies EDIT permissions? 
      // For now, let's assume Project Member = Full Participant (View/Read/Edit)
    }

    // 7. DEPARTMENT VISIBILITY
    // If record belongs to User's Department -> ALLOW VIEW/READ
    // But usually NOT Edit unless Owner or Project member.
    if (record.departmentId && record.departmentId === user.departmentId) {
      if (['VIEW', 'READ'].includes(action)) return true;
    }

    return false;
  }

  /**
   * Generates a Prisma WHERE clause to filter lists efficiently.
   * MUST match the logic in `evaluate` for 'VIEW'/'READ'.
   */
  static async getWhereClause(userId: string): Promise<Prisma.RecordWhereInput> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { groups: true }
    });

    if (!user) return { id: 'nothing' }; // Fail safe

    // 1. ADMIN sees all
    if ([ROLES.ADMIN, ROLES.AUDITOR].includes(user.role as any)) {
      return {}; 
    }

    const userGroupsIds = user.groups.map((g: any) => g.id);
    const userClearance = user.clearanceLevel ?? 1;

    // Fix for "Department vs Group" disconnect:
    // If user is in a Department, find if there is a corresponding Group (by name) 
    // and treat the user as a member of that group for READ access.
    if (user.departmentId) {
        const dept = await prisma.department.findUnique({ 
            where: { id: user.departmentId },
            select: { name: true }
        });
        if (dept) {
            // Find groups with similar name (e.g. "IT" vs "IT Department")
            // Strict match or strict + " Department" removal?
            // Let's do loose matching: Group Name == Dept Name OR Group Name + " Department" == Dept Name
            // Actually, safest is: Group Type = 'DEPARTMENT' AND Name matches.
            // But let's just find Groups that match the Dept Name exactly or as a substring??
            // User case: Dept="IT Department", Group="IT" (or "IT Department")?
            // Let's try exact match first, and trimmed match.
            const groups = await prisma.group.findMany({
                where: {
                    type: 'DEPARTMENT',
                    OR: [
                        { name: dept.name },
                        { name: dept.name.replace(' Department', '') },
                        { name: `${dept.name} Department` }
                    ]
                },
                select: { id: true }
            });
            groups.forEach(g => {
                if (!userGroupsIds.includes(g.id)) userGroupsIds.push(g.id);
            });
        }
    }

    return {
      AND: [
        // A. Base Visibility (Or conditions)
        {
          OR: [
            // 1. Ownership
            { ownerUserId: userId },
            
            // 2. Department Member (View Only)
            ...(user.departmentId ? [{ departmentId: user.departmentId }] : []),
            
            // 3. Project Member
            { projectId: { in: userGroupsIds } },

            // 4. Explicit ACL Allow
            {
              access: {
                some: {
                  accessType: 'ALLOW',
                  OR: [
                    { userId: userId },
                    { groupId: { in: userGroupsIds } }
                  ]
                }
              }
            }
          ]
        },
        
        // B. Exclusions (AND conditions)
        
        // 1. Security Clearance Enforcement
        // Record Security Level must be <= User Clearance
        // Note: We need a relation filter on classificationNode.
        // If classificationNode is null, we assume Level 1 (Public).
        {
            OR: [
                { classificationNode: { is: null } },
                { classificationNode: { securityLevel: { lte: userClearance } } }
            ]
        },

        // 2. Explicit Deny Overrides
        {
          NOT: {
            access: {
              some: {
                accessType: 'DENY',
                OR: [
                  { userId: userId },
                  { groupId: { in: userGroupsIds } }
                ]
              }
            }
          }
        }
      ]
    };
  }

  // Helper: Compare AccessLevels
  // VIEW < READ < EDIT < FULL
  private static isLevelSufficient(granted: AccessLevel, requested: Action): boolean {
    const levels = {
      [AccessLevel.VIEW]: 1,
      [AccessLevel.READ]: 2,
      [AccessLevel.EDIT]: 3,
      [AccessLevel.FULL]: 4
    };
    
    // Map Action to required level
    const requirements = {
      'VIEW': 1,
      'READ': 2,
      'EDIT': 3,
      'DELETE': 4,
      'FULL': 4
    };

    const grantedVal = levels[granted] || 0;
    const reqVal = requirements[requested] || 99;

    return grantedVal >= reqVal;
  }
}
