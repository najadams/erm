import { ACS, Action } from '@/lib/acs';

export type AccessLevel = 'VIEW' | 'EDIT' | 'DELETE'; // Compatibility shim

export async function canAccessRecord(
  userId: string,
  recordId: string,
  level: AccessLevel = 'VIEW'
): Promise<boolean> {
  // Map legacy access levels to new ACS actions
  const actionMap: Record<AccessLevel, Action> = {
    'VIEW': 'VIEW',
    'EDIT': 'EDIT_METADATA',  // EDIT maps to metadata editing by default
    'DELETE': 'DELETE'
  };
  return ACS.evaluate(userId, recordId, actionMap[level]);
}

export async function getAccessibleRecordsClause(userId: string) {
  return ACS.getWhereClause(userId);
}
