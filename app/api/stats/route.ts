import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ROLES, hasPermission } from '@/lib/permissions';
import { cacheAside, CacheTTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const isAdmin = user.role === ROLES.ADMIN || user.role === ROLES.RECORDS_OFFICER || user.role === ROLES.APPROVER;

  try {
    // Cache key includes userId + role for per-user stats
    const cacheKey = `stats:${user.id}:${user.role}`;

    const response = await cacheAside(cacheKey, CacheTTL.STATS, async () => {
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

    // PENDING: For Admins/Officers = all records pending verification (SUBMITTED)
    // For Approvers = SUBMITTED records in their department
    // For users = their own drafts
    let pendingDocs: number;
    if (user.role === ROLES.ADMIN || user.role === ROLES.RECORDS_OFFICER) {
        pendingDocs = await prisma.record.count({ where: { status: 'SUBMITTED' } });
    } else if (user.role === ROLES.APPROVER && user.departmentId) {
        pendingDocs = await prisma.record.count({ where: { status: 'SUBMITTED', departmentId: user.departmentId } });
    } else {
        pendingDocs = await prisma.record.count({ where: { status: 'DRAFT', ownerUserId: user.id } });
    }

    // My pending access requests
    const myPendingRequests = await prisma.accessRequest.count({
        where: { requesterId: user.id, status: 'PENDING' }
    });

    // Pending access requests for admin/officer/approver to review
    let pendingAccessRequests = 0;
    if (user.role === ROLES.ADMIN || user.role === ROLES.RECORDS_OFFICER || user.role === ROLES.APPROVER) {
        pendingAccessRequests = await prisma.accessRequest.count({
            where: { status: 'PENDING' }
        });
    }

    const result: any = {
        documents: {
            total: totalDocs,
            mine: myDocs,
            thisMonth: thisMonthDocs,
            pending: pendingDocs
        },
        myPendingRequests,
        pendingAccessRequests
    };

    // 2. Admin Stats (Only if authorized)
    if (isAdmin) {
        const totalUsers = await prisma.user.count();
        const totalGroups = await prisma.group.count();
        
        // Recent Audit Logs (Activity)
        const recentLogs = await prisma.auditLog.count({
             where: { timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // Last 30 days
        });

        result.admin = {
            users: totalUsers,
            groups: totalGroups
        };
        result.audit = {
            recentLogs
        };
    }

    return result;
    }); // end cacheAside

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
