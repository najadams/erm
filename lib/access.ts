import { ACS } from '@/lib/acs';

export type AccessLevel = 'VIEW' | 'EDIT' | 'DELETE'; // Compatibility shim

export async function canAccessRecord(
  userId: string, 
  recordId: string, 
  level: AccessLevel = 'VIEW'
): Promise<boolean> {
  const action = level === 'VIEW' ? 'VIEW' : (level === 'EDIT' ? 'EDIT' : 'DELETE');
  return ACS.evaluate(userId, recordId, action);
}

export async function getAccessibleRecordsClause(userId: string) {
  return ACS.getWhereClause(userId);
}
