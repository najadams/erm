
import { prisma } from '@/lib/prisma';
import { RecordStatus } from '@/lib/lifecycle';

/**
 * Calculates the disposition date based on policy and creation date.
 */
export function calculateDispositionDate(createdAt: Date, durationYears: number): Date {
  const date = new Date(createdAt);
  date.setFullYear(date.getFullYear() + durationYears);
  return date;
}

/**
 * Checks if a record can be disposed (Retention Expired AND No Legal Holds).
 */
export function isRecordDisposalAllowed(
    record: { 
        dispositionDate: Date | null, 
        isLegalHold: boolean,
        status: string 
    }
): boolean {
    if (record.isLegalHold) return false;
    if (!record.dispositionDate) return false;
    
    const now = new Date();
    // Must be in past
    return record.dispositionDate <= now;
}

/**
 * Applies a Legal Hold to a record.
 */
export async function applyLegalHold(recordId: string, legalHoldId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
        // Create Link
        await tx.recordLegalHold.create({
            data: {
                recordId,
                legalHoldId,
                addedByUserId: userId
            }
        });

        // Update Flag
        await tx.record.update({
            where: { id: recordId },
            data: { isLegalHold: true }
        });

        // Audit
        await tx.auditLog.create({
            data: {
                action: 'LEGAL_HOLD_APPLIED',
                recordId,
                userId,
                source: 'SYSTEM',
                newValue: JSON.stringify({ legalHoldId })
            }
        });
    });
}

/**
 * Removes a Legal Hold.
 */
export async function removeLegalHold(recordId: string, legalHoldId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
        // Remove Link
        await tx.recordLegalHold.delete({
            where: {
                recordId_legalHoldId: {
                    recordId,
                    legalHoldId
                }
            }
        });

        // Check if other holds remain
        const count = await tx.recordLegalHold.count({
            where: { recordId }
        });

        const stillHeld = count > 0;

        // Update Flag
        await tx.record.update({
            where: { id: recordId },
            data: { isLegalHold: stillHeld }
        });

        await tx.auditLog.create({
            data: {
                action: 'LEGAL_HOLD_REMOVED',
                recordId,
                userId,
                source: 'SYSTEM',
                newValue: JSON.stringify({ legalHoldId, remainingHolds: count })
            }
        });
    });
}

/**
 * Scans for records that are ready for disposition and marks them.
 * Returns the count of processed records.
 */
export async function processDispositionQueue() {
    const now = new Date();
    
    // Find records that:
    // 1. Are Active or Archived
    // 2. Have passed their disposition date
    // 3. Are NOT under legal hold
    // 4. Are NOT already flagged
    const expiredRecords = await prisma.record.findMany({
        where: {
            status: { in: ['ACTIVE', 'ARCHIVED'] },
            dispositionDate: { lte: now },
            isLegalHold: false
        },
        select: { id: true }
    });

    if (expiredRecords.length === 0) return 0;

    // Update them to READY_FOR_DISPO
    const result = await prisma.record.updateMany({
        where: {
            id: { in: expiredRecords.map(r => r.id) }
        },
        data: {
            status: 'READY_FOR_DISPO'
        }
    });

    // TODO: Ideally we should audit log these changes, but updateMany doesn't support it per record easily.
    // For now, the status change is the evidence.
    
    return result.count;
}
