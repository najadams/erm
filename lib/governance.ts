import { RecordStatus, User, Record } from '@prisma/client';
import { ROLES } from '@/lib/permissions';

export interface GovernanceOverride {
    action: 'CHANGE_CLASSIFICATION' | 'CHANGE_STATUS' | 'CHANGE_OWNER' | 'LOCK' | 'UNLOCK' | 'ARCHIVE' | 'RESTORE' | 'DELETE';
    reason: string;
    newValue?: any;
}

/**
 * Validates if the user can perform a governance override on a record.
 * @param user The actor performing the action
 * @param record The target record
 * @param override The governance action details
 */
export function validateGovernanceOverride(
    user: User, 
    record: Record, 
    override: GovernanceOverride
): void {
    if (!override.reason || override.reason.trim().length < 5) {
        throw new Error('Governance Restriction: A valid reason (min 5 chars) is mandatory for this action.');
    }

    // Records Manager or Admin only
    const allowedRoles = [ROLES.RECORDS_OFFICER, ROLES.ADMIN];
    if (!allowedRoles.includes(user.role as any)) {
        throw new Error(`Governance Restriction: User role '${user.role}' is not authorized to override governance controls.`);
    }

    // Specific logic per action
    switch (override.action) {
        case 'LOCK':
            if (record.status === RecordStatus.LOCKED) throw new Error('Record is already locked.');
            break;
        case 'UNLOCK':
            if (record.status !== RecordStatus.LOCKED) throw new Error('Record is not locked.');
            break;
        case 'ARCHIVE':
             if (record.status === RecordStatus.ARCHIVED) throw new Error('Record is already archived.');
             break;
        case 'DELETE':
             // Admin only for Hard Delete
             if (user.role !== ROLES.ADMIN) throw new Error('Governance Restriction: Only System Admin can perform Hard Deletes. Consider Archiving instead.');
             // Prevent deleting Active/Registered records even for Admin without specific workflow? 
             // Currently simplified: Admin + Reason allowed.
             break;
    }
}
