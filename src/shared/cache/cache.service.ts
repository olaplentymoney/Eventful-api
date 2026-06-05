import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

export class CacheService {
  private readonly defaultTtl: number;

  constructor() {
    this.defaultTtl = env.REDIS_TTL;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (err) {
      logger.error('Cache get error', { key, error: err });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const effectiveTtl = ttl ?? this.defaultTtl;
      await redis.setex(key, effectiveTtl, serialized);
    } catch (err) {
      logger.error('Cache set error', { key, error: err });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (err) {
      logger.error('Cache del error', { key, error: err });
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      logger.error('Cache delByPattern error', { pattern, error: err });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (err) {
      logger.error('Cache exists error', { key, error: err });
      return false;
    }
  }

  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await fetcher();
    await this.set(key, fresh, ttl);
    return fresh;
  }
}

export const cacheService = new CacheService();
