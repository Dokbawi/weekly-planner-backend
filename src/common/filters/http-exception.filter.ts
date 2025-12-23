import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../dto/api-response.dto';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'GEN002';
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        code = (resp.code as string) || this.getDefaultCode(status);
        message =
          (resp.message as string) ||
          (Array.isArray(resp.message)
            ? resp.message.join(', ')
            : exception.message);
      } else {
        message = exception.message;
        code = this.getDefaultCode(status);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json(ApiResponse.fail(code, message));
  }

  private getDefaultCode(status: number): string {
    switch (status) {
      case 400:
        return 'GEN001';
      case 401:
        return 'AUTH004';
      case 403:
        return 'AUTH004';
      case 404:
        return 'NOT_FOUND';
      default:
        return 'GEN002';
    }
  }
}
