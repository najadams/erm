import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> } // id is registeredCompanyId
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const registeredCompanyId = params.id;
  const { reason, requestedLevel = 'VIEW' } = await request.json();

  if (!reason) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  }

  const userId = (session.user as any).id;

  try {
    // Check if pending request exists
    const existingRequest = await prisma.accessRequest.findFirst({
      where: {
        registeredCompanyId,
        resourceType: 'COMPANY',
        requesterId: userId,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending request for this company' }, { status: 409 });
    }

    // Cooldown: 7 days after rejection
    const recentRejection = await prisma.accessRequest.findFirst({
      where: {
        registeredCompanyId,
        resourceType: 'COMPANY',
        requesterId: userId,
        status: 'REJECTED',
        reviewedAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    });
    if (recentRejection) {
      const cooldownEnd = new Date(recentRejection.reviewedAt!.getTime() + 7 * 24 * 60 * 60 * 1000);
      return NextResponse.json({
        error: `Request was recently rejected. You can re-request after ${cooldownEnd.toLocaleDateString()}`
      }, { status: 429 });
    }

    const newRequest = await prisma.accessRequest.create({
      data: {
        resourceType: 'COMPANY',
        registeredCompanyId,
        requesterId: userId,
        reason,
        requestedLevel,
        status: 'PENDING'
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'ACCESS_REQUESTED',
        userId,
        actorRole: (session.user as any).role,
        source: 'API',
        newValue: JSON.stringify({ requestedLevel, reason, registeredCompanyId })
      }
    });

    return NextResponse.json(newRequest, { status: 201 });

  } catch (error) {
    console.error('Create Company Access Request Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const registeredCompanyId = params.id;

  try {
    const existingRequest = await prisma.accessRequest.findFirst({
        where: {
            registeredCompanyId,
            resourceType: 'COMPANY',
            requesterId: (session.user as any).id,
            status: 'PENDING'
        }
    });

    if (!existingRequest) {
        return NextResponse.json({ status: null });
    }

    return NextResponse.json(existingRequest);
  } catch (error) {
      console.error('Get Company Access Request Error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
