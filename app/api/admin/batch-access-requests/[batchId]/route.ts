import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

async function isAdminOrManager() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  return role === 'ADMIN' || role === 'RECORDS_OFFICER';
}

/**
 * PATCH /api/admin/batch-access-requests/[batchId]
 *
 * Bulk approve or reject all pending requests in a batch.
 *
 * Body:
 * - action: 'APPROVE_ALL' | 'REJECT_ALL'
 * - approvedLevel?: string (for APPROVE_ALL)
 * - rejectionReason?: string (for REJECT_ALL)
 * - expiresAt?: string (for APPROVE_ALL)
 */
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ batchId: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);

  if (!await isAdminOrManager()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { batchId } = params;
  const { action, approvedLevel, rejectionReason, expiresAt } = await request.json();

  if (!['APPROVE_ALL', 'REJECT_ALL'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action. Use APPROVE_ALL or REJECT_ALL' }, { status: 400 });
  }

  try {
    // Fetch all pending requests in this batch
    const pendingRequests = await prisma.accessRequest.findMany({
      where: {
        batchId,
        status: 'PENDING'
      },
      include: {
        record: { select: { id: true, title: true, referenceNumber: true } },
        requester: { select: { id: true, name: true, email: true } }
      }
    });

    if (pendingRequests.length === 0) {
      return NextResponse.json({ error: 'No pending requests found in this batch' }, { status: 404 });
    }

    const reviewerId = (session?.user as any).id;
    const reviewerRole = (session?.user as any).role;
    const parsedExpiry = expiresAt ? new Date(expiresAt) : undefined;
    const results: any[] = [];

    if (action === 'REJECT_ALL') {
      if (!rejectionReason) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
      }

      // Process each rejection in a transaction
      for (const req of pendingRequests) {
        const [updated] = await prisma.$transaction([
          prisma.accessRequest.update({
            where: { id: req.id },
            data: {
              status: 'REJECTED',
              rejectionReason,
              reviewedById: reviewerId,
              reviewedAt: new Date()
            }
          }),
          prisma.auditLog.create({
            data: {
              action: 'ACCESS_REJECTED',
              recordId: req.recordId,
              userId: reviewerId,
              actorRole: reviewerRole,
              source: 'API',
              newValue: JSON.stringify({
                requesterId: req.requesterId,
                requestedLevel: req.requestedLevel,
                rejectionReason,
                batchId
              })
            }
          })
        ]);
        results.push(updated);
      }

      // Batch audit log
      await prisma.auditLog.create({
        data: {
          action: 'BATCH_ACCESS_REJECTED',
          userId: reviewerId,
          actorRole: reviewerRole,
          source: 'API',
          newValue: JSON.stringify({
            batchId,
            count: results.length,
            rejectionReason
          })
        }
      });

      return NextResponse.json({
        action: 'REJECT_ALL',
        processed: results.length,
        requests: results
      });
    }

    // APPROVE_ALL
    const level = approvedLevel || 'VIEW';

    for (const req of pendingRequests) {
      if (req.resourceType !== 'RECORD' || !req.recordId) {
        // Skip non-record requests in batch approval for now
        continue;
      }

      const [updated, access] = await prisma.$transaction([
        prisma.accessRequest.update({
          where: { id: req.id },
          data: {
            status: 'APPROVED',
            reviewedById: reviewerId,
            reviewedAt: new Date(),
            approvedLevel: level
          }
        }),
        prisma.recordAccess.create({
          data: {
            recordId: req.recordId,
            userId: req.requesterId,
            principalType: 'USER',
            level: level,
            accessType: 'ALLOW',
            expiresAt: parsedExpiry
          }
        }),
        prisma.auditLog.create({
          data: {
            action: 'ACCESS_APPROVED',
            recordId: req.recordId,
            userId: reviewerId,
            actorRole: reviewerRole,
            source: 'API',
            newValue: JSON.stringify({
              requesterId: req.requesterId,
              approvedLevel: level,
              expiresAt: parsedExpiry,
              batchId
            })
          }
        })
      ]);

      results.push({ request: updated, access });
    }

    // Batch audit log
    await prisma.auditLog.create({
      data: {
        action: 'BATCH_ACCESS_APPROVED',
        userId: reviewerId,
        actorRole: reviewerRole,
        source: 'API',
        newValue: JSON.stringify({
          batchId,
          count: results.length,
          approvedLevel: level,
          expiresAt: parsedExpiry
        })
      }
    });

    return NextResponse.json({
      action: 'APPROVE_ALL',
      processed: results.length,
      approvedLevel: level,
      expiresAt: parsedExpiry,
      requests: results
    });

  } catch (error) {
    console.error('Batch Access Request Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/batch-access-requests/[batchId]
 *
 * Get all requests in a specific batch.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ batchId: string }> }
) {
  const params = await props.params;

  if (!await isAdminOrManager()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { batchId } = params;

  try {
    const requests = await prisma.accessRequest.findMany({
      where: { batchId },
      include: {
        requester: { select: { id: true, name: true, email: true, department: { select: { name: true, code: true } } } },
        record: { select: { id: true, title: true, referenceNumber: true, classification: true } },
        registeredCompany: { select: { id: true, name: true, registrationNumber: true } },
        reviewedBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (requests.length === 0) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'PENDING').length,
      approved: requests.filter(r => r.status === 'APPROVED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length
    };

    return NextResponse.json({
      batchId,
      requester: requests[0].requester,
      reason: requests[0].reason,
      requestedLevel: requests[0].requestedLevel,
      createdAt: requests[0].createdAt,
      requests,
      stats
    });

  } catch (error) {
    console.error('Get Batch Requests Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
