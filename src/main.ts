import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './changelog/common/filters/http-exception.filter';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './changelog/common/config/winston.config';
import { LoggingInterceptor } from './changelog/common/interceptors/logging.interceptor';
import { PerformanceInterceptor } from './changelog/common/interceptors/performance.interceptor';

async function bootstrap() {
  // Create app with Winston logger
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  const logger = new Logger('Bootstrap');

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors();

  // Global interceptors for logging and performance monitoring
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new PerformanceInterceptor(),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Weekly Planner API')
    .setDescription('REST API for Weekly Planner Application')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 8080;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger UI: http://localhost:${port}/api-docs`);
  logger.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`📊 Log Level: ${process.env.LOG_LEVEL || 'info'}`);
}

bootstrap().catch(err => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
