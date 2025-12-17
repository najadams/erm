import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { ROLES } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const role = user.role;
  const userId = user.id;

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // common stats
    const [
        totalRecords, 
        myRecords, 
        addedThisMonth, 
        pendingRetention
    ] = await Promise.all([
        prisma.record.count(),
        prisma.record.count({ where: { ownerUserId: userId } }),
        prisma.record.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.record.count({ where: { status: 'PENDING' } }) // Proxy for retention/cleanup
    ]);

    const stats: any = {
        documents: {
            total: totalRecords,
            mine: myRecords,
            thisMonth: addedThisMonth,
            pending: pendingRetention
        }
    };

    // Admin only stats
    if (role === ROLES.ADMIN) {
        const [userCount, groupCount] = await Promise.all([
            prisma.user.count(),
            prisma.group.count()
        ]);
        stats.admin = {
            users: userCount,
            groups: groupCount
        };
    }

    // Auditor/Admin stats
    if (role === ROLES.ADMIN || role === ROLES.AUDITOR) {
        const auditCount = await prisma.auditLog.count({
            where: { timestamp: { gte: startOfMonth } }
        });
        stats.audit = {
            recentLogs: auditCount
        };
    }

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Stats Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
