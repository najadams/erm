/**
 * ARCHITECTURE STABILIZED: FROZEN CONTRACT
 *
 * This file defines the Non-Negotiable RBAC (Role-Based Access Control) Model.
 * Modifications require formal architecture review.
 *
 * Three-Layer Permission Model:
 * 1. CONTENT_ACTIONS - Document creation and editing (Contributors)
 * 2. GOVERNANCE_ACTIONS - Legal authority over records (Records Officer)
 * 3. SYSTEM_ACTIONS - Technical administration (Admin)
 *
 * Principle: Roles should not cross layers without explicit break-glass logging.
 */

// =============================================================================
// ROLES
// =============================================================================

export const ROLES = {
  EXTERNAL_USER: 'EXTERNAL_USER', // Submit only, no browsing
  USER: 'USER',                   // Basic workspace access
  CONTRIBUTOR: 'CONTRIBUTOR',     // Content creation
  APPROVER: 'APPROVER',           // Department-level verification
  RECORDS_OFFICER: 'RECORDS_OFFICER', // Organization-wide governance
  ADMIN: 'ADMIN',                 // System administration (technical only)
  AUDITOR: 'AUDITOR'              // Read-only compliance oversight
} as const;

export const EVERYONE_GROUP_ID = '00000000-0000-0000-0000-000000000000';

export type Role = keyof typeof ROLES;

// =============================================================================
// PERMISSIONS - Three Layer Model
// =============================================================================

export const PERMISSIONS = {
  // ---------------------------------------------------------------------------
  // LAYER 1: CONTENT ACTIONS (Owner / Contributor)
  // Actions related to creating and editing document content
  // ---------------------------------------------------------------------------
  WORKSPACE_UPLOAD: 'WORKSPACE_UPLOAD',
  WORKSPACE_EDIT_DRAFT: 'WORKSPACE_EDIT_DRAFT',
  WORKSPACE_DELETE_DRAFT: 'WORKSPACE_DELETE_DRAFT',
  SUBMIT_RECORD: 'SUBMIT_RECORD',
  EDIT_METADATA: 'EDIT_METADATA',
  VIEW_OWN_RECORDS: 'VIEW_OWN_RECORDS',

  // ---------------------------------------------------------------------------
  // LAYER 2: GOVERNANCE ACTIONS (Records Officer)
  // Legal authority over record lifecycle, classification, and compliance
  // These powers should NOT be held by technical administrators
  // ---------------------------------------------------------------------------

  // Verification & Approval
  VERIFY_SUBMISSION: 'VERIFY_SUBMISSION',
  REJECT_SUBMISSION: 'REJECT_SUBMISSION',

  // Visibility & Access
  VIEW_ALL_RECORDS: 'VIEW_ALL_RECORDS',
  VIEW_DEPARTMENT_RECORDS: 'VIEW_DEPARTMENT_RECORDS',

  // Lifecycle Control
  REGISTER_RECORD: 'REGISTER_RECORD',      // SUBMITTED -> REGISTERED
  LOCK_RECORD: 'LOCK_RECORD',              // Set isLocked = true
  UNLOCK_RECORD: 'UNLOCK_RECORD',          // Set isLocked = false
  ARCHIVE_RECORD: 'ARCHIVE_RECORD',        // -> ARCHIVED
  RESTORE_RECORD: 'RESTORE_RECORD',        // ARCHIVED -> REGISTERED

  // Classification & Metadata Override
  OVERRIDE_CLASSIFICATION: 'OVERRIDE_CLASSIFICATION',
  OVERRIDE_SECURITY_LEVEL: 'OVERRIDE_SECURITY_LEVEL',
  CHANGE_STATUS: 'CHANGE_STATUS',
  ASSIGN_OWNER: 'ASSIGN_OWNER',

  // Retention & Legal
  MANAGE_RETENTION: 'MANAGE_RETENTION',
  MANAGE_LEGAL_HOLDS: 'MANAGE_LEGAL_HOLDS',
  APPLY_LEGAL_HOLD: 'APPLY_LEGAL_HOLD',
  RELEASE_LEGAL_HOLD: 'RELEASE_LEGAL_HOLD',
  EXECUTE_DISPOSAL: 'EXECUTE_DISPOSAL',

  // ---------------------------------------------------------------------------
  // LAYER 3: SYSTEM ACTIONS (Admin)
  // Technical administration - user management, settings, emergency ops
  // Should NOT include business/governance powers
  // ---------------------------------------------------------------------------
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_GROUPS: 'MANAGE_GROUPS',
  MANAGE_DEPARTMENTS: 'MANAGE_DEPARTMENTS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  MANAGE_SYSTEM_SETTINGS: 'MANAGE_SYSTEM_SETTINGS',
  MANAGE_CLASSIFICATIONS: 'MANAGE_CLASSIFICATIONS',
  MANAGE_API_KEYS: 'MANAGE_API_KEYS',
  MANAGE_WEBHOOKS: 'MANAGE_WEBHOOKS',
  VIEW_SYSTEM_LOGS: 'VIEW_SYSTEM_LOGS',

  // Emergency Only (Requires documented justification)
  HARD_DELETE_RECORD: 'HARD_DELETE_RECORD',
  BREAK_GLASS_GOVERNANCE: 'BREAK_GLASS_GOVERNANCE', // Emergency governance access

  // ---------------------------------------------------------------------------
  // AUDIT ACTIONS (Auditor)
  // ---------------------------------------------------------------------------
  AUDIT_FULL_ACCESS: 'AUDIT_FULL_ACCESS',
  GENERATE_COMPLIANCE_REPORTS: 'GENERATE_COMPLIANCE_REPORTS',
} as const;

export type Permission = keyof typeof PERMISSIONS;

// =============================================================================
// ROLE CAPABILITIES MATRIX
// =============================================================================

export const ROLE_CAPABILITIES: Record<Role, Permission[]> = {
  // External users can only submit, no browsing
  EXTERNAL_USER: [
    'WORKSPACE_UPLOAD',
    'SUBMIT_RECORD',
    'VIEW_OWN_RECORDS'
  ],

  // Basic users: workspace management only
  USER: [
    'WORKSPACE_UPLOAD',
    'WORKSPACE_EDIT_DRAFT',
    'WORKSPACE_DELETE_DRAFT',
    'VIEW_OWN_RECORDS'
  ],

  // Contributors: full content creation and submission
  CONTRIBUTOR: [
    'WORKSPACE_UPLOAD',
    'WORKSPACE_EDIT_DRAFT',
    'WORKSPACE_DELETE_DRAFT',
    'SUBMIT_RECORD',
    'EDIT_METADATA',
    'VIEW_OWN_RECORDS'
  ],

  // Approvers: department-level verification
  APPROVER: [
    'VIEW_OWN_RECORDS',
    'VIEW_DEPARTMENT_RECORDS',
    'VERIFY_SUBMISSION',
    'REJECT_SUBMISSION'
  ],

  // Records Officer: FULL GOVERNANCE AUTHORITY
  // This is the legally responsible role for records management
  RECORDS_OFFICER: [
    // Verification
    'VERIFY_SUBMISSION',
    'REJECT_SUBMISSION',

    // Visibility
    'VIEW_ALL_RECORDS',
    'VIEW_DEPARTMENT_RECORDS',
    'VIEW_OWN_RECORDS',

    // Lifecycle
    'REGISTER_RECORD',
    'LOCK_RECORD',
    'UNLOCK_RECORD',
    'ARCHIVE_RECORD',
    'RESTORE_RECORD',
    'CHANGE_STATUS',

    // Classification
    'OVERRIDE_CLASSIFICATION',
    'OVERRIDE_SECURITY_LEVEL',
    'ASSIGN_OWNER',

    // Retention & Legal
    'MANAGE_RETENTION',
    'MANAGE_LEGAL_HOLDS',
    'APPLY_LEGAL_HOLD',
    'RELEASE_LEGAL_HOLD',
    'EXECUTE_DISPOSAL'
  ],

  // Admin: TECHNICAL ONLY
  // Deliberately excluded from governance actions to maintain separation of duties
  ADMIN: [
    // System Management
    'MANAGE_USERS',
    'MANAGE_GROUPS',
    'MANAGE_DEPARTMENTS',
    'MANAGE_ROLES',
    'MANAGE_SYSTEM_SETTINGS',
    'MANAGE_CLASSIFICATIONS',
    'MANAGE_API_KEYS',
    'MANAGE_WEBHOOKS',
    'VIEW_SYSTEM_LOGS',

    // Basic visibility for support purposes
    'VIEW_ALL_RECORDS',
    'VIEW_OWN_RECORDS',

    // Emergency powers (requires documented justification)
    'HARD_DELETE_RECORD',
    'BREAK_GLASS_GOVERNANCE'  // Allows temporary governance access with heavy audit
  ],

  // Auditor: READ-ONLY oversight
  AUDITOR: [
    'VIEW_ALL_RECORDS',
    'VIEW_OWN_RECORDS',
    'VIEW_SYSTEM_LOGS',
    'AUDIT_FULL_ACCESS',
    'GENERATE_COMPLIANCE_REPORTS'
  ]
};

// =============================================================================
// SECURITY CLEARANCE MAPPING
// Classification-to-Clearance policy (hard-coded per governance requirements)
// =============================================================================

export const CLEARANCE_LEVELS = {
  PUBLIC: 1,
  OFFICIAL: 2,
  OFFICIAL_CONFIDENTIAL: 3,
  RESTRICTED: 4,
  SECRET: 5
} as const;

export type ClearanceLevel = typeof CLEARANCE_LEVELS[keyof typeof CLEARANCE_LEVELS];

/**
 * Maps Classification enum to required clearance level
 */
export function getRequiredClearance(classification: string): number {
  const mapping: Record<string, number> = {
    'OFFICIAL': CLEARANCE_LEVELS.OFFICIAL,
    'OFFICIAL_CONFIDENTIAL': CLEARANCE_LEVELS.OFFICIAL_CONFIDENTIAL,
    'RESTRICTED': CLEARANCE_LEVELS.RESTRICTED,
    'SECRET': CLEARANCE_LEVELS.SECRET
  };
  return mapping[classification] || CLEARANCE_LEVELS.PUBLIC;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Maps legacy role names to current roles
 */
export function mapLegacyRole(roleName: string): Role {
  const r = (roleName || 'USER').toUpperCase();

  // Legacy mappings
  if (r === 'STAFF') return 'CONTRIBUTOR';
  if (r === 'DEPT_HEAD') return 'APPROVER';
  if (r === 'RECORDS_MANAGER') return 'RECORDS_OFFICER';
  if (r === 'EXTERNAL') return 'EXTERNAL_USER';

  // Check if already valid
  if (r in ROLES) return r as Role;

  return 'USER';
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(rawRole: string, permission: Permission): boolean {
  const role = mapLegacyRole(rawRole);
  return ROLE_CAPABILITIES[role]?.includes(permission) ?? false;
}

/**
 * Assert permission or throw
 */
export function assertPermission(rawRole: string, permission: Permission): void {
  if (!hasPermission(rawRole, permission)) {
    throw new Error(`Access Denied: Role '${rawRole}' lacks permission '${permission}'`);
  }
}

/**
 * Check if an action is a governance action (requires reason)
 */
export function isGovernanceAction(permission: Permission): boolean {
  const governanceActions: Permission[] = [
    'VERIFY_SUBMISSION',
    'REJECT_SUBMISSION',
    'REGISTER_RECORD',
    'LOCK_RECORD',
    'UNLOCK_RECORD',
    'ARCHIVE_RECORD',
    'RESTORE_RECORD',
    'CHANGE_STATUS',
    'OVERRIDE_CLASSIFICATION',
    'OVERRIDE_SECURITY_LEVEL',
    'ASSIGN_OWNER',
    'APPLY_LEGAL_HOLD',
    'RELEASE_LEGAL_HOLD',
    'EXECUTE_DISPOSAL',
    'HARD_DELETE_RECORD',
    'BREAK_GLASS_GOVERNANCE'
  ];
  return governanceActions.includes(permission);
}

/**
 * Check if user clearance meets record security level
 */
export function hasClearance(userClearance: number, recordSecurityLevel: number): boolean {
  return userClearance >= recordSecurityLevel;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(rawRole: string): Permission[] {
  const role = mapLegacyRole(rawRole);
  return ROLE_CAPABILITIES[role] || [];
}

/**
 * Check if role is administrative
 */
export function isAdminRole(rawRole: string): boolean {
  const role = mapLegacyRole(rawRole);
  return role === 'ADMIN';
}

/**
 * Check if role has governance authority
 */
export function hasGovernanceAuthority(rawRole: string): boolean {
  const role = mapLegacyRole(rawRole);
  return role === 'RECORDS_OFFICER';
}
