import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as morgan from 'morgan';
import { logger } from '../config/winston.config';

// Extend Request interface to include startTime
interface RequestWithStartTime extends Request {
  startTime?: number;
}

// Custom token for response time in milliseconds
morgan.token('response-time-ms', (req: RequestWithStartTime, res: Response) => {
  if (!req.startTime) return '0';
  const elapsedTime = Date.now() - req.startTime;
  return elapsedTime.toString();
});

// Custom token for request body (be careful with sensitive data)
morgan.token('body', (req: Request) => {
  // Filter out sensitive fields
  if (req.body) {
    const body = { ...req.body };
    if (body.password) body.password = '[REDACTED]';
    if (body.token) body.token = '[REDACTED]';
    return JSON.stringify(body);
  }
  return '-';
});

// Custom token for user ID if authenticated
morgan.token('user-id', (req: any) => {
  return req.user?.sub || '-';
});

// Development format: detailed and colorful
const devFormat = ':method :url :status :response-time-ms ms - :res[content-length]';

// Production format: JSON structured logs
const prodFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time-ms',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  ip: ':remote-addr',
  userId: ':user-id',
  timestamp: ':date[iso]',
});

@Injectable()
export class MorganMiddleware implements NestMiddleware {
  private morganHandler: any;

  constructor() {
    const format = process.env.NODE_ENV === 'production' ? prodFormat : devFormat;

    // Configure morgan with winston stream
    this.morganHandler = morgan(format, {
      stream: {
        write: (message: string) => {
          // Remove newline character
          const log = message.trim();

          if (process.env.NODE_ENV === 'production') {
            try {
              const parsedLog = JSON.parse(log);
              logger.info('HTTP Request', parsedLog);
            } catch {
              logger.info(log);
            }
          } else {
            // In development, use console with colors
            console.log(`[Morgan] ${log}`);
          }
        },
      },
      skip: (req: Request) => {
        // Skip health check endpoints or other routes you want to ignore
        return req.url === '/health' || req.url === '/metrics';
      },
    });
  }

  use(req: RequestWithStartTime, res: Response, next: NextFunction) {
    // Add start time for response time calculation
    req.startTime = Date.now();
    this.morganHandler(req, res, next);
  }
}