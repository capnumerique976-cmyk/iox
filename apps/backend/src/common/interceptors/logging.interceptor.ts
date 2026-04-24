import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';

/**
 * Journalise chaque requête HTTP : méthode, chemin, status, durée, request-id,
 * utilisateur si authentifié. Format JSON-parseable pour ingestion dans un
 * pipeline d'observabilité (Loki, Datadog, etc.).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { requestId?: string; user?: { id?: string } }>();
    const res = http.getResponse<Response>();
    const started = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - started;
        this.logger.log(
          JSON.stringify({
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl ?? req.url,
            status: res.statusCode,
            durationMs,
            userId: req.user?.id ?? null,
          }),
        );
      }),
      catchError((err) => {
        const durationMs = Date.now() - started;
        this.logger.error(
          JSON.stringify({
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl ?? req.url,
            status: err?.status ?? 500,
            durationMs,
            userId: req.user?.id ?? null,
            error: err?.message,
          }),
        );
        return throwError(() => err);
      }),
    );
  }
}
