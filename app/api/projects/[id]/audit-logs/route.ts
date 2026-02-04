import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
     const logs = await prisma.auditLog.findMany({
        where: { projectId: id },
        orderBy: { timestamp: 'desc' },
        include: {
            user: { select: { name: true, email: true } }
        },
        take: 100
     });
     
     return NextResponse.json(logs);
  } catch (error) {
     console.error('Failed to fetch project audit logs', error);
     return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
