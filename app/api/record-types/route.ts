import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const categories = await prisma.recordCategory.findMany({
      include: {
        recordTypes: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching record types:', error);
    return NextResponse.json({ error: 'Failed to fetch record types' }, { status: 500 });
  }
}
