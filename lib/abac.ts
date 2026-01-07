
import { User, Record, Department } from '@prisma/client';
import { ROLES } from './permissions';

export type Action = 'VIEW' | 'EDIT' | 'DELETE' | 'DOWNLOAD';

/**
 * ABAC Policy Engine
 * Instead of just "Can Manager View Records?", we ask:
 * "Can THIS User view THIS Record?" based on attributes.
 */

// Attributes we might check
// Attributes we might check
interface UserAttributes {
  id: string;
  role: string;
  departmentId: string | null;
  clearanceLevel: number; // 1=Public, 5=Top Secret
}

interface RecordAttributes {
  id: string;
  status: string;
  departmentId: string | null;
  securityLevel: number; // 1=Public, 5=Top Secret
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
  // 1. Super Admin Bypass
  if (user.role === ROLES.ADMIN) return true;

  // 2. Owner Access (Usually full access to own drafts)
  const isOwner = user.id === record.ownerUserId;
  if (isOwner) return true;

  // 3. Security Clearance Check (Global)
  if (user.clearanceLevel < record.securityLevel) {
      return false; // Instant denial if clearance is insufficient
  }

  // 4. Department Scoping
  // If record is scoped to Department, User must be in same Department
  if (record.departmentId) {
      if (!user.departmentId) return false;
      
      if (user.departmentId !== record.departmentId) {
          // Exception: Auditors might see all?
          if (user.role === ROLES.AUDITOR) return true; 
          return false;
      }
  }

  // 5. Default Allow for VIEW if passed checks
  if (action === 'VIEW') return true;

  return false;
}

/**
 * Helper to throw error if access denied
 */
export function assertAttributeAccess(
    user: User, 
    record: Record & { classificationNode?: { securityLevel: number } | null }, 
    action: Action
) {
    // Map Prisma models to attributes
    const userAttr: UserAttributes = {
        id: user.id,
        role: user.role,
        departmentId: user.departmentId,
        clearanceLevel: user.clearanceLevel ?? 1
    };
    
    // Resolve security level safely
    // If record has no classification, default to 1 (Public)
    const securityLevel = record.classificationNode?.securityLevel ?? 1;

    const recordAttr: RecordAttributes = {
        id: record.id,
        status: record.status,
        departmentId: record.departmentId,
        securityLevel: securityLevel,
        ownerUserId: record.ownerUserId
    };

    if (!checkAttributeAccess(userAttr, recordAttr, action)) {
        throw new Error(`Access Denied: ABAC Policy Violation for ${action} on Record ${record.id}`);
    }
}
