import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (e) {
      this.logger.warn(`Cache get failed for key: ${key}`, e);
      return undefined;
    }
  }

  async set(key: string, value: any, ttlMs: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttlMs);
    } catch (e) {
      this.logger.warn(`Cache set failed for key: ${key}`, e);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (e) {
      this.logger.warn(`Cache del failed for key: ${key}`, e);
    }
  }

  async delMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.del(key)));
  }

  /**
   * 캐시에서 조회하고, 없으면 factory 실행 후 캐싱
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const value = await factory();
    if (value !== undefined && value !== null) {
      await this.set(key, value, ttlMs);
    }
    return value;
  }
}
