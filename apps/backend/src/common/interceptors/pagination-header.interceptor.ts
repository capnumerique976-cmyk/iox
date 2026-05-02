import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

/**
 * PaginationHeaderInterceptor — LOT-D
 *
 * Injects `X-Total-Count` and `X-Total-Pages` response headers when the
 * response body contains a `meta.total` property (paginated responses).
 * Also exposes those headers via `Access-Control-Expose-Headers` so
 * browser JS can read them.
 */
@Injectable()
export class PaginationHeaderInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap((body) => {
        if (!body || typeof body !== 'object') return;

        const meta = (body as Record<string, unknown>).meta;
        if (!meta || typeof meta !== 'object') return;

        const { total, totalPages } = meta as Record<string, unknown>;
        if (typeof total !== 'number') return;

        const res = context.switchToHttp().getResponse<Response>();
        res.setHeader('X-Total-Count', String(total));
        if (typeof totalPages === 'number') {
          res.setHeader('X-Total-Pages', String(totalPages));
        }
        res.setHeader(
          'Access-Control-Expose-Headers',
          'X-Total-Count, X-Total-Pages',
        );
      }),
    );
  }
}
