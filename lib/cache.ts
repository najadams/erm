import { redis, isRedisAvailable } from '@/lib/redis';

/**
 * Cache-aside pattern: Try Redis first, fall back to fetcher on miss.
 * Gracefully degrades — if Redis is unavailable, always runs fetcher.
 *
 * @param key - Redis key
 * @param ttlSeconds - Time-to-live in seconds
 * @param fetcher - Function to compute the value on cache miss
 */
export async function cacheAside<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const available = await isRedisAvailable();
    if (!available) return fetcher();

    // Try cache hit
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // Cache miss — compute and store
    const value = await fetcher();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
    return value;
  } catch (err) {
    // If Redis fails mid-operation, fall back to direct computation
    console.warn(`[Cache] Error for key "${key}", falling back:`, (err as Error).message);
    return fetcher();
  }
}

/**
 * Invalidate a specific cache key.
 */
export async function invalidateCache(key: string): Promise<void> {
  try {
    const available = await isRedisAvailable();
    if (available) {
      await redis.del(key);
    }
  } catch (err) {
    console.warn(`[Cache] Failed to invalidate "${key}":`, (err as Error).message);
  }
}

/**
 * Invalidate all keys matching a pattern (e.g., "acs:*" or "record:*").
 * Uses SCAN to avoid blocking Redis.
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  try {
    const available = await isRedisAvailable();
    if (!available) return 0;

    let cursor = '0';
    let deleted = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== '0');

    return deleted;
  } catch (err) {
    console.warn(`[Cache] Failed to invalidate pattern "${pattern}":`, (err as Error).message);
    return 0;
  }
}

// ---- Cache Key Helpers ----

export const CacheKeys = {
  acs: (userId: string) => `acs:${userId}`,
  record: (recordId: string) => `record:${recordId}`,
  stats: () => `stats:dashboard`,
  visibleRecords: (userId: string) => `visible:${userId}`,
};

export const CacheTTL = {
  ACS: 600,        // 10 minutes
  RECORD: 300,     // 5 minutes
  STATS: 120,      // 2 minutes
  VISIBLE: 900,    // 15 minutes
};
