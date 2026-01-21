
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ROLES } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
      const holds = await prisma.legalHold.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
              _count: {
                  select: { records: true }
              },
              owner: {
                  select: { name: true, email: true }
              }
          }
      });
      return NextResponse.json(holds);
  } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Only Authorized roles can create holds
    const userRole = (session.user as any).role;
    if (userRole !== ROLES.ADMIN && userRole !== ROLES.RECORDS_OFFICER) {
         return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { 
            name, caseReference, description, 
            ownerId, startDate, endDate, 
            status, notificationRecipients, notes 
        } = body;

        if (!name || !description) {
             return NextResponse.json({ error: 'Name and Description are required' }, { status: 400 });
        }

        const hold = await prisma.legalHold.create({
            data: {
                name,
                caseReference,
                description,
                ownerId: ownerId || (session.user as any).id, // Default to creator if not specified
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : null,
                status: status || 'ACTIVE',
                notificationRecipients,
                notes
            }
        });

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
