/**
 * ACCESS REVALIDATION
 *
 * When a record's classification is escalated, existing access grants
 * may become invalid if the user's clearance level is insufficient.
 *
 * This module flags affected grants for review — it does NOT auto-revoke.
 * Auto-revocation would break the governance principle of human-in-the-loop.
 */

import { prisma } from '@/lib/prisma';
import { getRequiredClearance } from '@/lib/permissions';

/**
 * Flags access grants that are insufficient after a classification change.
 * Called after governance CHANGE_CLASSIFICATION or record.classification update.
 *
 * @returns Number of affected grants flagged for review
 */
export async function revalidateAccessOnClassificationChange(
  recordId: string,
  oldClassification: string,
  newClassification: string,
  actorUserId: string
): Promise<number> {
  const requiredClearance = getRequiredClearance(newClassification);
  const oldRequiredClearance = getRequiredClearance(oldClassification);

  // Only act on escalation (higher classification)
  if (requiredClearance <= oldRequiredClearance) {
    return 0;
  }

  // Find all user-level ALLOW grants on this record
  const grants = await prisma.recordAccess.findMany({
    where: { recordId, accessType: 'ALLOW', principalType: 'USER' },
    include: { user: { select: { id: true, clearanceLevel: true, name: true } } }
  });

  const affected = grants.filter(g =>
    g.user && (g.user.clearanceLevel ?? 1) < requiredClearance
  );

  if (affected.length === 0) {
    return 0;
  }

  // Flag each affected grant for review via audit log
  await prisma.$transaction(
    affected.map(grant =>
      prisma.auditLog.create({
        data: {
          action: 'ACCESS_REVALIDATION_FLAGGED',
          recordId,
          userId: actorUserId,
          source: 'SYSTEM',
          newValue: JSON.stringify({
            affectedUserId: grant.userId,
            affectedUserName: grant.user!.name,
            grantLevel: grant.level,
            oldClassification,
            newClassification,
            userClearance: grant.user!.clearanceLevel,
            requiredClearance
          }),
          reason: `Classification escalated from ${oldClassification} to ${newClassification}. User clearance (${grant.user!.clearanceLevel}) is below required (${requiredClearance}).`
        }
      })
    )
  );

  return affected.length;
}
