
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
      const policies = await prisma.retentionPolicy.findMany({
          orderBy: { name: 'asc' }
      });
      return NextResponse.json(policies);
  } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userRole = (session.user as any).role;
    if (userRole !== ROLES.ADMIN && userRole !== ROLES.RECORDS_OFFICER) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { name, description, durationYears } = body;

        if (!name || durationYears === undefined) {
             return NextResponse.json({ error: 'Name and Duration are required' }, { status: 400 });
        }

        const policy = await prisma.retentionPolicy.create({
            data: {
                name,
                description,
                durationYears: parseInt(durationYears),
                trigger: 'CREATION_DATE' // Default support for now
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'RETENTION_POLICY_CREATED',
                userId: (session.user as any).id,
                actorRole: userRole,
                source: 'API',
                newValue: JSON.stringify(policy)
            }
        });

        return NextResponse.json(policy);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
