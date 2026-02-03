import { Module, Global, Logger } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const logger = new Logger('CacheModule');

        if (redisUrl) {
          try {
            const store = await redisStore({ url: redisUrl });
            logger.log('Redis cache connected');
            return { store, ttl: 300000 }; // default 5분
          } catch (e) {
            logger.warn('Redis connection failed, falling back to in-memory cache');
          }
        }

        logger.log('Using in-memory cache');
        return { ttl: 300000 };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class AppCacheModule {}
