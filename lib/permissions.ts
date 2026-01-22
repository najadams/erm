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
  // Workspace
  WORKSPACE_UPLOAD_DRAFT: 'WORKSPACE_UPLOAD_DRAFT',
  WORKSPACE_EDIT_OWN_DRAFT: 'WORKSPACE_EDIT_OWN_DRAFT',
  WORKSPACE_DELETE_OWN_DRAFT: 'WORKSPACE_DELETE_OWN_DRAFT',
  SUBMIT_RECORD: 'SUBMIT_RECORD',

  // Verification
  VIEW_PENDING_SUBMISSIONS: 'VIEW_PENDING_SUBMISSIONS',
  APPROVE_SUBMISSION: 'APPROVE_SUBMISSION',
  VERIFY_RECORD: 'VERIFY_RECORD',
  OVERRIDE_CLASSIFICATION: 'OVERRIDE_CLASSIFICATION',

  // Records
  VIEW_OFFICIAL_RECORDS: 'VIEW_OFFICIAL_RECORDS',
  EXPORT_RECORDS: 'EXPORT_RECORDS',

  // Retention
  APPLY_RETENTION: 'APPLY_RETENTION',
  PLACE_LEGAL_HOLD: 'PLACE_LEGAL_HOLD',
  EXECUTE_DISPOSAL: 'EXECUTE_DISPOSAL',

  // Audit
  AUDIT_VIEW_OWN: 'AUDIT_VIEW_OWN',
  AUDIT_VIEW_SCOPED: 'AUDIT_VIEW_SCOPED',
  AUDIT_VIEW_FULL: 'AUDIT_VIEW_FULL',
  AUDIT_EXPORT: 'AUDIT_EXPORT',

  // Administration
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_CLASSIFICATIONS: 'MANAGE_CLASSIFICATIONS',
  MANAGE_METADATA: 'MANAGE_METADATA'
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ROLE_CAPABILITIES: Record<Role, Permission[]> = {
  USER: [
    'WORKSPACE_UPLOAD_DRAFT',
    'WORKSPACE_EDIT_OWN_DRAFT',
    'WORKSPACE_DELETE_OWN_DRAFT',
    'AUDIT_VIEW_OWN'
  ],

  CONTRIBUTOR: [
    'WORKSPACE_UPLOAD_DRAFT',
    'WORKSPACE_EDIT_OWN_DRAFT',
    'WORKSPACE_DELETE_OWN_DRAFT',
    'SUBMIT_RECORD',
    'AUDIT_VIEW_OWN'
  ],

  APPROVER: [
    'VIEW_PENDING_SUBMISSIONS',
    'APPROVE_SUBMISSION',
    'AUDIT_VIEW_SCOPED'
  ],

  RECORDS_OFFICER: [
    'VIEW_PENDING_SUBMISSIONS',
    'VERIFY_RECORD',
    'VIEW_OFFICIAL_RECORDS',
    'APPLY_RETENTION',
    'PLACE_LEGAL_HOLD',
    'EXECUTE_DISPOSAL',
    'AUDIT_VIEW_SCOPED',
    'MANAGE_CLASSIFICATIONS',
    'MANAGE_METADATA',
    'OVERRIDE_CLASSIFICATION' // Added from matrix requirement (implied by "Override classification")
  ],

  ADMIN: [
    'AUDIT_VIEW_FULL',
    'AUDIT_EXPORT',
    'MANAGE_USERS',
    'MANAGE_METADATA',
    'AUDIT_VIEW_OWN',
    // Added for full verification access
    'VIEW_PENDING_SUBMISSIONS',
    'VERIFY_RECORD',
    'APPROVE_SUBMISSION',
    'VIEW_OFFICIAL_RECORDS',
    // Added for workspace management
    'WORKSPACE_DELETE_OWN_DRAFT',
    'WORKSPACE_EDIT_OWN_DRAFT'
  ],

  AUDITOR: [
    'AUDIT_VIEW_FULL',
    'AUDIT_EXPORT'
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
