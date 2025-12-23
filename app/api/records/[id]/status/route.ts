import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasPermission, assertPermission } from '@/lib/permissions';
import { assertTransitionAllowed, LifecycleError, RecordStatus } from '@/lib/lifecycle';

export const dynamic = 'force-dynamic';

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
  const userId = user.id;
  const userRole = user.role;

  try {
    const body = await request.json();
    const { status: newStatus, rejectionReason } = body; // newStatus: 'SUBMITTED' | 'ACTIVE' | 'DRAFT' (rejection)

    if (!newStatus) {
        return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // 1. Fetch Record
    const record = await prisma.record.findUnique({
      where: { id },
      select: { id: true, status: true, title: true, ownerUserId: true }
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // 2. Validate Transition (Lifecycle & Roles)
    try {
        assertTransitionAllowed(record.status as RecordStatus, newStatus, userRole);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 403 });
    }

    // 3. Additional Logic (e.g. Owner check for Submission)
    if (record.status === 'DRAFT' && newStatus === 'SUBMITTED') {
        if (record.ownerUserId !== userId) {
             return NextResponse.json({ error: 'Only the owner can submit a record.' }, { status: 403 });
        }
    }

    // 4. Perform Update & Audit
    const result = await prisma.$transaction(async (tx) => {
        // Update Record
        const updatedRecord = await tx.record.update({
            where: { id },
            data: { 
                status: newStatus,
                // If rejecting, maybe store reason in a "Notes" or separate implementation?
                // For now, we rely on Audit Log to store the reason.
            }
        });

        // Create Audit Log
        await tx.auditLog.create({
            data: {
                action: 'STATUS_CHANGE', // or specific names like SUBMIT, APPROVE, REJECT
                recordId: id,
                userId: userId,
                actorRole: userRole,
                source: 'API',
                newValue: JSON.stringify({
                    oldStatus: record.status,
                    newStatus: newStatus,
                    rejectionReason: rejectionReason || undefined,
                    timestamp: new Date().toISOString()
                })
            }
        });

        return updatedRecord;
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Status Update Error:', error);
    return NextResponse.json({ error: 'Update failed', details: error.message }, { status: 500 });
  }
}
