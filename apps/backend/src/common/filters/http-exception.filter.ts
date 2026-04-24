import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '@iox/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Une erreur inattendue est survenue';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.statusToCode(status);
      } else if (typeof exceptionResponse === 'object') {
        const exObj = exceptionResponse as Record<string, unknown>;
        message = (exObj.message as string) || message;
        code = (exObj.error as string) || this.statusToCode(status);
        details = exObj.message instanceof Array ? exObj.message : undefined;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${requestId ?? 'no-req-id'}] Erreur non gérée: ${exception.message}`,
        exception.stack,
      );
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: { code, message, details },
      requestId,
      timestamp: new Date().toISOString(),
    };

    this.logger.warn(
      `[${requestId ?? 'no-req-id'}] ${request.method} ${request.url} → ${status} ${code}`,
    );
    response.status(status).json(errorResponse);
  }

  private statusToCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return codes[status] || 'UNKNOWN_ERROR';
  }
}
