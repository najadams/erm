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

import { RecordStatus } from '@prisma/client';

export { RecordStatus };

// Defines VALID transitions from a given state
const STATE_TRANSITIONS: Record<RecordStatus, RecordStatus[]> = {
    DRAFT: ['SUBMITTED', 'REGISTERED', 'ARCHIVED'], 
    SUBMITTED: ['DRAFT', 'REGISTERED'], 
    REGISTERED: ['LOCKED', 'ARCHIVED'], 
    LOCKED: ['REGISTERED', 'ARCHIVED'], 
    ARCHIVED: ['REGISTERED'] 
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
        if (targetStatus === 'DRAFT') return; 
        
        if (targetStatus === 'REGISTERED') {
             // BYPASS: Creating directly as Registered requires Verification capability
             if (!hasPermission(userRole, 'VERIFY_SUBMISSION')) {
                 throw new LifecycleError(`Role '${userRole}' cannot create records directly in '${targetStatus}' state. Must be DRAFT.`);
             }
             return;
        }
        
        throw new LifecycleError(`Cannot create record directly in '${targetStatus}' state.`);
    }

    // 2. State Machine Logic
    const validNextStates = STATE_TRANSITIONS[currentStatus];
    if (!validNextStates?.includes(targetStatus)) {
        throw new LifecycleError(`Invalid transition: '${currentStatus}' -> '${targetStatus}' is not allowed in the Lifecycle Graph.`);
    }

    // 3. Permission Checks for Transitions
    
    // DRAFT -> REGISTERED (Bypass)
    if (currentStatus === 'DRAFT' && targetStatus === 'REGISTERED') {
        if (!hasPermission(userRole, 'VERIFY_SUBMISSION')) {
             throw new LifecycleError(`Role '${userRole}' cannot bypass verification (DRAFT -> REGISTERED).`);
        }
    }

    // SUBMITTED -> REGISTERED
    if (currentStatus === 'SUBMITTED' && targetStatus === 'REGISTERED') {
        if (!hasPermission(userRole, 'VERIFY_SUBMISSION')) {
             throw new LifecycleError(`Role '${userRole}' cannot verify submissions.`);
        }
    }
}
