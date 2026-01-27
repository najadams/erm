import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { validateGovernanceOverride, GovernanceOverride } from '@/lib/governance';
import { RecordStatus } from '@/lib/lifecycle';

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const user = session.user as any;
  
  try {
      const body = await request.json();
      const { action, reason, newValue } = body;

      // 1. Fetch Record
      const record = await prisma.record.findUnique({ where: { id } });
      if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

      // 2. Validate Governance Action (Throws if invalid)
      // Map body action to GovernanceOverride action
      const override: GovernanceOverride = {
          action: action,
          reason: reason,
          newValue: newValue
      };

      try {
           validateGovernanceOverride(user, record, override);
      } catch (e: any) {
           return NextResponse.json({ error: e.message }, { status: 403 });
      }

      // 3. Execute Action
      let updateData: any = {};
      let auditLogAction = action;
      
      switch (action) {
          case 'LOCK':
              updateData = { status: 'LOCKED' };
              break;
          case 'UNLOCK':
              updateData = { status: 'REGISTERED' }; // Reverts to Registered
              break;
          case 'CHANGE_STATUS':
              // Additional check for valid status? 
              // validateGovernanceOverride is generic, but here we apply the change.
              // Assuming newValue is a valid status.
              updateData = { status: newValue };
              break;
          case 'ARCHIVE':
              updateData = { status: 'ARCHIVED' };
              break;
          case 'RESTORE':
              updateData = { status: 'REGISTERED' };
              break;
          case 'OVERRIDE_CLASSIFICATION':
              if (!newValue /* ID of new classification */) return NextResponse.json({ error: 'Missing new classification ID' }, {status: 400});
              // Fetch node to verify? 
              // For simplicity, just update ID.
              updateData = { classificationNodeId: newValue };
              break;
          case 'ASSIGN_OWNER':
              updateData = { ownerUserId: newValue };
              break;
          default:
              return NextResponse.json({ error: 'Unsupported governance action' }, { status: 400 });
      }

      // 4. Update Transaction allow with Audit
      await prisma.$transaction(async (tx) => {
          await tx.record.update({
              where: { id },
              data: updateData
          });

          await tx.auditLog.create({
              data: {
                  action: `GOVERNANCE_${action}`,
                  recordId: id,
                  userId: user.id,
                  actorRole: user.role,
                  source: 'GOVERNANCE_API',
                  reason: reason,
                  oldValue: JSON.stringify(record), // Snapshot old state
                  newValue: JSON.stringify(updateData) // Snapshot of change
              }
          });
      });

      return NextResponse.json({ success: true, status: updateData.status || 'UPDATED' });

  } catch (error: any) {
      console.error('Governance Error:', error);
      return NextResponse.json({ error: 'Governance action failed', details: error.message }, { status: 500 });
  }
}
