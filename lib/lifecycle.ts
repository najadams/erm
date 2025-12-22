/**
 * ARCHITECTURE STABILIZED: FROZEN CONTRACT
 * 
 * This file defines the Non-Negotiable Record Lifecycle State Machine.
 * Modifications require formal architecture review.
 * 
 * Invariants:
 * 1. State transitions must follow the defined graph.
 * 2. Role capabilities are checked for sensitive transitions.
 * 3. Valid States: DRAFT, SUBMITTED, VERIFIED, ACTIVE, ARCHIVED, DISPOSED.
 */

import { hasPermission, Permission, Role } from './permissions';

export type RecordStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'DISPOSED';

// Defines VALID transitions from a given state
const STATE_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
    // Initial state (null) -> DRAFT or ACTIVE (if allowed)
    DRAFT: ['SUBMITTED', 'ACTIVE', 'DISPOSED'], // Drafts can be deleted/disposed or submitted
    SUBMITTED: ['DRAFT', 'VERIFIED', 'ACTIVE'], // Can be sent back to draft, verified (approved), or directly activated
    VERIFIED: ['ACTIVE', 'DRAFT'], // Verified records become Active. Or sent back if issue found later.
    ACTIVE: ['ARCHIVED', 'DRAFT'],  // Active -> Archived. Or corrected via new version (which might involve draft, but status logic usually implies archiving)
    ARCHIVED: ['DISPOSED', 'ACTIVE'], // Can be restored or disposed
    DISPOSED: [] // Terminal state
};

export class LifecycleError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'LifecycleError';
    }
}

/**
 * Asserts that a transition from `currentStatus` to `targetStatus` is allowed.
 * 
 * @param currentStatus Current status of the record (or null if creating)
 * @param targetStatus Target status
 * @param userRole Role of the actor
 */
export function assertTransitionAllowed(
    currentStatus: RecordStatus | null, 
    targetStatus: RecordStatus, 
    userRole: string
): void {
    
    // 1. Initial Creation Logic
    if (currentStatus === null) {
        if (targetStatus === 'DRAFT') return; // Anyone can create drafts (assuming workspace perm checked elsewhere)
        
        if (targetStatus === 'ACTIVE' || targetStatus === 'VERIFIED') {
             // BYPASS: Creating directly as Active requires Verification capability
             if (!hasPermission(userRole, 'VERIFY_RECORD')) {
                 throw new LifecycleError(`Role '${userRole}' cannot create records directly in '${targetStatus}' state. Must be DRAFT.`);
             }
             return;
        }
        
        // Block creation in other states like ARCHIVED/DISPOSED directly (usually)
        throw new LifecycleError(`Cannot create record directly in '${targetStatus}' state.`);
    }

    // 2. State Machine Logic
    const validNextStates = STATE_TRANSITIONS[currentStatus];
    if (!validNextStates.includes(targetStatus)) {
        throw new LifecycleError(`Invalid transition: '${currentStatus}' -> '${targetStatus}' is not allowed in the Lifecycle Graph.`);
    }

    // 3. Permission Checks for Transitions
    
    // DRAFT -> ACTIVE (Bypass)
    if (currentStatus === 'DRAFT' && targetStatus === 'ACTIVE') {
        if (!hasPermission(userRole, 'VERIFY_RECORD')) {
             throw new LifecycleError(`Role '${userRole}' cannot bypass verification (DRAFT -> ACTIVE).`);
        }
    }

    // SUBMITTED -> ACTIVE/VERIFIED
    if (currentStatus === 'SUBMITTED' && (targetStatus === 'ACTIVE' || targetStatus === 'VERIFIED')) {
        if (!hasPermission(userRole, 'VERIFY_RECORD') && !hasPermission(userRole, 'APPROVE_SUBMISSION')) {
             throw new LifecycleError(`Role '${userRole}' cannot approve/verify submissions.`);
        }
    }
}
