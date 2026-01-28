/**
 * GOVERNANCE API ENDPOINT
 *
 * Handles all governance actions on records:
 * - LOCK/UNLOCK (now uses isLocked boolean)
 * - ARCHIVE/RESTORE
 * - REGISTER/REJECT
 * - CHANGE_CLASSIFICATION
 * - ASSIGN_OWNER
 * - APPLY_LEGAL_HOLD/RELEASE_LEGAL_HOLD
 *
 * All actions require documented reason and create audit trail.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  executeGovernanceAction,
  GovernanceAction,
  getGovernanceState
} from '@/lib/governance';

export const dynamic = 'force-dynamic';

// Valid governance actions
const VALID_ACTIONS: GovernanceAction[] = [
  'REGISTER',
  'LOCK',
  'UNLOCK',
  'ARCHIVE',
  'RESTORE',
  'CHANGE_CLASSIFICATION',
  'CHANGE_SECURITY_LEVEL',
  'ASSIGN_OWNER',
  'APPLY_LEGAL_HOLD',
  'RELEASE_LEGAL_HOLD',
  'REJECT'
];

/**
 * GET - Retrieve governance state for a record
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const state = await getGovernanceState(params.id);
    return NextResponse.json(state);
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    console.error('[Governance API] GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch governance state' }, { status: 500 });
  }
}

/**
 * POST - Execute a governance action
 *
 * Body: {
 *   action: GovernanceAction,
 *   reason: string (min 10 chars),
 *   newValue?: any (for CHANGE_CLASSIFICATION, ASSIGN_OWNER, etc.)
 * }
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const { id } = params;

  try {
    const body = await request.json();
    const { action, reason, newValue } = body;

    // Validate action type
    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({
        error: `Invalid action. Valid actions: ${VALID_ACTIONS.join(', ')}`
      }, { status: 400 });
    }

    // Validate reason presence (module validates length)
    if (!reason) {
      return NextResponse.json({
        error: 'Governance actions require a documented reason'
      }, { status: 400 });
    }

    // Execute governance action through centralized module
    const result = await executeGovernanceAction({
      action: action as GovernanceAction,
      recordId: id,
      actorId: user.id,
      actorRole: user.role,
      reason,
      newValue
    });

    if (!result.success) {
      return NextResponse.json({
        error: result.error
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      auditLogId: result.auditLogId,
      record: {
        id: result.record?.id,
        status: result.record?.status,
        isLocked: result.record?.isLocked
      }
    });

  } catch (error: any) {
    console.error('[Governance API] POST Error:', error);
    return NextResponse.json({
      error: 'Governance action failed'
    }, { status: 500 });
  }
}

/**
 * PATCH - Legacy endpoint (redirects to POST)
 * Kept for backwards compatibility
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  // Forward to POST handler
  return POST(request, props);
}
