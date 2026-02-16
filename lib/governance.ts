/**
 * GOVERNANCE MODULE
 *
 * Centralized logic for all governance operations on records.
 * This module enforces:
 * 1. Role-based authority checks
 * 2. Mandatory reason/justification for governance actions
 * 3. Lock state enforcement
 * 4. Legal hold supremacy
 * 5. Automatic audit trail generation
 */

import { prisma } from '@/lib/prisma';
import {
  hasPermission,
  hasGovernanceAuthority,
  isAdminRole,
  Permission,
  hasClearance
} from '@/lib/permissions';
import { revalidateAccessOnClassificationChange } from '@/lib/accessRevalidation';

// =============================================================================
// TYPES
// =============================================================================

export type GovernanceAction =
  | 'REGISTER'
  | 'LOCK'
  | 'UNLOCK'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'CHANGE_CLASSIFICATION'
  | 'CHANGE_SECURITY_LEVEL'
  | 'ASSIGN_OWNER'
  | 'APPLY_LEGAL_HOLD'
  | 'RELEASE_LEGAL_HOLD'
  | 'REJECT';

export interface GovernanceRequest {
  action: GovernanceAction;
  recordId: string;
  actorId: string;
  actorRole: string;
  reason: string;  // Mandatory for all governance actions
  newValue?: any;  // For changes (classification, owner, etc.)
}

export interface GovernanceResult {
  success: boolean;
  error?: string;
  record?: any;
  auditLogId?: string;
}

export class GovernanceError extends Error {
  code: string;

  constructor(message: string, code: string = 'GOVERNANCE_ERROR') {
    super(message);
    this.name = 'GovernanceError';
    this.code = code;
  }
}

// =============================================================================
// ACTION TO PERMISSION MAPPING
// =============================================================================

const ACTION_PERMISSION_MAP: Record<GovernanceAction, Permission> = {
  'REGISTER': 'REGISTER_RECORD',
  'LOCK': 'LOCK_RECORD',
  'UNLOCK': 'UNLOCK_RECORD',
  'ARCHIVE': 'ARCHIVE_RECORD',
  'RESTORE': 'RESTORE_RECORD',
  'CHANGE_CLASSIFICATION': 'OVERRIDE_CLASSIFICATION',
  'CHANGE_SECURITY_LEVEL': 'OVERRIDE_SECURITY_LEVEL',
  'ASSIGN_OWNER': 'ASSIGN_OWNER',
  'APPLY_LEGAL_HOLD': 'APPLY_LEGAL_HOLD',
  'RELEASE_LEGAL_HOLD': 'RELEASE_LEGAL_HOLD',
  'REJECT': 'REJECT_SUBMISSION'
};

// =============================================================================
// CORE VALIDATION FUNCTION
// =============================================================================

/**
 * Validates a governance action and returns detailed error if invalid.
 * This is the primary entry point for all governance checks.
 */
export async function validateGovernanceOverride(
  request: GovernanceRequest
): Promise<{ valid: boolean; error?: string; record?: any }> {
  const { action, recordId, actorId, actorRole, reason, newValue } = request;

  // 1. MANDATORY REASON CHECK
  if (!reason || reason.trim().length < 10) {
    return {
      valid: false,
      error: 'Governance actions require a documented reason (minimum 10 characters)'
    };
  }

  // 2. FETCH RECORD WITH GOVERNANCE STATE
  const record = await prisma.record.findUnique({
    where: { id: recordId },
    include: {
      classificationNode: true,
      legalHolds: { where: { legalHold: { status: 'ACTIVE' } } }
    }
  });

  if (!record) {
    return { valid: false, error: 'Record not found' };
  }

  // 3. LEGAL HOLD SUPREMACY CHECK
  // If record is under legal hold, ONLY legal hold release is allowed
  const hasActiveLegalHold = record.isLegalHold || record.legalHolds.length > 0;

  if (hasActiveLegalHold && action !== 'RELEASE_LEGAL_HOLD') {
    return {
      valid: false,
      error: `Record is under legal hold. Only RELEASE_LEGAL_HOLD action is permitted.`
    };
  }

  // 4. PERMISSION CHECK
  const requiredPermission = ACTION_PERMISSION_MAP[action];

  // Check for break-glass scenario (Admin doing governance in emergency)
  const isBreakGlass = isAdminRole(actorRole) && !hasGovernanceAuthority(actorRole);

  if (isBreakGlass) {
    // Admin can use BREAK_GLASS_GOVERNANCE in emergencies
    if (!hasPermission(actorRole, 'BREAK_GLASS_GOVERNANCE')) {
      return {
        valid: false,
        error: `Role '${actorRole}' does not have emergency governance access`
      };
    }
    // Will be logged as BREAK_GLASS event
  } else {
    // Normal permission check
    if (!hasPermission(actorRole, requiredPermission)) {
      return {
        valid: false,
        error: `Role '${actorRole}' lacks permission '${requiredPermission}' for action '${action}'`
      };
    }
  }

  // 5. CLEARANCE CHECK (Actor must have clearance to see record to modify it)
  const user = await prisma.user.findUnique({
    where: { id: actorId },
    select: { clearanceLevel: true }
  });

  const recordSecurityLevel = record.classificationNode?.securityLevel ?? 1;
  if (!hasClearance(user?.clearanceLevel ?? 1, recordSecurityLevel)) {
    return {
      valid: false,
      error: `Insufficient security clearance. Record requires level ${recordSecurityLevel}, you have ${user?.clearanceLevel ?? 1}`
    };
  }

  // 6. LOCK STATE CHECK (for content-modifying actions)
  const contentActions: GovernanceAction[] = ['CHANGE_CLASSIFICATION', 'CHANGE_SECURITY_LEVEL', 'ASSIGN_OWNER'];
  if (contentActions.includes(action) && record.isLocked) {
    return {
      valid: false,
      error: 'Record is locked. Unlock before making changes.'
    };
  }

  // 7. STATUS-SPECIFIC VALIDATION
  const validationResult = validateStatusTransition(action, record.status, record.isLocked);
  if (!validationResult.valid) {
    return validationResult;
  }

  return { valid: true, record };
}

// =============================================================================
// STATUS TRANSITION VALIDATION
// =============================================================================

function validateStatusTransition(
  action: GovernanceAction,
  currentStatus: string,
  isLocked: boolean
): { valid: boolean; error?: string } {

  switch (action) {
    case 'REGISTER':
      // Can only register SUBMITTED records
      if (currentStatus !== 'SUBMITTED') {
        return { valid: false, error: `Cannot register record in '${currentStatus}' status. Must be SUBMITTED.` };
      }
      break;

    case 'REJECT':
      // Can only reject SUBMITTED records
      if (currentStatus !== 'SUBMITTED') {
        return { valid: false, error: `Cannot reject record in '${currentStatus}' status. Must be SUBMITTED.` };
      }
      break;

    case 'ARCHIVE':
      // Can archive REGISTERED records
      if (currentStatus !== 'REGISTERED') {
        return { valid: false, error: `Cannot archive record in '${currentStatus}' status. Must be REGISTERED.` };
      }
      break;

    case 'RESTORE':
      // Can only restore ARCHIVED records
      if (currentStatus !== 'ARCHIVED') {
        return { valid: false, error: `Cannot restore record in '${currentStatus}' status. Must be ARCHIVED.` };
      }
      break;

    case 'LOCK':
      // Can lock REGISTERED records that aren't already locked
      if (currentStatus !== 'REGISTERED') {
        return { valid: false, error: `Can only lock REGISTERED records. Current status: '${currentStatus}'` };
      }
      if (isLocked) {
        return { valid: false, error: 'Record is already locked.' };
      }
      break;

    case 'UNLOCK':
      // Can only unlock locked REGISTERED records
      if (currentStatus !== 'REGISTERED') {
        return { valid: false, error: `Can only unlock REGISTERED records. Current status: '${currentStatus}'` };
      }
      if (!isLocked) {
        return { valid: false, error: 'Record is not locked.' };
      }
      break;
  }

  return { valid: true };
}

// =============================================================================
// EXECUTE GOVERNANCE ACTION
// =============================================================================

/**
 * Executes a validated governance action with full audit trail.
 * Call validateGovernanceOverride first, then pass the result here.
 */
export async function executeGovernanceAction(
  request: GovernanceRequest
): Promise<GovernanceResult> {
  const { action, recordId, actorId, actorRole, reason, newValue } = request;

  // Validate first
  const validation = await validateGovernanceOverride(request);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const record = validation.record;
  const isBreakGlass = isAdminRole(actorRole) && !hasGovernanceAuthority(actorRole);

  try {
    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      let updatedRecord;
      let auditAction = action;
      let oldValue: any = {};
      let newValueLog: any = {};

      switch (action) {
        case 'REGISTER':
          oldValue = { status: record.status };
          updatedRecord = await tx.record.update({
            where: { id: recordId },
            data: { status: 'REGISTERED' }
          });
          newValueLog = { status: 'REGISTERED' };
          break;

        case 'REJECT':
          oldValue = { status: record.status };
          updatedRecord = await tx.record.update({
            where: { id: recordId },
            data: { status: 'DRAFT' }
          });
          newValueLog = { status: 'DRAFT', rejectionReason: reason };
          break;

        case 'LOCK':
          oldValue = { isLocked: record.isLocked };
          updatedRecord = await tx.record.update({
            where: { id: recordId },
            data: {
              isLocked: true,
              lockedAt: new Date(),
              lockedById: actorId,
              lockedReason: reason
            }
          });
          newValueLog = { isLocked: true };
          break;

        case 'UNLOCK':
          oldValue = { isLocked: record.isLocked, lockedReason: record.lockedReason };
          updatedRecord = await tx.record.update({
            where: { id: recordId },
            data: {
              isLocked: false,
              lockedAt: null,
              lockedById: null,
              lockedReason: null
            }
          });
          newValueLog = { isLocked: false };
          break;

        case 'ARCHIVE':
          oldValue = { status: record.status };
          updatedRecord = await tx.record.update({
            where: { id: recordId },
            data: { status: 'ARCHIVED' }
          });
          newValueLog = { status: 'ARCHIVED' };
          break;

        case 'RESTORE':
          oldValue = { status: record.status };
          updatedRecord = await tx.record.update({
            where: { id: recordId },
            data: { status: 'REGISTERED' }
          });
          newValueLog = { status: 'REGISTERED' };
          break;

        case 'CHANGE_CLASSIFICATION':
          let targetClassificationId = newValue;
          let targetSecurity = undefined;
          let targetMetadata = undefined;

          // Handle complex object payload
          if (typeof newValue === 'object' && newValue !== null && newValue.classificationNodeId) {
              targetClassificationId = newValue.classificationNodeId;
              targetSecurity = newValue.securityClassification;
              targetMetadata = newValue.metadata;
          }

          oldValue = { 
              classificationNodeId: record.classificationNodeId,
              securityClassification: record.securityClassification
          };

          const updateData: any = { classificationNodeId: targetClassificationId };
          if (targetSecurity) {
              updateData.securityClassification = targetSecurity;
          }

          // Merge metadata if provided
          if (targetMetadata) {
              const currentMetadata = (record.metadata as any) || {};
              updateData.metadata = { ...currentMetadata, ...targetMetadata };
          }

          updatedRecord = await tx.record.update({
            where: { id: recordId },
            data: updateData
          });

          newValueLog = { 
              classificationNodeId: targetClassificationId,
              securityClassification: targetSecurity,
              metadataKeysUpdated: targetMetadata ? Object.keys(targetMetadata) : []
          };
          break;

        case 'CHANGE_SECURITY_LEVEL':
          throw new GovernanceError('Security level changes must be done through classification node management');

        case 'ASSIGN_OWNER':
          oldValue = { ownerUserId: record.ownerUserId };
          updatedRecord = await tx.record.update({
            where: { id: recordId },
            data: { ownerUserId: newValue }
          });
          newValueLog = { ownerUserId: newValue };
          break;

        case 'APPLY_LEGAL_HOLD':
          oldValue = { isLegalHold: record.isLegalHold };
          updatedRecord = await tx.record.update({
            where: { id: recordId },
            data: { isLegalHold: true }
          });
          if (newValue?.legalHoldId) {
            await tx.recordLegalHold.create({
              data: {
                recordId,
                legalHoldId: newValue.legalHoldId,
                addedByUserId: actorId
              }
            });
          }
          newValueLog = { isLegalHold: true, legalHoldId: newValue?.legalHoldId };
          break;

        case 'RELEASE_LEGAL_HOLD':
          oldValue = { isLegalHold: record.isLegalHold };
          if (newValue?.legalHoldId) {
            await tx.recordLegalHold.deleteMany({
              where: { recordId, legalHoldId: newValue.legalHoldId }
            });
          }
          const remainingHolds = await tx.recordLegalHold.count({
            where: {
              recordId,
              legalHold: { status: 'ACTIVE' }
            }
          });
          updatedRecord = await tx.record.update({
            where: { id: recordId },
            data: { isLegalHold: remainingHolds > 0 }
          });
          newValueLog = { isLegalHold: remainingHolds > 0 };
          break;

        default:
          throw new GovernanceError(`Unknown governance action: ${action}`);
      }

      // Create audit log
      const auditLog = await tx.auditLog.create({
        data: {
          action: isBreakGlass ? `BREAK_GLASS_${auditAction}` : `GOVERNANCE_${auditAction}`,
          recordId,
          userId: actorId,
          actorRole,
          source: 'API',
          oldValue: JSON.stringify(oldValue),
          newValue: JSON.stringify(newValueLog),
          reason
        }
      });

      return { record: updatedRecord, auditLogId: auditLog.id };
    });

    // Post-transaction: trigger access revalidation on classification changes
    if (action === 'CHANGE_CLASSIFICATION' && result.record) {
      // The record's classification enum (OFFICIAL/RESTRICTED/etc.) is the primary
      // clearance gate. If it changed, revalidate access grants.
      const oldClassification = record?.securityClassification || 'OFFICIAL';
      const newClassification = result.record.securityClassification || 'OFFICIAL';
      if (oldClassification !== newClassification) {
        const flagged = await revalidateAccessOnClassificationChange(
          recordId, oldClassification, newClassification, actorId
        );
        if (flagged > 0) {
          console.log(`[Governance] Classification change flagged ${flagged} access grants for review`);
        }
      }
    }

    return {
      success: true,
      record: result.record,
      auditLogId: result.auditLogId
    };

  } catch (error: any) {
    console.error('[Governance] Action failed:', error);
    return {
      success: false,
      error: error.message || 'Governance action failed'
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a record can be edited (considering lock state and status)
 */
export function canEditRecord(record: any, editType: 'METADATA' | 'CONTENT'): boolean {
  // Legal hold blocks everything
  if (record.isLegalHold) return false;

  // Locked records cannot be edited
  if (record.isLocked) return false;

  // Status-based restrictions
  switch (record.status) {
    case 'DRAFT':
      return true;

    case 'SUBMITTED':
      return editType === 'METADATA';

    case 'REGISTERED':
      return false;

    case 'ARCHIVED':
      return false;

    default:
      return false;
  }
}

/**
 * Check if a record can be deleted
 */
export function canDeleteRecord(record: any, userRole: string, userId: string): boolean {
  if (record.isLegalHold) return false;

  if (record.status === 'DRAFT' && record.ownerUserId === userId) {
    return true;
  }

  if (hasPermission(userRole, 'HARD_DELETE_RECORD')) {
    return true;
  }

  return false;
}

/**
 * Get governance state summary for a record
 */
export async function getGovernanceState(recordId: string): Promise<{
  isLocked: boolean;
  isLegalHold: boolean;
  status: string;
  canEdit: boolean;
  canDelete: boolean;
  activeLegalHolds: number;
  lockedBy?: string;
  lockedReason?: string;
}> {
  const record = await prisma.record.findUnique({
    where: { id: recordId },
    include: {
      legalHolds: {
        where: { legalHold: { status: 'ACTIVE' } },
        include: { legalHold: true }
      }
    }
  });

  if (!record) {
    throw new GovernanceError('Record not found', 'NOT_FOUND');
  }

  return {
    isLocked: record.isLocked,
    isLegalHold: record.isLegalHold,
    status: record.status,
    canEdit: canEditRecord(record, 'METADATA'),
    canDelete: false,
    activeLegalHolds: record.legalHolds.length,
    lockedBy: record.lockedById || undefined,
    lockedReason: record.lockedReason || undefined
  };
}
