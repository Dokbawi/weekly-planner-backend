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

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const startTime = Date.now();

    const { method, originalUrl, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';

    // Log request
    this.logger.log(
      `→ ${method} ${originalUrl} - ${ip} - ${userAgent}`,
    );

    return next
      .handle()
      .pipe(
        tap({
          next: (data) => {
            const elapsedTime = Date.now() - startTime;
            const { statusCode } = response;

            // Determine log level based on status code
            const logLevel = statusCode >= 400 ? 'warn' : 'log';

            this.logger[logLevel](
              `← ${method} ${originalUrl} - ${statusCode} - ${elapsedTime}ms`,
            );

            // Log detailed information for debugging
            if (process.env.NODE_ENV === 'development') {
              this.logger.verbose({
                request: {
                  method,
                  url: originalUrl,
                  headers: headers,
                  body: request.body,
                  query: request.query,
                  params: request.params,
                },
                response: {
                  statusCode,
                  responseTime: `${elapsedTime}ms`,
                  size: JSON.stringify(data).length,
                },
              });
            }
          },
          error: (error) => {
            const elapsedTime = Date.now() - startTime;

            this.logger.error(
              `✗ ${method} ${originalUrl} - ${error.status || 500} - ${elapsedTime}ms - ${error.message}`,
            );
          },
        }),
      );
  }
}