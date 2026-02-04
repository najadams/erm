import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  try {
    const groups = await prisma.group.findMany({
      where: q ? {
        name: { contains: q, mode: 'insensitive' }
      } : {},
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { users: true }
        }
      },
      take: 20
    });

    return NextResponse.json(groups);
  } catch (error) {
    console.error('Search Groups Error:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}
