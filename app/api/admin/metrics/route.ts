
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user || !['ADMIN', 'AUDITOR'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);

      // 1. Record Counts & Storage (Proxied by count)
      const recordCounts = await prisma.record.groupBy({
          by: ['status'],
          _count: { id: true }
      });

      const totalRecords = recordCounts.reduce((acc, curr) => acc + curr._count.id, 0);

      // 2. User Activity (from Audit Logs - Last 7 Days)
      const recentActivity = await prisma.auditLog.findMany({
          where: {
              timestamp: { gte: sevenDaysAgo }
          },
          select: {
              timestamp: true,
              action: true
          }
      });

      // Group by Day and Action
      const activityMap: Record<string, { upload: number, login: number, other: number }> = {};
      
      // Init last 7 days
      for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(now.getDate() - i);
          const key = d.toISOString().split('T')[0];
          activityMap[key] = { upload: 0, login: 0, other: 0 };
      }

      recentActivity.forEach(log => {
          const key = new Date(log.timestamp).toISOString().split('T')[0];
          if (activityMap[key]) {
              if (log.action === 'UPLOAD') activityMap[key].upload++;
              else if (log.action === 'LOGIN') activityMap[key].login++;
              else activityMap[key].other++;
          }
      });

      const activityTrend = Object.entries(activityMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, counts]) => ({ date, ...counts }));


      // 3. User Growth
      const totalUsers = await prisma.user.count();
      const newUsersThisMonth = await prisma.user.count({
          where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }
      });

      // 4. Storage (Mock S3 Size if not in DB, assume avg 2MB per record)
      const estimatedStorageUsageBytes = totalRecords * 2 * 1024 * 1024; // 2MB avg

      return NextResponse.json({
          overview: {
              totalRecords,
              totalUsers,
              recordsPendingHeaders: recordCounts.find(c => c.status === 'READY_FOR_DISPO')?._count.id || 0,
              storageBytes: estimatedStorageUsageBytes,
              dbStatus: 'Online' // implicit success
          },
          recordDistribution: recordCounts.map(c => ({ name: c.status, value: c._count.id })),
          activityTrend
      });

  } catch (error: any) {
      console.error('Metrics Error:', error);
      return NextResponse.json({ error: 'Failed to generate metrics' }, { status: 500 });
  }
}
