
import { User, Record, Department } from '@prisma/client';
import { ROLES } from './permissions';

export type Action = 'VIEW' | 'EDIT' | 'DELETE' | 'DOWNLOAD';

/**
 * ABAC Policy Engine
 * Instead of just "Can Manager View Records?", we ask:
 * "Can THIS User view THIS Record?" based on attributes.
 */

// Attributes we might check
interface UserAttributes {
  id: string;
  role: string;
  departmentId: string | null;
  clearanceLevel?: number; // Future: 1=Public, 2=Internal, 3=Confidential
}

interface RecordAttributes {
  id: string;
  status: string;
  departmentId: string | null;
  visibilty?: string; // e.g. 'PUBLIC', 'DEPARTMENT', 'CONFIDENTIAL'
  ownerUserId: string | null;
}

/**
 * Main ABAC Check Function
 */
export function checkAttributeAccess(
  user: UserAttributes,
  record: RecordAttributes,
  action: Action
): boolean {
  // 1. Super Admin Bypass (Optional, but often practical)
  if (user.role === ROLES.ADMIN) return true;

  // 2. Owner Access (Usually full access to own drafts)
  const isOwner = user.id === record.ownerUserId;
  if (isOwner) return true;

  // 3. Department Scoping
  // If record is scoped to Department, User must be in same Department
  // Assuming default is strict if not specified.
  if (record.departmentId) {
      // If user has no department, they can't see department-scoped records (unless Admin)
      if (!user.departmentId) return false;
      
      // Must match
      if (user.departmentId !== record.departmentId) {
          // Exception: Auditors might see all?
          if (user.role === ROLES.AUDITOR) return true; 
          return false;
      }
  }

  // 4. Confidentiality / Clearance (Future scalability)
  // if (record.confidentiality > user.clearance) return false;

  // 5. Default Deny or Allow?
  // If we passed specific blocks, and it's public/open, allow?
  // Real ABAC usually requires an explicit "Allow" rule to fire.
  
  // For ERM, if they are in the same department, they generally have VIEW access.
  if (action === 'VIEW') return true;

  return false;
}

/**
 * Helper to throw error if access denied
 */
export function assertAttributeAccess(
    user: User, 
    record: Record, 
    action: Action
) {
    // Map Prisma models to attributes
    // Ensure we handle nulls safely
    const userAttr: UserAttributes = {
        id: user.id,
        role: user.role,
        departmentId: user.departmentId
    };
    
    // We might need to fetch record.departmentId if not present in passed object
    // Assuming 'record' passed here has the fields.
    const recordAttr: RecordAttributes = {
        id: record.id,
        status: record.status,
        departmentId: record.departmentId,
        ownerUserId: record.ownerUserId
    };

    if (!checkAttributeAccess(userAttr, recordAttr, action)) {
        throw new Error(`Access Denied: ABAC Policy Violation for ${action} on Record ${record.id}`);
    }
}
