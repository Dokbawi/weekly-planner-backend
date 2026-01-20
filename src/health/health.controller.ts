import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check() {
    const dbState = this.connection.readyState;
    const isDbHealthy = dbState === 1;

    return {
      status: isDbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: isDbHealthy ? 'up' : 'down',
          responseTime: await this.checkDbLatency(),
        },
      },
    };
  }

  @Public()
  @Get('health/live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  live() {
    return { status: 'ok' };
  }

  @Public()
  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready() {
    const dbState = this.connection.readyState;
    if (dbState !== 1) {
      return { status: 'not ready', reason: 'database not connected' };
    }
    return { status: 'ready' };
  }

  private async checkDbLatency(): Promise<number> {
    const start = Date.now();
    try {
      await this.connection.db?.admin().ping();
      return Date.now() - start;
    } catch {
      return -1;
    }
  }
}
