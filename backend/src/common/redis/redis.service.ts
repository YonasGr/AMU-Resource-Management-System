import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  // In-memory fallback if Redis is unavailable (e.g. unit tests, local offline dev)
  private readonly memoryStore = new Map<string, { value: string; expiresAt: number }>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = Number(this.configService.get<number>('REDIS_PORT')) || 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;

    try {
      this.client = new Redis({
        host,
        port,
        password,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            return null; // stop retrying after 3 attempts, fallback to memory store
          }
          return Math.min(times * 100, 1000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Connected to Redis at ${host}:${port}`);
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection error (${err.message}); falling back to memory store`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      await this.client.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`Initial Redis connection failed (${err.message}); using memory fallback`);
      });
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`Failed to initialize Redis client (${err?.message}); using memory fallback`);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
    this.memoryStore.clear();
  }

  /** Check if Redis server connection is currently active */
  isRedisConnected(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  /** Get raw value by key */
  async get(key: string): Promise<string | null> {
    if (this.isRedisConnected()) {
      try {
        return await this.client!.get(key);
      } catch (err) {
        this.logger.warn(`Redis GET error for key ${key}, checking memory fallback`);
      }
    }

    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt > 0 && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  /** Set key-value with optional TTL in seconds */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isRedisConnected()) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client!.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client!.set(key, value);
        }
        return;
      } catch (err) {
        this.logger.warn(`Redis SET error for key ${key}, writing to memory fallback`);
      }
    }

    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : 0;
    this.memoryStore.set(key, { value, expiresAt });
  }

  /** Delete a key */
  async del(key: string): Promise<void> {
    if (this.isRedisConnected()) {
      try {
        await this.client!.del(key);
      } catch (err) {
        this.logger.warn(`Redis DEL error for key ${key}`);
      }
    }
    this.memoryStore.delete(key);
  }

  /** Increment integer value for key. Returns new counter value. */
  async incr(key: string): Promise<number> {
    if (this.isRedisConnected()) {
      try {
        return await this.client!.incr(key);
      } catch (err) {
        this.logger.warn(`Redis INCR error for key ${key}, falling back to memory`);
      }
    }

    const currentStr = await this.get(key);
    const count = (currentStr ? parseInt(currentStr, 10) : 0) + 1;
    const item = this.memoryStore.get(key);
    const expiresAt = item ? item.expiresAt : 0;
    this.memoryStore.set(key, { value: count.toString(), expiresAt });
    return count;
  }

  /** Set TTL expiration in seconds on key */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (this.isRedisConnected()) {
      try {
        await this.client!.expire(key, ttlSeconds);
        return;
      } catch (err) {
        this.logger.warn(`Redis EXPIRE error for key ${key}`);
      }
    }

    const item = this.memoryStore.get(key);
    if (item) {
      item.expiresAt = Date.now() + ttlSeconds * 1000;
      this.memoryStore.set(key, item);
    }
  }

  /** Get remaining TTL in seconds for key (-1 if no expire, -2 if not exists) */
  async ttl(key: string): Promise<number> {
    if (this.isRedisConnected()) {
      try {
        return await this.client!.ttl(key);
      } catch (err) {
        this.logger.warn(`Redis TTL error for key ${key}`);
      }
    }

    const item = this.memoryStore.get(key);
    if (!item) return -2;
    if (item.expiresAt === 0) return -1;
    const remainingMs = item.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.memoryStore.delete(key);
      return -2;
    }
    return Math.ceil(remainingMs / 1000);
  }

  /**
   * Records a failed attempt for a given key and sets the expiration window if first attempt.
   * Returns the new failure count.
   */
  async recordFailedAttempt(key: string, windowSeconds: number): Promise<number> {
    const count = await this.incr(key);
    if (count === 1) {
      await this.expire(key, windowSeconds);
    }
    return count;
  }

  /**
   * Resets attempts for a given key (e.g. after successful login).
   */
  async resetAttempts(key: string): Promise<void> {
    await this.del(key);
  }

  /**
   * Checks whether the given key is currently within rate limit.
   */
  async checkRateLimit(key: string, maxAttempts: number): Promise<RateLimitResult> {
    const currentVal = await this.get(key);
    const currentCount = currentVal ? parseInt(currentVal, 10) : 0;
    const remainingTtl = await this.ttl(key);
    const retryAfterSeconds = remainingTtl > 0 ? remainingTtl : 0;

    if (currentCount >= maxAttempts) {
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds,
      };
    }

    return {
      allowed: true,
      remainingAttempts: Math.max(0, maxAttempts - currentCount),
      retryAfterSeconds: 0,
    };
  }
}
