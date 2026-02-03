import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import * as os from 'os';

interface RequestMetrics {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  contentLength: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
  timestamp: Date;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');
  private readonly slowRequestThreshold = 1000; // 1 second

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const startTime = Date.now();
    const startCpuUsage = process.cpuUsage();
    const startMemory = process.memoryUsage();

    const { method, originalUrl, ip, headers } = request;
    const userAgent = headers['user-agent'];
    const userId = (request as any).user?.sub;

    return next.handle().pipe(
      tap({
        next: (data) => {
          const elapsedTime = Date.now() - startTime;
          const endCpuUsage = process.cpuUsage(startCpuUsage);
          const endMemory = process.memoryUsage();

          const metrics: RequestMetrics = {
            method,
            url: originalUrl,
            statusCode: response.statusCode,
            responseTime: elapsedTime,
            contentLength: JSON.stringify(data).length,
            userAgent,
            ip,
            userId,
            timestamp: new Date(),
            memoryUsage: {
              rss: endMemory.rss - startMemory.rss,
              heapTotal: endMemory.heapTotal - startMemory.heapTotal,
              heapUsed: endMemory.heapUsed - startMemory.heapUsed,
              external: endMemory.external - startMemory.external,
              arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
            },
            cpuUsage: endCpuUsage,
          };

          // Log performance metrics
          this.logMetrics(metrics);

          // Alert on slow requests
          if (elapsedTime > this.slowRequestThreshold) {
            this.logger.warn(
              `⚠ Slow request detected: ${method} ${originalUrl} took ${elapsedTime}ms`,
            );
          }
        },
        error: (error) => {
          const elapsedTime = Date.now() - startTime;

          this.logger.error({
            method,
            url: originalUrl,
            statusCode: error.status || 500,
            responseTime: elapsedTime,
            error: error.message,
            stack: error.stack,
          });
        },
      }),
    );
  }

  private logMetrics(metrics: RequestMetrics): void {
    const { method, url, statusCode, responseTime } = metrics;

    // Color-coded log based on response time
    let logMessage = `${method} ${url} - ${statusCode} - `;

    if (responseTime < 100) {
      logMessage += `✓ ${responseTime}ms (fast)`;
      this.logger.log(logMessage);
    } else if (responseTime < 500) {
      logMessage += `• ${responseTime}ms (normal)`;
      this.logger.log(logMessage);
    } else if (responseTime < 1000) {
      logMessage += `◦ ${responseTime}ms (slow)`;
      this.logger.warn(logMessage);
    } else {
      logMessage += `✗ ${responseTime}ms (very slow)`;
      this.logger.error(logMessage);
    }

    // Log detailed metrics in verbose mode
    if (process.env.LOG_LEVEL === 'verbose') {
      this.logger.verbose({
        ...metrics,
        systemInfo: {
          loadAvg: os.loadavg(),
          freeMemory: os.freemem(),
          totalMemory: os.totalmem(),
          uptime: os.uptime(),
        },
      });
    }
  }
}