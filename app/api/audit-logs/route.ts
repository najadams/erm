import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';
import { ROLES, hasPermission } from '@/lib/permissions';

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
    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get('scope'); // 'user' or undefined
    const limit = parseInt(searchParams.get('limit') || '50');

    // Security & Scope Logic using Matrix
    const whereClause: any = {};
    const canViewFull = hasPermission(role, 'AUDIT_VIEW_FULL');
    const canViewScoped = hasPermission(role, 'AUDIT_VIEW_SCOPED'); // Dept scope placeholder
    
    // 1. If explicitly requesting "my activity" -> Strictly filter by actor
    if (scope === 'user') {
        whereClause.userId = userId;
    } else {
        // 2. If NO specific scope requested, enforce permissions
        if (canViewFull) {
            // Allow all - no filter
        } else if (canViewScoped) {
             // TODO: Add Department filtering here when Dept ID available on User
             // For now, if scoped view allowed but not full, maybe limit to something or fall back to own
             // Safest fallback for now until Dept implemented:
             whereClause.userId = userId; 
        } else {
             // Default: Force Own View
             whereClause.userId = userId;
        }
    }

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
      take: limit
    });

    return NextResponse.json(auditLogs);

  } catch (error) {
    console.error('Audit Logs Error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
