/**
 * ADMIN SEARCH ENDPOINT
 *
 * POST /api/admin/search — Trigger full reindex
 * GET  /api/admin/search — Get index stats
 *
 * Admin-only. Used for initial indexing and maintenance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fullReindex } from '@/lib/search-sync';
import { MeiliSearch } from 'meilisearch';

export const dynamic = 'force-dynamic';

/**
 * GET — Index statistics
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const url = process.env.MEILI_URL;
  if (!url) {
    return NextResponse.json({ error: 'MEILI_URL not configured' }, { status: 503 });
  }

  try {
    const client = new MeiliSearch({
      host: url,
      apiKey: process.env.MEILI_MASTER_KEY,
    });

    const health = await client.health();
    const index = client.index('records');

    let stats;
    try {
      stats = await index.getStats();
    } catch {
      stats = { numberOfDocuments: 0, isIndexing: false };
    }

    return NextResponse.json({
      status: health.status,
      index: {
        name: 'records',
        numberOfDocuments: stats.numberOfDocuments,
        isIndexing: stats.isIndexing,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'unavailable',
      error: err.message,
    }, { status: 503 });
  }
}

/**
 * POST — Trigger full reindex
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const result = await fullReindex();

    return NextResponse.json({
      success: true,
      indexed: result.indexed,
      timeMs: result.timeMs,
      message: `Indexed ${result.indexed} records in ${result.timeMs}ms`,
    });
  } catch (err: any) {
    console.error('[Admin Search] Reindex failed:', err);
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
