import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

async function isAdminOrManager() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  return role === 'ADMIN' || role === 'RECORDS_MANAGER' || role === 'MANAGER';
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!await isAdminOrManager()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const requestId = params.id;
  const { action, approvedLevel, rejectionReason } = await request.json(); // action: 'APPROVE' | 'REJECT'

  if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  try {
    const accessRequest = await prisma.recordAccessRequest.findUnique({
        where: { id: requestId }
    });

    if (!accessRequest) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (accessRequest.status !== 'PENDING') {
        return NextResponse.json({ error: 'Request is already processed' }, { status: 400 });
    }

    const reviewerId = (session?.user as any).id;

    if (action === 'REJECT') {
        const updated = await prisma.recordAccessRequest.update({
            where: { id: requestId },
            data: {
                status: 'REJECTED',
                rejectionReason,
                reviewedById: reviewerId,
                reviewedAt: new Date()
            }
        });
        return NextResponse.json(updated);
    }

    // APPROVE FLOW
    // 1. Create RecordAccess
    // 2. Update Request Status

    const level = approvedLevel || accessRequest.requestedLevel || 'READ';

    // Use transaction
    const [updatedRequest, newAccess] = await prisma.$transaction([
        prisma.recordAccessRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                reviewedById: reviewerId,
                reviewedAt: new Date()
            }
        }),
        prisma.recordAccess.create({
            data: {
                recordId: accessRequest.recordId,
                userId: accessRequest.requesterId,
                principalType: 'USER',
                level: level,
                accessType: 'ALLOW'
            }
        })
    ]);

    return NextResponse.json({ request: updatedRequest, access: newAccess });

  } catch (error) {
    console.error('Process Access Request Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
