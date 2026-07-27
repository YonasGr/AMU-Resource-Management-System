import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Converts every thrown error into a consistent JSON error shape:
 * { statusCode, message, error, path, timestamp }
 * so the frontend never has to guess the error format module-by-module.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? (exception as HttpException).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttp ? (exception as HttpException).getResponse() : null;

    const message =
      isHttp && typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).message ?? (exception as HttpException).message
        : (exception as Error)?.message ?? 'Internal server error';

    if (!isHttp) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: isHttp ? (exception as HttpException).name : 'InternalServerError',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
