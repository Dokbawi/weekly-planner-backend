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
import { LoggerModule } from './common/logger/logger.module';
import { MorganMiddleware } from './common/middleware/morgan.middleware';

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
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    LoggerModule,
    AuthModule,
    UserModule,
    PlanModule,
    ChangelogModule,
    NotificationModule,
    ReviewModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MorganMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
