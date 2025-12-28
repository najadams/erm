import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ROLES } from '@/lib/permissions';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== ROLES.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
      const keys = await prisma.apiKey.findMany({
          orderBy: { createdAt: 'desc' },
          select: {
              id: true,
              name: true,
              prefix: true,
              createdAt: true,
              lastUsedAt: true,
              isActive: true
          }
      });
      return NextResponse.json(keys);
  } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== ROLES.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { name } = body;

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        // Generate Key
        const rawKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const prefix = rawKey.substring(0, 10) + '...';

        const apiKey = await prisma.apiKey.create({
            data: {
                name,
                keyHash,
                prefix,
                createdByUserId: (session.user as any).id,
                isActive: true
            }
        });

        // Audit
        await prisma.auditLog.create({
            data: {
                action: 'API_KEY_CREATED',
                userId: (session.user as any).id,
                actorRole: ROLES.ADMIN,
                source: 'API',
                newValue: JSON.stringify({ name, prefix })
            }
        });

        // Return raw key ONLY NOW
        return NextResponse.json({ ...apiKey, rawKey });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
