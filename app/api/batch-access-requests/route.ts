import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ACS } from '@/lib/acs';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

interface SkippedRecord {
  recordId: string;
  title?: string;
  reason: 'ALREADY_HAS_ACCESS' | 'PENDING_REQUEST' | 'COOLDOWN_ACTIVE' | 'NOT_FOUND';
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  try {
    const { recordIds, reason, requestedLevel = 'VIEW' } = await request.json();

    // Validation
    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json({ error: 'recordIds array is required' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    if (recordIds.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 records per batch request' }, { status: 400 });
    }

    // Generate batch ID
    const batchId = uuidv4();
    const created: any[] = [];
    const skipped: SkippedRecord[] = [];
    const cooldownDays = 7;
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;

    // Fetch all records to validate they exist and get titles
    const records = await prisma.record.findMany({
      where: { id: { in: recordIds } },
      select: { id: true, title: true }
    });
    const recordMap = new Map(records.map(r => [r.id, r]));

    // Fetch existing pending requests for these records by this user
    const existingPending = await prisma.accessRequest.findMany({
      where: {
        recordId: { in: recordIds },
        resourceType: 'RECORD',
        requesterId: userId,
        status: 'PENDING'
      },
      select: { recordId: true }
    });
    const pendingSet = new Set(existingPending.map(r => r.recordId));

    // Fetch recent rejections (within cooldown period)
    const recentRejections = await prisma.accessRequest.findMany({
      where: {
        recordId: { in: recordIds },
        resourceType: 'RECORD',
        requesterId: userId,
        status: 'REJECTED',
        reviewedAt: { gt: new Date(Date.now() - cooldownMs) }
      },
      select: { recordId: true }
    });
    const cooldownSet = new Set(recentRejections.map(r => r.recordId));

    // Process each record
    for (const recordId of recordIds) {
      const record = recordMap.get(recordId);

      // Check if record exists
      if (!record) {
        skipped.push({ recordId, reason: 'NOT_FOUND' });
        continue;
      }

      // Check if user already has access
      const hasAccess = await ACS.evaluate(userId, recordId, 'VIEW');
      if (hasAccess) {
        skipped.push({ recordId, title: record.title, reason: 'ALREADY_HAS_ACCESS' });
        continue;
      }

      // Check for pending request
      if (pendingSet.has(recordId)) {
        skipped.push({ recordId, title: record.title, reason: 'PENDING_REQUEST' });
        continue;
      }

      // Check cooldown
      if (cooldownSet.has(recordId)) {
        skipped.push({ recordId, title: record.title, reason: 'COOLDOWN_ACTIVE' });
        continue;
      }

      // Create the request
      const newRequest = await prisma.accessRequest.create({
        data: {
          resourceType: 'RECORD',
          recordId,
          requesterId: userId,
          reason: reason.trim(),
          requestedLevel,
          status: 'PENDING',
          batchId
        },
        include: {
          record: { select: { id: true, title: true, referenceNumber: true } }
        }
      });

      created.push(newRequest);
    }

    // Audit log for the batch
    if (created.length > 0) {
      await prisma.auditLog.create({
        data: {
          action: 'BATCH_ACCESS_REQUESTED',
          userId,
          actorRole: userRole,
          source: 'API',
          newValue: JSON.stringify({
            batchId,
            recordCount: created.length,
            recordIds: created.map(r => r.recordId),
            requestedLevel,
            reason: reason.trim()
          })
        }
      });
    }

    return NextResponse.json({
      batchId: created.length > 0 ? batchId : null,
      created,
      skipped,
      summary: {
        total: recordIds.length,
        created: created.length,
        skipped: skipped.length
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Batch Access Request Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
