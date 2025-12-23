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

  const userRole = (session.user as any).role;
  
  // Only Admins, Auditors, and Records Officers should see system stats
  if (!hasPermission(userRole, 'AUDIT_VIEW_FULL') && userRole !== ROLES.RECORDS_OFFICER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // 1. Record Status Counts
    const statusCounts = await prisma.record.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const countsByStatus = statusCounts.reduce((acc, curr) => {
      acc[curr.status || 'UNKNOWN'] = curr._count.id;
      return acc;
    }, {} as Record<string, number>);

    // 2. Pending Verification (SUBMITTED)
    // Already in countsByStatus, but let's be explicit
    const pendingVerificationCount = countsByStatus['SUBMITTED'] || 0;

    // 3. Total Records
    const totalRecords = await prisma.record.count();

    // 4. Recent Activity (Last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivityCount = await prisma.auditLog.count({
      where: {
        timestamp: { gte: oneDayAgo }
      }
    });
    
    // 5. Active Users (Last 24h) - Unique users who created an audit log
    const activeUsersGroup = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: { timestamp: { gte: oneDayAgo } },
        _count: { userId: true }
    });
    const activeUsersCount = activeUsersGroup.length;

    // 6. Recent Alerts (500s/Failures? - We don't have explicit Error logs yet, 
    // but we can query AuditLogs with specific actions if we added them.
    // For now, let's return Audit Logs of interest, e.g. LOGIN_FAILED or STATUS_CHANGE REJECT)
    const recentAlerts = await prisma.auditLog.findMany({
        where: {
            OR: [
                { action: 'LOGIN_FAILED' },
                { action: 'ACCESS_DENIED' }, // If we start logging this
                { action: 'DELETE' } // Deletions are notable
            ]
        },
        orderBy: { timestamp: 'desc' },
        take: 5,
        include: {
            user: { select: { name: true, email: true } }
        }
    });

    return NextResponse.json({
        totalRecords,
        countsByStatus,
        pendingVerificationCount,
        recentActivityCount,
        activeUsersCount,
        recentAlerts
    });

  } catch (error: any) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats', details: error.message }, { status: 500 });
  }
}
