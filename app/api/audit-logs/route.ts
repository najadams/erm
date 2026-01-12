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
    
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Security & Scope Logic using Matrix
    let whereClause: any = {};
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
             // Safest fallback for now until Dept implemented:
             whereClause.userId = userId; 
        } else {
             // Default: Force Own View
             whereClause.userId = userId;
        }
    }

    // 3. Apply Filters
    if (action) {
        whereClause.action = action;
    }

    if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) whereClause.timestamp.gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            whereClause.timestamp.lte = end;
        }
    }

    if (search) {
        whereClause.OR = [
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { record: { title: { contains: search, mode: 'insensitive' } } },
            { action: { contains: search, mode: 'insensitive' } }
        ];
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
