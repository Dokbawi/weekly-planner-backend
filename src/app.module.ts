import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PlanModule } from './plan/plan.module';
import { ChangelogModule } from './changelog/changelog.module';
import { NotificationModule } from './notification/notification.module';
import { ReviewModule } from './review/review.module';
import { LoggerModule } from './changelog/common/logger/logger.module';
import { MorganMiddleware } from './changelog/common/middleware/morgan.middleware';
import { HealthModule } from './health/health.module';
import { CommuteRoutineModule } from './commute-routine/commute-routine.module';
import { TemplateModule } from './template/template.module';
import { AppCacheModule } from './changelog/common/cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/weekly_planner',
        ),
        // 커넥션 풀 최적화 (동시 접속 처리 향상)
        maxPoolSize: 50, // 최대 커넥션 수 (기본값 10)
        minPoolSize: 5, // 최소 커넥션 수 (워밍업)
        maxIdleTimeMS: 30000, // 유휴 커넥션 정리 (30초)
        serverSelectionTimeoutMS: 5000, // 서버 선택 타임아웃
        socketTimeoutMS: 45000, // 소켓 타임아웃
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AppCacheModule,
    LoggerModule,
    HealthModule,
    AuthModule,
    UserModule,
    PlanModule,
    ChangelogModule,
    NotificationModule,
    ReviewModule,
    CommuteRoutineModule,
    TemplateModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MorganMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
