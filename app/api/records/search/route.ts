/**
 * RECORDS SEARCH API
 *
 * GET /api/records/search?q=...&classificationNodeId=...&status=...&sector=...
 *
 * Uses Meilisearch for instant, typo-tolerant search with faceted filtering.
 * Falls back to PostgreSQL FTS if Meilisearch is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccessibleRecordsClause } from '@/lib/access';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { searchRecords, isMeiliAvailable } from '@/lib/search';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  const classificationNodeId = searchParams.get('classificationNodeId');
  const status = searchParams.get('status');
  const departmentId = searchParams.get('departmentId');
  const registeredCompanyId = searchParams.get('registeredCompanyId');
  const sector = searchParams.get('sector');
  
  if (!q || q.length < 2) {
    return NextResponse.json({ hits: [], totalHits: 0 });
  }

  const userId = (session.user as any).id;

  try {
    // =========================================================================
    // STRATEGY 1: Meilisearch (preferred)
    // =========================================================================
    if (isMeiliAvailable()) {
      // Get accessible record IDs for ACS intersection
      const accessClause = await getAccessibleRecordsClause(userId);
      const accessibleRecords = await prisma.record.findMany({
        where: accessClause,
        select: { id: true },
        take: 5000,
      });
      const accessibleIds = accessibleRecords.map(r => r.id);

      const meiliResult = await searchRecords(q, {
        status: status || undefined,
        departmentId: departmentId || undefined,
        classificationNodeId: classificationNodeId || undefined,
        registeredCompanyId: registeredCompanyId || undefined,
        sector: sector || undefined,
        accessibleIds,
      }, {
        limit: 20,
      });

      if (meiliResult) {
        // Fetch full records for the hit IDs
        const hitIds = meiliResult.hits.map(h => h.id);

        const records = await prisma.record.findMany({
          where: { id: { in: hitIds } },
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
            isLatest: true,
          },
        });

        // Preserve Meilisearch relevance order
        const recordMap = new Map(records.map(r => [r.id, r]));
        const orderedRecords = hitIds
          .map(id => recordMap.get(id))
          .filter(Boolean);

        return NextResponse.json({
          records: orderedRecords,
          totalHits: meiliResult.totalHits,
          facets: meiliResult.facetDistribution,
          searchTimeMs: meiliResult.processingTimeMs,
          engine: 'meilisearch',
        });
      }
    }

    // =========================================================================
    // STRATEGY 2: PostgreSQL FTS fallback
    // =========================================================================
    const accessClause = await getAccessibleRecordsClause(userId);

    let ftsIds: string[] = [];

    try {
      const ftsResults: any[] = await prisma.$queryRaw`
        SELECT id FROM "Record"
        WHERE search_vector @@ plainto_tsquery('english', ${q})
        LIMIT 50
      `;
      ftsIds = ftsResults.map(r => r.id);
    } catch (e) {
      console.warn('FTS Query Failed:', e);
    }

    const whereCondition: any = {
      AND: [
        accessClause,
        { status: status || 'REGISTERED' },
        ...(classificationNodeId ? [{ classificationNodeId }] : [])
      ]
    };

    if (ftsIds.length > 0) {
      whereCondition.AND.push({ id: { in: ftsIds } });
    } else {
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

    return NextResponse.json({
      records,
      totalHits: records.length,
      engine: 'postgresql-fts',
    });
  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
