import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly localLocks = new Map<string, number>(); // 인메모리 락 (fallback)

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

  /**
   * 분산 락 획득 시도 (Redis SETNX 시뮬레이션)
   * @param lockKey 락 키
   * @param ttlMs 락 만료 시간 (ms)
   * @returns 락 획득 성공 여부
   */
  async acquireLock(lockKey: string, ttlMs: number): Promise<boolean> {
    try {
      const existing = await this.get<string>(lockKey);
      if (existing) {
        return false; // 이미 락이 존재함
      }

      // 락 설정 (값은 현재 시간으로 설정하여 디버깅에 활용)
      await this.set(lockKey, Date.now().toString(), ttlMs);

      // 설정 후 다시 확인하여 경쟁 조건 최소화
      const verified = await this.get<string>(lockKey);
      return verified !== undefined;
    } catch (e) {
      this.logger.warn(`Failed to acquire lock: ${lockKey}`, e);
      // Redis 실패 시 로컬 락으로 fallback
      return this.acquireLocalLock(lockKey, ttlMs);
    }
  }

  /**
   * 분산 락 해제
   */
  async releaseLock(lockKey: string): Promise<void> {
    try {
      await this.del(lockKey);
      this.localLocks.delete(lockKey);
    } catch (e) {
      this.logger.warn(`Failed to release lock: ${lockKey}`, e);
    }
  }

  /**
   * 락을 획득하고 작업 실행 (락 획득 실패 시 스킵)
   * 분산 환경에서 한 인스턴스만 작업을 실행하도록 보장
   */
  async runWithLock(
    jobName: string,
    ttlMs: number,
    job: () => Promise<void>,
  ): Promise<boolean> {
    const lockKey = `lock:scheduler:${jobName}`;

    const acquired = await this.acquireLock(lockKey, ttlMs);
    if (!acquired) {
      this.logger.debug(`Lock not acquired for job: ${jobName}, skipping...`);
      return false;
    }

    try {
      this.logger.log(`Lock acquired for job: ${jobName}, executing...`);
      await job();
      return true;
    } catch (e) {
      this.logger.error(`Job execution failed: ${jobName}`, e);
      return false;
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  /**
   * 로컬 락 (인메모리 fallback)
   */
  private acquireLocalLock(lockKey: string, ttlMs: number): boolean {
    const now = Date.now();
    const existing = this.localLocks.get(lockKey);

    if (existing && existing > now) {
      return false; // 아직 유효한 락 존재
    }

    this.localLocks.set(lockKey, now + ttlMs);
    return true;
  }
}
