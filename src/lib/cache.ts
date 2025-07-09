import { createClient } from 'redis';

let redis: any = null;

export async function getRedisClient() {
  if (!redis) {
    redis = createClient({
      url: process.env.REDIS_URL
    });
    
    redis.on('error', (err: any) => console.log('Redis Client Error', err));
    await redis.connect();
  }
  
  return redis;
}

export async function getCachedResult(key: string): Promise<any | null> {
  try {
    const client = await getRedisClient();
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Erreur cache lecture:', error);
    return null;
  }
}

export async function setCachedResult(key: string, data: any, ttlSeconds = 2592000): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.setEx(key, ttlSeconds, JSON.stringify(data));
  } catch (error) {
    console.error('Erreur cache écriture:', error);
  }
}

export function generateCacheKey(product: string, location: string, urls?: string[]): string {
  const urlsKey = urls ? urls.sort().join(',') : '';
  return `prospect:${product.toLowerCase()}:${location.toLowerCase()}:${urlsKey}`;
}