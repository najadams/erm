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
    const accessRequest = await prisma.accessRequest.findUnique({
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
        const updated = await prisma.accessRequest.update({
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
    // 1. Create Access (Record or Company)
    // 2. Update Request Status

    const level = approvedLevel || accessRequest.requestedLevel || 'READ';
    const resourceType = accessRequest.resourceType;

    const transactionSteps: any[] = [
         prisma.accessRequest.update({
            where: { id: requestId },
            data: {
                status: 'APPROVED',
                reviewedById: reviewerId,
                reviewedAt: new Date(),
                approvedLevel: level
            }
        })
    ];

    if (resourceType === 'RECORD' && accessRequest.recordId) {
        transactionSteps.push(
            prisma.recordAccess.create({
                data: {
                    recordId: accessRequest.recordId,
                    userId: accessRequest.requesterId,
                    principalType: 'USER',
                    level: level,
                    accessType: 'ALLOW'
                }
            })
        );
    } else if (resourceType === 'COMPANY' && accessRequest.registeredCompanyId) {
        transactionSteps.push(
            prisma.companyAccess.create({
                data: {
                    registeredCompanyId: accessRequest.registeredCompanyId,
                    userId: accessRequest.requesterId,
                    level: level,
                    accessType: 'ALLOW',
                    grantedById: reviewerId
                }
            })
        );
    } else {
        return NextResponse.json({ error: 'Invalid resource type or missing ID' }, { status: 400 });
    }

    const results = await prisma.$transaction(transactionSteps);
    // [updatedRequest, newAccess]
    
    return NextResponse.json({ request: results[0], access: results[1] });

  } catch (error) {
    console.error('Process Access Request Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
