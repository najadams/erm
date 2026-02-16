import Redis from 'ioredis';

const redisClientSingleton = () => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      // Exponential backoff: 50ms, 100ms, 200ms... max 2s
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    // Graceful degradation: if Redis is down, don't crash the app
    enableOfflineQueue: false,
    lazyConnect: true, // Don't connect until first command
  });

  client.on('error', (err) => {
    console.warn('[Redis] Connection error (degrading gracefully):', err.message);
  });

  client.on('connect', () => {
    console.log('[Redis] Connected');
  });

  return client;
};

declare global {
  var redisGlobal: undefined | ReturnType<typeof redisClientSingleton>;
}

const redis = globalThis.redisGlobal ?? redisClientSingleton();

export { redis };

if (process.env.NODE_ENV !== 'production') globalThis.redisGlobal = redis;

/**
 * Check if Redis is available. Returns false if connection failed.
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
