import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user && (session.user as any).role === 'ADMIN';
}

export async function GET(request: NextRequest) {
    if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const requests = await prisma.accountRequest.findMany({
        orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(requests);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, reason } = body;

    if (!email || !name || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check existing
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Account with this email already exists' }, { status: 409 });
    }

    const existingRequest = await prisma.accountRequest.findUnique({ where: { email } });
    if (existingRequest) {
      return NextResponse.json({ error: 'Request already pending for this email' }, { status: 409 });
    }

    const newRequest = await prisma.accountRequest.create({
      data: {
        email,
        name,
        reason,
        status: 'PENDING',
      },
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error('Request Access Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
