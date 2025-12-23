import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ROLES, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const isAdmin = user.role === ROLES.ADMIN || user.role === ROLES.RECORDS_OFFICER;

  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Documents Stats
    const totalDocs = await prisma.record.count();
    
    const myDocs = await prisma.record.count({
        where: { ownerUserId: user.id }
    });

    const thisMonthDocs = await prisma.record.count({
        where: { 
            createdAt: { gte: firstDayOfMonth },
            ...(isAdmin ? {} : { ownerUserId: user.id })
        }
    });

    // PENDING here refers to "Pending Disposition" for Admins, or "Drafts" for users.
    const pendingDocs = isAdmin 
        ? await prisma.record.count({ where: { status: 'READY_FOR_DISPO' } })
        : await prisma.record.count({ where: { status: 'DRAFT', ownerUserId: user.id } });

    const response: any = {
        documents: {
            total: totalDocs,
            mine: myDocs,
            thisMonth: thisMonthDocs,
            pending: pendingDocs
        }
    };

    // 2. Admin Stats (Only if authorized)
    if (isAdmin) {
        const totalUsers = await prisma.user.count();
        const totalGroups = await prisma.group.count();
        
        // Recent Audit Logs (Activity)
        const recentLogs = await prisma.auditLog.count({
             where: { timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // Last 30 days
        });

        response.admin = {
            users: totalUsers,
            groups: totalGroups
        };
        response.audit = {
            recentLogs
        };
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
