import { prisma } from '@/lib/prisma';
import { User, Record, AccessLevel, AccessType, Prisma } from '@prisma/client';
import { ROLES, EVERYONE_GROUP_ID } from '@/lib/permissions';

export type Action = 'VIEW' | 'COMMENT' | 'EDIT_METADATA' | 'EDIT_CONTENT' | 'GOVERNANCE' | 'DELETE' | 'FULL';

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

    // Inject Implicit "Everyone" Group
    // @ts-ignore
    user.groups.push({ id: EVERYONE_GROUP_ID, name: 'Everyone', type: 'SYSTEM' });

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
    if (user.role === ROLES.AUDITOR && ['VIEW', 'COMMENT'].includes(action)) return true;

    // 2. FETCH RESOURCE CONTEXT
    const record = await prisma.record.findUnique({
      where: { id: recordId },
      include: {
        classificationNode: true,
        access: true,
        registeredCompany: { select: { id: true, accessPermissions: true } }
      }
    });

    if (!record) return false;

    // 3. ABAC: SECURITY CLEARANCE CHECK (CRITICAL)
    // Moved above Owner check to ensure Clearance serves as a hard intersection/filter even for owners.
    const recordSecurityLevel = record.classificationNode?.securityLevel ?? 1;
    const userClearance = user.clearanceLevel ?? 1;
    if (userClearance < recordSecurityLevel) {
      return false; // Hard Fail: Insufficient Clearance
    }

    // 4. OWNER ACCESS
    if (record.ownerUserId === userId) return true;

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

    // 5b. ACL: COMPANY-LEVEL OVERRIDES
    if (record.registeredCompany) {
         // Check if user has access to this company
         // Note: We fetched accessPermissions with the record, but we need to filter valid ones.
         // Prisma relation "accessPermissions" on registeredCompany is CompanyAccess[]
         const companyAccess = (record.registeredCompany as any).accessPermissions.find((a: any) =>
            a.accessType === AccessType.ALLOW &&
            (a.userId === userId || user.groups.some((g: any) => g.id === a.groupId))
         );
         
         if (companyAccess) {
             if (this.isLevelSufficient(companyAccess.level, action)) return true;
         }
    }

    // 6. PROJECT / CASE MEMBERSHIP
    // Legacy Group Check
    if (record.projectId) {
      const inProject = user.groups.some((g: any) => g.id === record.projectId);
      if (inProject && ['VIEW', 'COMMENT', 'EDIT_METADATA', 'EDIT_CONTENT'].includes(action)) return true;
    }

    // 6b. GIPC PROJECT MEMBERSHIP
    const projectAccess = await prisma.projectRecord.findFirst({
        where: {
            recordId: recordId,
            project: {
                members: { some: { userId: userId } }
            }
        },
        include: {
            project: { select: { status: true } }
        }
    });

    if (projectAccess) {
        // If Project is Frozen, only allow Read
        if (projectAccess.project.status === 'ON_HOLD') {
             if (['VIEW', 'COMMENT'].includes(action)) return true;
        } else {
             // Active Project: Allow VIEW/COMMENT/EDIT
             if (['VIEW', 'COMMENT', 'EDIT_METADATA', 'EDIT_CONTENT'].includes(action)) return true;
             // DELETE: Restrict to Manager
             if (action === 'DELETE') {
                 const member = await prisma.projectMember.findUnique({
                     where: { projectId_userId: { projectId: projectAccess.projectId, userId } }
                 });
                 if (member?.role === 'MANAGER') return true;
             }
        }
    }

    // 7. DEPARTMENT VISIBILITY
    // If record belongs to User's Department -> ALLOW VIEW/READ
    // But usually NOT Edit unless Owner or Project member.
    if (record.departmentId && record.departmentId === user.departmentId) {
      if (['VIEW', 'COMMENT'].includes(action)) return true;
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
    userGroupsIds.push(EVERYONE_GROUP_ID); // Inject Everyone Group ID

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
            
            // 3. Project Member (Legacy)
            { projectId: { in: userGroupsIds } },

            // 4. GIPC Project Membership
            {
               projectRecords: {
                   some: {
                       project: {
                           members: { some: { userId: userId } }
                       }
                   }
               }
            },

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
            },

            // 5. Company Access Permissions
            {
               registeredCompany: {
                   accessPermissions: {
                       some: {
                           accessType: 'ALLOW',
                           OR: [
                               { userId: userId },
                               { groupId: { in: userGroupsIds } }
                           ]
                       }
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
  // VIEW < COMMENT < EDIT_METADATA < EDIT_CONTENT < GOVERNANCE < FULL
  private static isLevelSufficient(granted: AccessLevel, requested: Action): boolean {
    const levels = {
      [AccessLevel.VIEW]: 1,
      [AccessLevel.COMMENT]: 2,
      [AccessLevel.EDIT_METADATA]: 3,
      [AccessLevel.EDIT_CONTENT]: 4,
      [AccessLevel.GOVERNANCE]: 5,
      [AccessLevel.FULL]: 6
    };
    
    // Map Action to required level
    const requirements = {
      'VIEW': 1,
      'COMMENT': 2,
      'EDIT_METADATA': 3,
      'EDIT_CONTENT': 4,
      'GOVERNANCE': 5,
      'DELETE': 6,
      'FULL': 6
    };

    const grantedVal = levels[granted] || 0;
    const reqVal = requirements[requested] || 99;

    return grantedVal >= reqVal;
  }
}
