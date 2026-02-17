import { Inject } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

/**
 * 분산 락 데코레이터
 * 여러 인스턴스에서 동시에 실행되는 것을 방지 (스케줄러 중복 실행 방지용)
 *
 * @param lockName 락 이름 (고유해야 함)
 * @param ttlMs 락 만료 시간 (ms) - 작업 시간보다 충분히 길게 설정
 *
 * @example
 * ```typescript
 * @Cron('0 0 8 * * *')
 * @WithDistributedLock('sendDailySummary', 300000)
 * async sendDailySummary() {
 *   // 한 인스턴스에서만 실행됨
 * }
 * ```
 */
export function WithDistributedLock(lockName: string, ttlMs: number) {
  const injectCacheService = Inject(CacheService);

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // CacheService 주입
    injectCacheService(target, 'cacheService');

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService: CacheService = (this as any).cacheService;

      if (!cacheService) {
        // CacheService가 없으면 그냥 실행 (테스트 환경 등)
        return originalMethod.apply(this, args);
      }

      const executed = await cacheService.runWithLock(lockName, ttlMs, async () => {
        await originalMethod.apply(this, args);
      });

      return executed;
    };

    return descriptor;
  };
}
