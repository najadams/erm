
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ROLES, hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // List Holds
  try {
      const holds = await prisma.legalHold.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
              _count: { select: { records: true } }
          }
      });
      
      const formatted = holds.map(h => ({
          ...h,
          recordCount: h._count.records
      }));

      return NextResponse.json(formatted);
  } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Check Permission (Admin or Records Officer)
    const userRole = (session.user as any).role;
    if (userRole !== ROLES.ADMIN && userRole !== ROLES.RECORDS_OFFICER) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { name, description } = body;

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const hold = await prisma.legalHold.create({
            data: {
                name,
                description,
                status: 'ACTIVE'
            }
        });

        // Audit
        await prisma.auditLog.create({
            data: {
                action: 'LEGAL_HOLD_CREATED',
                userId: (session.user as any).id,
                actorRole: userRole,
                source: 'API',
                newValue: JSON.stringify(hold)
            }
        });

        return NextResponse.json(hold);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
