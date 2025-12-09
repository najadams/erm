import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { ROLES } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const role = user.role;
  const userId = user.id;

  try {
    // Determine filtering based on role
    const whereClause: any = {};
    
    // Regular users only see their own actions
    if (role === ROLES.USER) {
      whereClause.userId = userId;
    }
    // ADMIN and AUDITOR see all actions (no filter)

    const auditLogs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        record: {
          select: {
            id: true,
            title: true,
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });

    return NextResponse.json(auditLogs);

  } catch (error) {
    console.error('Audit Logs Error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
