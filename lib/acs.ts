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
import { cacheAside, CacheKeys, CacheTTL } from '@/lib/cache';
import { AccessLevel, AccessType, Prisma } from '@prisma/client';
import { ROLES, EVERYONE_GROUP_ID, hasClearance, getRequiredClearance, hasPermission, isGovernanceAction, hasGovernanceAuthority, PERMISSIONS } from '@/lib/permissions';
import { canEditInStatus } from '@/lib/lifecycle';

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

    // 3.5 SOFT DELETE CHECK
    if (record.deletedAt && action !== 'DELETE' && action !== 'GOVERNANCE') {
        // Only allow if specific RESTORE action (if we had one) or maybe Admin?
        // For now, treat as not found or denied.
        return { allowed: false, reason: 'Record is deleted' };
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
    const requiredClassClearance = getRequiredClearance(record.securityClassification);
    if (!hasClearance(userClearance, requiredClassClearance)) {
      return {
        allowed: false,
        reason: `Insufficient clearance for classification ${record.securityClassification}: requires ${requiredClassClearance}, has ${userClearance}`
      };
    }

    // 4.5 RBAC PERMISSION CHECK (Global Permissions subject to Clearance)
    // Check for VIEW_ALL_RECORDS
    if (['DISCOVERY', 'VIEW'].includes(action)) {
      if (hasPermission(user.role, 'VIEW_ALL_RECORDS')) {
        return { allowed: true, reason: 'Role has VIEW_ALL_RECORDS permission', accessLevel: AccessLevel.VIEW };
      }
      if (hasPermission(user.role, 'VIEW_DEPARTMENT_RECORDS')) {
         if (record.departmentId && record.departmentId === user.departmentId) {
             return { allowed: true, reason: 'Role has VIEW_DEPARTMENT_RECORDS permission', accessLevel: AccessLevel.VIEW };
         }
      }
    }

    // Check for GOVERNANCE Actions
    if (action === 'GOVERNANCE') {
        if (hasGovernanceAuthority(user.role)) {
            return { allowed: true, reason: 'Role has Governance Authority', accessLevel: AccessLevel.GOVERNANCE };
        }
    } else if (isGovernanceAction(action as any)) {
      // If the user's role has this specific governance permission, allow it
      // Note: We cast action to Permission because Action superset overlaps
      if (hasPermission(user.role, action as any)) {
          return { allowed: true, reason: `Role has explicit governance permission: ${action}`, accessLevel: AccessLevel.GOVERNANCE };
      }
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

    // 6. LIFECYCLE & LOCK STATE CHECK
    if (['EDIT_METADATA', 'EDIT_CONTENT', 'DELETE'].includes(action)) {
      // A. Lifecycle Check
      const editType = action === 'EDIT_CONTENT' ? 'CONTENT' : 'METADATA';
      // Note: DELETE handled separately or follows DRAFT only rule usually.
      // canEditInStatus handles DRAFT/SUBMITTED/REGISTERED/ARCHIVED
      if (action !== 'DELETE' && !canEditInStatus(record.status, editType)) {
         // Exception: Governance overriding? 
         // Records Officer might need to edit metadata of Registered records?
         // Current canEditInStatus says NO. We stick to that for "Verified = Locked" behavior.
         return { allowed: false, reason: `Cannot edit record in '${record.status}' state` };
      }

      // B. Lock Check
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

      // Check Content Access based on Project Role
      const role = projectMembership.role || 'VIEW_ONLY';
      // Note: isRecordOwner logic in Step 7 covers "Owner Access", but we need it here for Contributor check
      const isRecordOwner = record.ownerUserId === userId; 
      const hasExplicitPerm = explicitAllow !== undefined;
      // Note: Department Logic (Step 11) will catch Same-Department access later.
      // But strictly following the prompt: 
      // - Managers/ViewOnly/Owners get access via Project (Cross-Dept) if they have Clearance.
      // - Contributors DO NOT get access via Project unless Owner/Explicit.

      // Frozen project check
      if (projectMembership.projectStatus === 'ON_HOLD') {
        if (['EDIT_METADATA', 'EDIT_CONTENT'].includes(action)) {
           return { allowed: false, reason: 'Project is ON_HOLD' };
        }
      }

      switch (role) {
        case 'OWNER': // Project Owner
          // Record Discovery: YES (Handled above)
          // Record Content View: YES (if department OR clearance allows) -> Since Clearance is Step 4, we allow.
          if (['VIEW', 'COMMENT'].includes(action)) {
            return { allowed: true, reason: 'Project Owner', accessLevel: AccessLevel.COMMENT };
          }
          // Record Edit: YES (if owner) -> Assuming Record Owner
          if (['EDIT_METADATA', 'EDIT_CONTENT'].includes(action)) {
            if (isRecordOwner) {
               return { allowed: true, reason: 'Project Owner + Record Owner', accessLevel: AccessLevel.EDIT_CONTENT };
            }
             // Fallback: If they are not record owner, they don't get edit rights via Project Role 'OWNER' per spec.
             // However, Managers get edit rights on unlocked content. 
             // If Project Owner implies Manager rights, we should allow. 
             // Strictly following spec: "Record Edit: YES (if owner)". 
             // We will DENY here (fall through) if not owner.
          }
          break;

        case 'MANAGER':
          // Record Discovery: YES
          // Record Content View: YES (if department OR clearance allows)
          if (['VIEW', 'COMMENT'].includes(action)) {
            return { allowed: true, reason: 'Project Manager', accessLevel: AccessLevel.COMMENT };
          }
          // Record Edit: YES (if content not locked)
          if (['EDIT_METADATA', 'EDIT_CONTENT'].includes(action)) {
             if (!record.isLocked) {
                return { allowed: true, reason: 'Project Manager (Unlocked)', accessLevel: AccessLevel.EDIT_CONTENT };
             } else {
                return { allowed: false, reason: 'Record is Locked' };
             }
          }
          break;

        case 'CONTRIBUTOR':
          // Record Discovery: YES
          // Record Content View: YES (if owner OR explicit ACL)
          if (['VIEW', 'COMMENT'].includes(action)) {
             if (isRecordOwner || hasExplicitPerm) {
                return { allowed: true, reason: 'Project Contributor (Owner/Explicit)', accessLevel: explicitAllow?.level || AccessLevel.COMMENT };
             }
             // IMPORTANT: We do NOT return allowed=true here for generic Contributors.
             // This means Cross-Department Contributors CANNOT view.
             // Same-Department Contributors will be saved by Step 11.
          }
          // Record Edit: YES (if owner AND draft)
          if (['EDIT_METADATA', 'EDIT_CONTENT'].includes(action)) {
             if (isRecordOwner && record.status === 'DRAFT') {
                return { allowed: true, reason: 'Project Contributor (Owner + Draft)', accessLevel: AccessLevel.EDIT_CONTENT };
             }
          }
          break;

        case 'VIEW_ONLY':
          // Record Discovery: YES
          // Record Content View: YES (if department OR clearance allows)
          if (['VIEW', 'COMMENT'].includes(action)) {
             return { allowed: true, reason: 'Project View Only', accessLevel: AccessLevel.COMMENT }; // ViewOnly can Comment? "Access: YES". Usually View.
          }
          // Record Edit: NO
          if (['EDIT_METADATA', 'EDIT_CONTENT'].includes(action)) {
             return { allowed: false, reason: 'View Only Role' };
          }
          break;
      }
      
      // If we haven't returned, proceed to next steps (e.g. Dept check)
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
          OR: [
            { members: { some: { userId } } },
            { ownerUserId: userId }
          ]
        }
      },
      include: {
        project: {
          select: {
            id: true,
            status: true,
            ownerUserId: true,
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

    let role = 'VIEW_ONLY';
    if (projectRecord.project.ownerUserId === userId) {
      role = 'OWNER';
    } else if (projectRecord.project.members[0]) {
      role = projectRecord.project.members[0].role;
    }

    return {
      isMember: true,
      role: role,
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
   * Tries materialized cache (UserVisibleRecords) first, then falls back
   * to the full computation with Redis caching.
   */
  static async getWhereClause(userId: string): Promise<Prisma.RecordWhereInput> {
    // Try materialized cache first (fastest path)
    try {
      const { getVisibleRecordIds } = await import('@/lib/access-cache');
      const cachedIds = await getVisibleRecordIds(userId);
      if (cachedIds && cachedIds.length > 0) {
        return { id: { in: cachedIds }, deletedAt: null };
      }
    } catch (e) {
      // access-cache unavailable or error — fall through to raw computation
    }

    // Fall back to full computation (with Redis caching)
    const result = await cacheAside(CacheKeys.acs(userId), CacheTTL.ACS, async () => {
      return this.getWhereClauseRaw(userId);
    });

    // Fire-and-forget: populate UVR table for next time (non-blocking)
    setImmediate(async () => {
      try {
        const { rebuildForUser } = await import('@/lib/access-cache');
        await rebuildForUser(userId);
      } catch (e) {
        // Silently ignore — this is best-effort warming
      }
    });

    return result;
  }

  /**
   * Raw (uncached) WHERE clause computation.
   * Used by access-cache.ts to rebuild the materialized cache.
   * Also used as fallback when no cache is available.
   */
  static async getWhereClauseRaw(userId: string): Promise<Prisma.RecordWhereInput> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { groups: true }
    });

    if (!user) return { id: 'nothing' };

    // Admin/Auditor see all (but filter deleted by default to keep lists clean)
    if ([ROLES.ADMIN, ROLES.AUDITOR].includes(user.role as any)) {
      return { deletedAt: null };
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
            { securityClassification: 'OFFICIAL' },

            // 8. OFFICIAL_CONFIDENTIAL: discoverable by same department only
            ...(user.departmentId ? [{
              AND: [
                { securityClassification: 'OFFICIAL_CONFIDENTIAL' as any },
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
            // B2. SecurityClassification enum clearance
            {
              securityClassification: {
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
        },
        // D. Soft Delete Filter
        { deletedAt: null }
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
    // Optimized: at most 2 calls instead of 7
    // Try highest tier first (covers EDIT_CONTENT/GOVERNANCE/FULL paths)
    const editResult = await this.evaluateWithReason(userId, recordId, 'EDIT_CONTENT');
    if (editResult.allowed && editResult.accessLevel) {
      return editResult.accessLevel;
    }

    // Try read tier (covers VIEW/COMMENT/DISCOVERY paths)
    const viewResult = await this.evaluateWithReason(userId, recordId, 'VIEW');
    if (viewResult.allowed && viewResult.accessLevel) {
      return viewResult.accessLevel;
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

    if (records.length === 0) return result;

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

    // Pre-fetch project memberships for all records in one query
    const recordIds = records.map(r => r.id);
    const projectRecords = await prisma.projectRecord.findMany({
      where: {
        recordId: { in: recordIds },
        project: {
          OR: [
            { members: { some: { userId } } },
            { ownerUserId: userId }
          ]
        }
      },
      select: {
        recordId: true,
        project: {
          select: {
            id: true,
            status: true,
            ownerUserId: true,
            members: {
              where: { userId },
              select: { role: true }
            }
          }
        }
      }
    });

    // Build recordId -> project membership lookup
    const projectMembershipMap = new Map<string, { role: string; projectStatus: string }>();
    for (const pr of projectRecords) {
      let role = 'VIEW_ONLY';
      if (pr.project.ownerUserId === userId) {
        role = 'OWNER';
      } else if (pr.project.members[0]) {
        role = pr.project.members[0].role;
      }
      projectMembershipMap.set(pr.recordId, { role, projectStatus: pr.project.status });
    }

    // Pre-fetch company-level access grants for all relevant companies
    const companyIds = [...new Set(records.map(r => r.registeredCompanyId).filter(Boolean))];
    const companyAccessMap = new Map<string, string>(); // companyId -> accessLevel

    if (companyIds.length > 0) {
      const companyGrants = await prisma.companyAccess.findMany({
        where: {
          registeredCompanyId: { in: companyIds },
          accessType: 'ALLOW',
          AND: [
            { OR: [{ userId }, { groupId: { in: userGroupIds } }] },
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
          ]
        },
        select: { registeredCompanyId: true, level: true }
      });

      for (const grant of companyGrants) {
        const existing = companyAccessMap.get(grant.registeredCompanyId);
        if (!existing || this.levelToNumber(grant.level) > this.levelToNumber(existing)) {
          companyAccessMap.set(grant.registeredCompanyId, grant.level);
        }
      }
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

      // Check project membership
      const membership = projectMembershipMap.get(record.id);
      if (membership) {
        const { role, projectStatus } = membership;
        if (['OWNER', 'MANAGER', 'VIEW_ONLY'].includes(role)) {
          result.set(record.id, { level: role === 'MANAGER' ? 'EDIT_CONTENT' : 'VIEW', canViewContent: true });
          continue;
        }
        if (role === 'CONTRIBUTOR') {
          // Contributors get DISCOVERY only (need explicit ACL or department for content)
          result.set(record.id, { level: 'DISCOVERY', canViewContent: false });
          continue;
        }
      }

      // Check company-level access
      if (record.registeredCompanyId) {
        const companyLevel = companyAccessMap.get(record.registeredCompanyId);
        if (companyLevel) {
          result.set(record.id, { level: companyLevel, canViewContent: true });
          continue;
        }
      }

      // Catalog-only (discovered via classification visibility but no content access)
      const canRequest = ['OFFICIAL', 'OFFICIAL_CONFIDENTIAL'].includes(record.securityClassification);
      result.set(record.id, { level: 'DISCOVERY', canViewContent: false, ...(canRequest ? { canRequest: true } : {}) } as any);
    }

    return result;
  }

  /**
   * Convert access level string to numeric value for comparison
   */
  private static levelToNumber(level: string): number {
    const levels: Record<string, number> = {
      'VIEW': 1, 'COMMENT': 2, 'EDIT_METADATA': 3,
      'EDIT_CONTENT': 4, 'GOVERNANCE': 5, 'FULL': 6
    };
    return levels[level] || 0;
  }
}
