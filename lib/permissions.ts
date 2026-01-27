/**
 * ARCHITECTURE STABILIZED: FROZEN CONTRACT
 * 
 * This file defines the Non-Negotiable RBAC (Role-Based Access Control) Model.
 * Modifications require formal architecture review.
 * 
 * - Roles are canonical.
 * - Permissions are granular definitions of capability.
 * - The Matrix is the single source of truth.
 */
export const ROLES = {
  USER: 'USER',
  CONTRIBUTOR: 'CONTRIBUTOR',
  APPROVER: 'APPROVER',
  RECORDS_OFFICER: 'RECORDS_OFFICER',
  ADMIN: 'ADMIN',
  AUDITOR: 'AUDITOR'
} as const;

export const EVERYONE_GROUP_ID = '00000000-0000-0000-0000-000000000000'; // Special Group ID for "Organization-wide" access

export type Role = keyof typeof ROLES;

export const PERMISSIONS = {
  // --- CONTENT ACTIONS (Owner / Contributor) ---
  WORKSPACE_UPLOAD: 'WORKSPACE_UPLOAD',
  WORKSPACE_EDIT_DRAFT: 'WORKSPACE_EDIT_DRAFT',
  WORKSPACE_DELETE_DRAFT: 'WORKSPACE_DELETE_DRAFT',
  SUBMIT_RECORD: 'SUBMIT_RECORD',
  EDIT_METADATA: 'EDIT_METADATA', // Allowed while DRAFT

  // --- GOVERNANCE ACTIONS (Records Manager) ---
  VERIFY_SUBMISSION: 'VERIFY_SUBMISSION', // Approve/Reject
  VIEW_ALL_RECORDS: 'VIEW_ALL_RECORDS',
  
  // Governance Overrides (Requires Reason)
  OVERRIDE_CLASSIFICATION: 'OVERRIDE_CLASSIFICATION',
  CHANGE_STATUS: 'CHANGE_STATUS',
  LOCK_RECORD: 'LOCK_RECORD',
  UNLOCK_RECORD: 'UNLOCK_RECORD',
  ARCHIVE_RECORD: 'ARCHIVE_RECORD',
  RESTORE_RECORD: 'RESTORE_RECORD',
  ASSIGN_OWNER: 'ASSIGN_OWNER',
  
  // Retention
  MANAGE_RETENTION: 'MANAGE_RETENTION',
  MANAGE_LEGAL_HOLDS: 'MANAGE_LEGAL_HOLDS',
  EXECUTE_DISPOSAL: 'EXECUTE_DISPOSAL',

  // --- SYSTEM ACTIONS (Admin) ---
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  MANAGE_SYSTEM_SETTINGS: 'MANAGE_SYSTEM_SETTINGS',
  AUDIT_FULL_ACCESS: 'AUDIT_FULL_ACCESS',
  HARD_DELETE_RECORD: 'HARD_DELETE_RECORD' // Emergency only
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ROLE_CAPABILITIES: Record<Role, Permission[]> = {
  USER: [
    'WORKSPACE_UPLOAD',
    'WORKSPACE_EDIT_DRAFT',
    'WORKSPACE_DELETE_DRAFT'
  ],

  CONTRIBUTOR: [
    'WORKSPACE_UPLOAD',
    'WORKSPACE_EDIT_DRAFT',
    'WORKSPACE_DELETE_DRAFT',
    'SUBMIT_RECORD',
    'EDIT_METADATA'
  ],

  APPROVER: [
    'VERIFY_SUBMISSION', // Can approve for their department
    'VIEW_ALL_RECORDS'   // Within scope
  ],

  RECORDS_OFFICER: [
    'VERIFY_SUBMISSION',
    'VIEW_ALL_RECORDS',
    'OVERRIDE_CLASSIFICATION',
    'CHANGE_STATUS',
    'LOCK_RECORD',
    'UNLOCK_RECORD',
    'ARCHIVE_RECORD',
    'RESTORE_RECORD',
    'ASSIGN_OWNER',
    'MANAGE_RETENTION',
    'MANAGE_LEGAL_HOLDS',
    'EXECUTE_DISPOSAL'
    // RECORDS_MANAGER does NOT have SYSTEM actions like MANAGE_USERS
  ],

  ADMIN: [
    'MANAGE_USERS',
    'MANAGE_ROLES',
    'MANAGE_SYSTEM_SETTINGS',
    'AUDIT_FULL_ACCESS',
    'HARD_DELETE_RECORD',
    // Admin also inherits Governance for emergency, or do we separate? 
    // "System Actions (Admin)" vs Governance.
    // Usually Admin needs everything to fix things.
    'OVERRIDE_CLASSIFICATION',
    'CHANGE_STATUS',
    'LOCK_RECORD',
    'UNLOCK_RECORD',
    'ARCHIVE_RECORD',
    'RESTORE_RECORD',
    'ASSIGN_OWNER',
    'VERIFY_SUBMISSION',
    'VIEW_ALL_RECORDS'
  ],

  AUDITOR: [
    'VIEW_ALL_RECORDS',
    'AUDIT_FULL_ACCESS'
  ]
};

// Legacy Role Mapping
export function mapLegacyRole(roleName: string): Role {
  const r = (roleName || 'USER').toUpperCase();
  
  if (r === 'STAFF') return 'CONTRIBUTOR';
  if (r === 'DEPT_HEAD') return 'APPROVER';
  if (r === 'RECORDS_MANAGER') return 'RECORDS_OFFICER';
  
  // Check if it's already a valid role
  if (r in ROLES) return r as Role;
  
  return 'USER'; // Default fallback
}


export function hasPermission(
  rawRole: string,
  permission: Permission
): boolean {
  const role = mapLegacyRole(rawRole);
  return ROLE_CAPABILITIES[role]?.includes(permission) ?? false;
}

export function assertPermission(rawRole: string, permission: Permission): void {
    if (!hasPermission(rawRole, permission)) {
        throw new Error(`Access Denied: Role '${rawRole}' lacks permission '${permission}'`);
    }
}
