/**
 * ARCHITECTURE STABILIZED: FROZEN CONTRACT
 *
 * This file defines the Non-Negotiable Record Lifecycle State Machine.
 * Modifications require formal architecture review.
 *
 * Invariants:
 * 1. State transitions must follow the defined graph.
 * 2. Role capabilities are checked for sensitive transitions.
 * 3. Valid States: DRAFT, SUBMITTED, REGISTERED, ARCHIVED
 *
 * Note: LOCKED is now a boolean flag (isLocked) on the Record model,
 * not a lifecycle state. A REGISTERED record can be locked/unlocked
 * without changing its lifecycle stage.
 *
 * Lifecycle Graph:
 *
 *    ┌─────────┐
 *    │  DRAFT  │ ←─── Owner creates / Rejection returns here
 *    └────┬────┘
 *         │ submit()
 *         ▼
 *    ┌───────────┐
 *    │ SUBMITTED │ ←─── Awaiting verification
 *    └─────┬─────┘
 *          │ verify() / reject()
 *          ▼
 *    ┌────────────┐
 *    │ REGISTERED │ ←─── Official record (can be locked/unlocked)
 *    └─────┬──────┘
 *          │ archive()
 *          ▼
 *    ┌──────────┐
 *    │ ARCHIVED │ ←─── Retention complete (can be restored)
 *    └──────────┘
 */

import { hasPermission, ROLES } from './permissions';

// Import the enum type from Prisma
import { RecordStatus } from '@prisma/client';

export { RecordStatus };

// =============================================================================
// STATE TRANSITION GRAPH
// =============================================================================

/**
 * Defines VALID transitions from a given state.
 * Note: LOCKED removed - now handled via isLocked boolean field
 */
const STATE_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
  DRAFT: ['SUBMITTED', 'REGISTERED'],  // Direct registration requires VERIFY_SUBMISSION
  SUBMITTED: ['DRAFT', 'REGISTERED'],  // Reject -> DRAFT, Verify -> REGISTERED
  REGISTERED: ['ARCHIVED'],            // Can only move to archive
  ARCHIVED: ['REGISTERED']             // Can be restored to REGISTERED
};

// =============================================================================
// ERROR CLASS
// =============================================================================

export class LifecycleError extends Error {
  code: string;

  constructor(message: string, code: string = 'LIFECYCLE_ERROR') {
    super(message);
    this.name = 'LifecycleError';
    this.code = code;
  }
}

// =============================================================================
// CORE VALIDATION
// =============================================================================

/**
 * Asserts that a transition from `currentStatus` to `targetStatus` is allowed.
 *
 * @param currentStatus Current status of the record (or null if creating)
 * @param targetStatus Target status
 * @param userRole Role of the actor
 * @throws LifecycleError if transition is not allowed
 */
export function assertTransitionAllowed(
  currentStatus: RecordStatus | null,
  targetStatus: RecordStatus,
  userRole: string
): void {

  // 1. Initial Creation Logic
  if (currentStatus === null) {
    if (targetStatus === 'DRAFT') return; // Anyone can create drafts

    if (targetStatus === 'REGISTERED') {
      // BYPASS: Creating directly as Registered requires verification capability or ADMIN role
      if (!hasPermission(userRole, 'REGISTER_RECORD') && userRole !== ROLES.ADMIN) {
        throw new LifecycleError(
          `Role '${userRole}' cannot create records directly in '${targetStatus}' state. Must start as DRAFT.`,
          'INVALID_INITIAL_STATE'
        );
      }
      return;
    }

    throw new LifecycleError(
      `Cannot create record directly in '${targetStatus}' state. Must start as DRAFT.`,
      'INVALID_INITIAL_STATE'
    );
  }

  // 2. State Machine Validation
  const validNextStates = STATE_TRANSITIONS[currentStatus];
  if (!validNextStates?.includes(targetStatus)) {
    throw new LifecycleError(
      `Invalid transition: '${currentStatus}' -> '${targetStatus}' is not allowed.`,
      'INVALID_TRANSITION'
    );
  }

  // 3. Permission Checks for Specific Transitions

  // DRAFT -> SUBMITTED (Submit for review)
  if (currentStatus === 'DRAFT' && targetStatus === 'SUBMITTED') {
    if (!hasPermission(userRole, 'SUBMIT_RECORD')) {
      throw new LifecycleError(
        `Role '${userRole}' cannot submit records for verification.`,
        'PERMISSION_DENIED'
      );
    }
  }

  // DRAFT -> REGISTERED (Bypass submission - direct registration)
  if (currentStatus === 'DRAFT' && targetStatus === 'REGISTERED') {
    if (!hasPermission(userRole, 'REGISTER_RECORD') && userRole !== ROLES.ADMIN) {
      throw new LifecycleError(
        `Role '${userRole}' cannot bypass verification (DRAFT -> REGISTERED).`,
        'PERMISSION_DENIED'
      );
    }
  }

  // SUBMITTED -> DRAFT (Rejection)
  if (currentStatus === 'SUBMITTED' && targetStatus === 'DRAFT') {
    if (!hasPermission(userRole, 'REJECT_SUBMISSION')) {
      throw new LifecycleError(
        `Role '${userRole}' cannot reject submissions.`,
        'PERMISSION_DENIED'
      );
    }
  }

  // SUBMITTED -> REGISTERED (Verification/Approval)
  if (currentStatus === 'SUBMITTED' && targetStatus === 'REGISTERED') {
    if (!hasPermission(userRole, 'REGISTER_RECORD') && !hasPermission(userRole, 'VERIFY_SUBMISSION')) {
      throw new LifecycleError(
        `Role '${userRole}' cannot verify and register submissions.`,
        'PERMISSION_DENIED'
      );
    }
  }

  // REGISTERED -> ARCHIVED (Archive)
  if (currentStatus === 'REGISTERED' && targetStatus === 'ARCHIVED') {
    if (!hasPermission(userRole, 'ARCHIVE_RECORD')) {
      throw new LifecycleError(
        `Role '${userRole}' cannot archive records.`,
        'PERMISSION_DENIED'
      );
    }
  }

  // ARCHIVED -> REGISTERED (Restore)
  if (currentStatus === 'ARCHIVED' && targetStatus === 'REGISTERED') {
    if (!hasPermission(userRole, 'RESTORE_RECORD')) {
      throw new LifecycleError(
        `Role '${userRole}' cannot restore archived records.`,
        'PERMISSION_DENIED'
      );
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a transition is valid (without throwing)
 */
export function isTransitionValid(
  currentStatus: RecordStatus | null,
  targetStatus: RecordStatus
): boolean {
  if (currentStatus === null) {
    return targetStatus === 'DRAFT' || targetStatus === 'REGISTERED';
  }

  const validNextStates = STATE_TRANSITIONS[currentStatus];
  return validNextStates?.includes(targetStatus) ?? false;
}

/**
 * Get all valid next states for a given status
 */
export function getValidTransitions(currentStatus: RecordStatus): RecordStatus[] {
  return STATE_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if a record status allows editing
 */
export function canEditInStatus(status: RecordStatus, editType: 'METADATA' | 'CONTENT'): boolean {
  switch (status) {
    case 'DRAFT':
      return true; // Full editing in draft

    case 'SUBMITTED':
      return editType === 'METADATA'; // Only metadata while under review

    case 'REGISTERED':
      return false; // No editing without unlock (handled by isLocked)

    case 'ARCHIVED':
      return false; // Read-only in archive

    default:
      return false;
  }
}

/**
 * Check if a record can be deleted based on status
 * Note: Legal holds and locks are checked separately
 */
export function canDeleteInStatus(status: RecordStatus, isOwner: boolean): boolean {
  // Only drafts can be deleted by their owner
  return status === 'DRAFT' && isOwner;
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(status: RecordStatus): string {
  const descriptions: Record<RecordStatus, string> = {
    DRAFT: 'Draft - Not yet submitted for verification',
    SUBMITTED: 'Submitted - Awaiting verification by Records Officer',
    REGISTERED: 'Registered - Official record in the system',
    ARCHIVED: 'Archived - Retained for historical purposes'
  };
  return descriptions[status] || 'Unknown status';
}
