import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis, isRedisAvailable } from '@/lib/redis';

export const dynamic = 'force-dynamic';

/**
 * Health Check Endpoint
 *
 * GET /api/health
 *
 * Returns the status of all backing services.
 * Used by Docker HEALTHCHECK and monitoring tools.
 */
export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};
  let allHealthy = true;

  // --- PostgreSQL ---
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    checks.postgres = { status: 'error' };
    allHealthy = false;
  }

  // --- Redis ---
  try {
    const available = await isRedisAvailable();
    if (available) {
      const start = Date.now();
      await redis.ping();
      checks.redis = { status: 'ok', latencyMs: Date.now() - start };
    } else {
      checks.redis = { status: 'unavailable' };
      // Redis is optional — don't mark unhealthy
    }
  } catch (err) {
    checks.redis = { status: 'error' };
    // Redis is optional — warn but don't mark unhealthy
  }

  // --- Meilisearch ---
  if (process.env.MEILI_URL) {
    try {
      const start = Date.now();
      const res = await fetch(`${process.env.MEILI_URL}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      checks.meilisearch = {
        status: res.ok ? 'ok' : 'error',
        latencyMs: Date.now() - start,
      };
      if (!res.ok) allHealthy = false;
    } catch (err) {
      checks.meilisearch = { status: 'unavailable' };
      // Meilisearch is optional (FTS fallback exists)
    }
  }

  return NextResponse.json(
    {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
