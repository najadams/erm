import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recordId = params.id;
  const { reason, requestedLevel = 'READ' } = await request.json();

  if (!reason) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  }

  try {
    // Check if pending request exists
    const existingRequest = await prisma.recordAccessRequest.findFirst({
      where: {
        recordId,
        requesterId: (session.user as any).id,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending request for this document' }, { status: 409 });
    }

    const newRequest = await prisma.recordAccessRequest.create({
      data: {
        recordId,
        requesterId: (session.user as any).id,
        reason,
        requestedLevel,
        status: 'PENDING'
      }
    });

    return NextResponse.json(newRequest, { status: 201 });

  } catch (error) {
    console.error('Create Access Request Error:', error);
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

  const recordId = params.id;

  try {
    const existingRequest = await prisma.recordAccessRequest.findFirst({
        where: {
            recordId,
            requesterId: (session.user as any).id,
            status: 'PENDING'
        }
    });

    if (!existingRequest) {
        return NextResponse.json({ status: null });
    }

    return NextResponse.json(existingRequest);
  } catch (error) {
      console.error('Get Access Request Error:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
