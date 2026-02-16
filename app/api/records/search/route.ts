import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccessibleRecordsClause } from '@/lib/access';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  const classificationNodeId = searchParams.get('classificationNodeId');
  
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  // Permission Check
  const accessClause = await getAccessibleRecordsClause((session.user as any).id);
  // If accessClause is "nothing" (conceptually), our helper usually returns a query that returns no results or throws, 
  // but looking at usage in records/route.ts, it returns an object.
  // We'll treat it as standard WHERE input. 

  try {
    let ftsIds: string[] = [];

    // 1. Try High-Performance FTS first
    try {
        const ftsResults: any[] = await prisma.$queryRaw`
            SELECT id FROM "Record"
            WHERE search_vector @@ plainto_tsquery('english', ${q})
            LIMIT 50
        `;
        ftsIds = ftsResults.map(r => r.id);
    } catch (e) {
        console.warn('FTS Query Failed (db might not support vector yet):', e);
    }

    // 2. Build Filter
    const whereCondition: any = {
        AND: [
            accessClause,
            { status: 'REGISTERED' },
            ...(classificationNodeId ? [{ classificationNodeId }] : [])
        ]
    };

    if (ftsIds.length > 0) {
        // MATCH FOUND via FTS
        whereCondition.AND.push({ id: { in: ftsIds } });
    } else {
        // FALLBACK: ILIKE on Title & Ref (Slower but reliable for partial words if FTS fails)
        whereCondition.AND.push({
            OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { referenceNumber: { contains: q, mode: 'insensitive' } }
            ]
        });
    }

    const records = await prisma.record.findMany({
      where: whereCondition,
      select: {
        id: true,
        title: true,
        referenceNumber: true,
        createdAt: true,
        status: true,
        classificationNode: {
            select: { name: true, code: true }
        },
        versionNumber: true,
        isLatest: true
      },
      take: 20,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(records);
  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
