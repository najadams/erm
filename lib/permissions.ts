export type Role = 'ADMIN' | 'USER' | 'AUDITOR' | 'STAFF';
export type Permission = 'UPLOAD' | 'VIEW' | 'EDIT_METADATA' | 'DELETE' | 'MANAGE_USERS' | 'VIEW_AUDIT_LOGS';

export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  AUDITOR: 'AUDITOR',
  STAFF: 'STAFF', // Legacy support, treats as USER
} as const;

export const PERMISSIONS: Record<Permission, Permission> = {
  UPLOAD: 'UPLOAD',
  VIEW: 'VIEW',
  EDIT_METADATA: 'EDIT_METADATA',
  DELETE: 'DELETE',
  MANAGE_USERS: 'MANAGE_USERS',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
};

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: Object.values(PERMISSIONS),
  USER: [PERMISSIONS.UPLOAD, PERMISSIONS.VIEW, PERMISSIONS.EDIT_METADATA],
  STAFF: [PERMISSIONS.UPLOAD, PERMISSIONS.VIEW, PERMISSIONS.EDIT_METADATA], // Mapped to USER
  AUDITOR: [PERMISSIONS.VIEW, PERMISSIONS.VIEW_AUDIT_LOGS],
};

export function hasPermission(role: string, permission: Permission): boolean {
  // Normalize role to uppercase to be safe
  const userRole = (role || 'USER').toUpperCase() as Role;
  
  // Check if role exists in config, if not default to no permissions (or minimal)
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  
  return permissions.includes(permission);
}
