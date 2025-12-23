
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
    // Must be in past, and record must be official (ACTIVE or ARCHIVED, not DRAFT usually?)
    // Actually, Drafts might just be deleted. "Disposal" usually implies formal end of life for Official records.
    return record.dispositionDate <= now;
}

/**
 * Applies a Legal Hold to a record.
 * 1. Creates RecordLegalHold relation.
 * 2. Updates Record.isLegalHold = true.
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

        // Audit? (Caller usually handles audit, or we do it here)
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
 * 1. Checks if other holds exist.
 * 2. Updates Record.isLegalHold accordingly.
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
