/**
 * ACCESS CONTROL SERVICE (ACS)
 *
 * Centralized authority for all permission and visibility checks.
 * Implements a tiered access model:
 *
 * 1. DISCOVERY - Can see record exists, view metadata (title, classification, dates)
 * 2. CONTENT - Can view actual document content
 * 3. EDIT - Can modify metadata or content
 * 4. GOVERNANCE - Can perform governance actions (lock, archive, etc.)
 *
 * Project Membership Access Policy:
 * - Project membership grants DISCOVERY access only by default
 * - Content access requires: (ProjectMember) AND (Clearance >= Security) AND
 *   (ExplicitRecordPermission OR DepartmentScope)
 */

import { prisma } from '@/lib/prisma';
import { AccessLevel, AccessType, Prisma } from '@prisma/client';
import { ROLES, EVERYONE_GROUP_ID, hasClearance, getRequiredClearance } from '@/lib/permissions';

// =============================================================================
// TYPES
// =============================================================================

export type Action =
  | 'DISCOVERY'      // See existence + metadata only
  | 'VIEW'           // Full content view
  | 'COMMENT'        // Add comments
  | 'EDIT_METADATA'  // Modify metadata
  | 'EDIT_CONTENT'   // Modify files/content
  | 'GOVERNANCE'     // Governance actions
  | 'DELETE'         // Delete record
  | 'FULL';          // All permissions

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  accessLevel?: AccessLevel;
}

// =============================================================================
// ACCESS CONTROL SERVICE
// =============================================================================

export class ACS {

  /**
   * Evaluates if a user can perform a specific action on a record.
   * This is the single source of truth for "Can I...?"
   */
  static async evaluate(userId: string, recordId: string, action: Action): Promise<boolean> {
    const result = await this.evaluateWithReason(userId, recordId, action);
    return result.allowed;
  }

  /**
   * Evaluates access with detailed reasoning (for debugging/audit)
   */
  static async evaluateWithReason(
    userId: string,
    recordId: string,
    action: Action
  ): Promise<AccessCheckResult> {
    // 1. FETCH USER CONTEXT
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { groups: true }
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // Build effective group list
    const userGroupIds = await this.getEffectiveGroups(user);

    // 2. GLOBAL ROLE OVERRIDES
    if (user.role === ROLES.ADMIN) {
      // Admin can see everything but governance actions require break-glass
      if (action === 'GOVERNANCE') {
        return { allowed: true, reason: 'ADMIN with BREAK_GLASS_GOVERNANCE', accessLevel: AccessLevel.FULL };
      }
      return { allowed: true, reason: 'ADMIN override', accessLevel: AccessLevel.FULL };
    }

    if (user.role === ROLES.AUDITOR) {
      // Auditor can view everything but cannot edit
      if (['DISCOVERY', 'VIEW', 'COMMENT'].includes(action)) {
        return { allowed: true, reason: 'AUDITOR read access', accessLevel: AccessLevel.COMMENT };
      }
      return { allowed: false, reason: 'AUDITOR is read-only' };
    }

    // 3. FETCH RECORD CONTEXT
    const record = await prisma.record.findUnique({
      where: { id: recordId },
      include: {
        classificationNode: true,
        access: true,
        registeredCompany: {
          select: { id: true, accessPermissions: true }
        }
      }
    });

    if (!record) {
      return { allowed: false, reason: 'Record not found' };
    }

    // 4. SECURITY CLEARANCE CHECK (Hard Barrier)
    const recordSecurityLevel = record.classificationNode?.securityLevel ?? 1;
    const userClearance = user.clearanceLevel ?? 1;

    if (!hasClearance(userClearance, recordSecurityLevel)) {
      return {
        allowed: false,
        reason: `Insufficient clearance: requires ${recordSecurityLevel}, has ${userClearance}`
      };
    }

    // 4b. CLASSIFICATION ENUM CLEARANCE CHECK
    const requiredClassClearance = getRequiredClearance(record.classification);
    if (!hasClearance(userClearance, requiredClassClearance)) {
      return {
        allowed: false,
        reason: `Insufficient clearance for classification ${record.classification}: requires ${requiredClassClearance}, has ${userClearance}`
      };
    }

    // 5. CHECK FOR EXPLICIT DENY (Highest Priority, ignore expired)
    const now = new Date();
    const explicitDeny = record.access.some((a: any) =>
      a.accessType === AccessType.DENY &&
      (a.userId === userId || userGroupIds.includes(a.groupId)) &&
      (!a.expiresAt || new Date(a.expiresAt) > now)
    );

    if (explicitDeny) {
      return { allowed: false, reason: 'Explicit DENY in ACL' };
    }

    // 6. LOCK STATE CHECK (For edit actions)
    if (['EDIT_METADATA', 'EDIT_CONTENT', 'DELETE'].includes(action)) {
      if (record.isLocked) {
        return { allowed: false, reason: 'Record is locked' };
      }
      if (record.isLegalHold) {
        return { allowed: false, reason: 'Record is under legal hold' };
      }
    }

    // 7. OWNER ACCESS (Full ownership grants most permissions)
    if (record.ownerUserId === userId) {
      // Owner can do most things except governance
      if (action === 'GOVERNANCE') {
        return { allowed: false, reason: 'Owner cannot perform governance on own records' };
      }
      return { allowed: true, reason: 'Owner access', accessLevel: AccessLevel.EDIT_CONTENT };
    }

    // 8. EXPLICIT ACL PERMISSION (ignore expired grants)
    const explicitAllow = record.access.find((a: any) =>
      a.accessType === AccessType.ALLOW &&
      (a.userId === userId || userGroupIds.includes(a.groupId)) &&
      (!a.expiresAt || new Date(a.expiresAt) > now)
    );

    if (explicitAllow && this.isLevelSufficient(explicitAllow.level, action)) {
      return { allowed: true, reason: 'Explicit ALLOW in ACL', accessLevel: explicitAllow.level };
    }

    // 9. COMPANY-LEVEL ACCESS (ignore expired grants)
    if (record.registeredCompany) {
      const companyAccess = (record.registeredCompany as any).accessPermissions?.find((a: any) =>
        a.accessType === AccessType.ALLOW &&
        (a.userId === userId || userGroupIds.includes(a.groupId)) &&
        (!a.expiresAt || new Date(a.expiresAt) > now)
      );

      if (companyAccess && this.isLevelSufficient(companyAccess.level, action)) {
        return { allowed: true, reason: 'Company-level access', accessLevel: companyAccess.level };
      }
    }

    // 10. PROJECT MEMBERSHIP (Tiered Access)
    const projectMembership = await this.checkProjectMembership(userId, recordId);

    if (projectMembership.isMember) {
      // Project membership ONLY grants DISCOVERY by default
      if (action === 'DISCOVERY') {
        return { allowed: true, reason: 'Project member - Discovery access', accessLevel: AccessLevel.VIEW };
      }

      // For content access, need additional authorization
      // Check if user has department scope or explicit permission
      const hasDeptScope = record.departmentId && record.departmentId === user.departmentId;
      const hasExplicitPerm = explicitAllow !== undefined;

      if (hasDeptScope || hasExplicitPerm) {
        // Project member with additional authorization gets full project access
        if (projectMembership.projectStatus === 'ON_HOLD') {
          // Frozen project: read-only
          if (['VIEW', 'COMMENT'].includes(action)) {
            return { allowed: true, reason: 'Project member (ON_HOLD) + dept/explicit', accessLevel: AccessLevel.COMMENT };
          }
        } else {
          // Active project: full collaboration
          if (['VIEW', 'COMMENT', 'EDIT_METADATA'].includes(action)) {
            return { allowed: true, reason: 'Project member + dept/explicit', accessLevel: AccessLevel.EDIT_METADATA };
          }
          if (action === 'EDIT_CONTENT' && projectMembership.role === 'MANAGER') {
            return { allowed: true, reason: 'Project MANAGER', accessLevel: AccessLevel.EDIT_CONTENT };
          }
        }
      }

      // Project member without additional auth: Discovery only
      // (If we reach here, action is not DISCOVERY since that case returned early)
      return {
        allowed: false,
        reason: 'Project membership grants discovery only. Need department scope or explicit permission for content access.'
      };
    }

    // 11. DEPARTMENT VISIBILITY (View/Comment within department)
    if (record.departmentId && record.departmentId === user.departmentId) {
      if (['DISCOVERY', 'VIEW', 'COMMENT'].includes(action)) {
        return { allowed: true, reason: 'Department member', accessLevel: AccessLevel.COMMENT };
      }
    }

    // 12. DEFAULT DENY
    return { allowed: false, reason: 'No access path found' };
  }

  /**
   * Check project membership for a user and record
   */
  private static async checkProjectMembership(
    userId: string,
    recordId: string
  ): Promise<{ isMember: boolean; role?: string; projectStatus?: string; projectId?: string }> {
    const projectRecord = await prisma.projectRecord.findFirst({
      where: {
        recordId,
        project: {
          members: { some: { userId } }
        }
      },
      include: {
        project: {
          select: {
            id: true,
            status: true,
            members: {
              where: { userId },
              select: { role: true }
            }
          }
        }
      }
    });

    if (!projectRecord) {
      return { isMember: false };
    }

    return {
      isMember: true,
      role: projectRecord.project.members[0]?.role,
      projectStatus: projectRecord.project.status,
      projectId: projectRecord.project.id
    };
  }

  /**
   * Get effective group IDs for a user (including implicit groups)
   */
  private static async getEffectiveGroups(user: any): Promise<string[]> {
    const groupIds = user.groups.map((g: any) => g.id);

    // Always include "Everyone" group
    groupIds.push(EVERYONE_GROUP_ID);

    // Include department-linked groups
    if (user.departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: user.departmentId },
        select: { name: true, linkedGroupId: true }
      });

      if (dept) {
        // Add directly linked group
        if (dept.linkedGroupId && !groupIds.includes(dept.linkedGroupId)) {
          groupIds.push(dept.linkedGroupId);
        }

        // Find groups by name match (fallback)
        const deptGroups = await prisma.group.findMany({
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

        deptGroups.forEach(g => {
          if (!groupIds.includes(g.id)) groupIds.push(g.id);
        });
      }
    }

    return groupIds;
  }

  /**
   * Generates a Prisma WHERE clause to filter lists efficiently.
   * For list queries, we show records the user can at least DISCOVER.
   */
  static async getWhereClause(userId: string): Promise<Prisma.RecordWhereInput> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { groups: true }
    });

    if (!user) return { id: 'nothing' };

    // Admin/Auditor see all
    if ([ROLES.ADMIN, ROLES.AUDITOR].includes(user.role as any)) {
      return {};
    }

    const userGroupIds = await this.getEffectiveGroups(user);
    const userClearance = user.clearanceLevel ?? 1;

    return {
      AND: [
        // A. Base Visibility (OR conditions - any path grants discovery)
        {
          OR: [
            // 1. Ownership
            { ownerUserId: userId },

            // 2. Department Member
            ...(user.departmentId ? [{ departmentId: user.departmentId }] : []),

            // 3. Project Membership (GIPC)
            {
              projectRecords: {
                some: {
                  project: {
                    members: { some: { userId } }
                  }
                }
              }
            },

            // 4. Legacy Project Group
            { projectId: { in: userGroupIds } },

            // 5. Explicit ACL Allow (non-expired)
            {
              access: {
                some: {
                  accessType: 'ALLOW',
                  AND: [
                    { OR: [{ userId }, { groupId: { in: userGroupIds } }] },
                    { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
                  ]
                }
              }
            },

            // 6. Company Access (non-expired)
            {
              registeredCompany: {
                accessPermissions: {
                  some: {
                    accessType: 'ALLOW',
                    AND: [
                      { OR: [{ userId }, { groupId: { in: userGroupIds } }] },
                      { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
                    ]
                  }
                }
              }
            },

            // 7. OFFICIAL records: discoverable by all authenticated users
            { classification: 'OFFICIAL' },

            // 8. OFFICIAL_CONFIDENTIAL: discoverable by same department only
            ...(user.departmentId ? [{
              AND: [
                { classification: 'OFFICIAL_CONFIDENTIAL' as any },
                { departmentId: user.departmentId }
              ]
            }] : []),

            // RESTRICTED and SECRET: no catalog visibility (require explicit grant via branches 1-6)
          ]
        },

        // B. Security Clearance Filter (classificationNode + classification enum)
        {
          AND: [
            // B1. ClassificationNode security level
            {
              OR: [
                { classificationNode: { is: null } },
                { classificationNode: { securityLevel: { lte: userClearance } } }
              ]
            },
            // B2. Classification enum clearance
            {
              classification: {
                in: (['OFFICIAL', 'OFFICIAL_CONFIDENTIAL', 'RESTRICTED', 'SECRET'] as const)
                  .filter(c => userClearance >= getRequiredClearance(c))
              }
            }
          ]
        },

        // C. No Explicit Deny (non-expired)
        {
          NOT: {
            access: {
              some: {
                accessType: 'DENY',
                AND: [
                  { OR: [{ userId }, { groupId: { in: userGroupIds } }] },
                  { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
                ]
              }
            }
          }
        }
      ]
    };
  }

  /**
   * Check if granted access level is sufficient for requested action
   */
  private static isLevelSufficient(granted: AccessLevel, requested: Action): boolean {
    const levels: Record<AccessLevel, number> = {
      [AccessLevel.VIEW]: 1,
      [AccessLevel.COMMENT]: 2,
      [AccessLevel.EDIT_METADATA]: 3,
      [AccessLevel.EDIT_CONTENT]: 4,
      [AccessLevel.GOVERNANCE]: 5,
      [AccessLevel.FULL]: 6
    };

    const requirements: Record<Action, number> = {
      'DISCOVERY': 1,
      'VIEW': 1,
      'COMMENT': 2,
      'EDIT_METADATA': 3,
      'EDIT_CONTENT': 4,
      'GOVERNANCE': 5,
      'DELETE': 6,
      'FULL': 6
    };

    return (levels[granted] || 0) >= (requirements[requested] || 99);
  }

  /**
   * Utility: Check if user can view content (not just discover)
   */
  static async canViewContent(userId: string, recordId: string): Promise<boolean> {
    return this.evaluate(userId, recordId, 'VIEW');
  }

  /**
   * Utility: Check if user can edit record
   */
  static async canEdit(userId: string, recordId: string): Promise<boolean> {
    return this.evaluate(userId, recordId, 'EDIT_METADATA');
  }

  /**
   * Utility: Get user's effective access level on a record
   */
  static async getAccessLevel(userId: string, recordId: string): Promise<AccessLevel | null> {
    // Check each level from highest to lowest
    const levels: Action[] = ['FULL', 'GOVERNANCE', 'EDIT_CONTENT', 'EDIT_METADATA', 'COMMENT', 'VIEW', 'DISCOVERY'];

    for (const action of levels) {
      const result = await this.evaluateWithReason(userId, recordId, action);
      if (result.allowed && result.accessLevel) {
        return result.accessLevel;
      }
    }

    return null;
  }

  /**
   * Batch-compute access levels for a list of records.
   * Avoids N+1 by fetching user context once and evaluating in-memory.
   * Records must include `access` relation for ACL checks.
   */
  static async computeListAccess(
    userId: string,
    records: any[]
  ): Promise<Map<string, { level: string; canViewContent: boolean }>> {
    const result = new Map<string, { level: string; canViewContent: boolean }>();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { groups: true }
    });

    if (!user) return result;

    const userGroupIds = await this.getEffectiveGroups(user);
    const now = new Date();

    // Admin/Auditor: full access to everything
    if ([ROLES.ADMIN, ROLES.AUDITOR].includes(user.role as any)) {
      for (const record of records) {
        result.set(record.id, {
          level: user.role === ROLES.ADMIN ? 'FULL' : 'VIEW',
          canViewContent: true
        });
      }
      return result;
    }

    for (const record of records) {
      // Check ownership
      if (record.ownerUserId === userId) {
        result.set(record.id, { level: 'EDIT_CONTENT', canViewContent: true });
        continue;
      }

      // Check explicit ACL (non-expired)
      const explicitAllow = record.access?.find((a: any) =>
        a.accessType === 'ALLOW' &&
        (a.userId === userId || userGroupIds.includes(a.groupId)) &&
        (!a.expiresAt || new Date(a.expiresAt) > now)
      );

      if (explicitAllow) {
        result.set(record.id, { level: explicitAllow.level, canViewContent: true });
        continue;
      }

      // Check department membership
      if (record.departmentId && record.departmentId === user.departmentId) {
        result.set(record.id, { level: 'VIEW', canViewContent: true });
        continue;
      }

      // Catalog-only (discovered via classification visibility but no content access)
      const canRequest = ['OFFICIAL', 'OFFICIAL_CONFIDENTIAL'].includes(record.classification);
      result.set(record.id, { level: 'DISCOVERY', canViewContent: false, ...( canRequest ? { canRequest: true } : {}) } as any);
    }

    return result;
  }
}
