import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

/**
 * MetricsInterceptor — instrumente chaque requête HTTP entrante :
 *   - `iox_http_requests_total{method,status,route}` : compteur
 *   - `iox_http_duration_seconds{method,route}`     : histogramme latence
 *
 * Le champ `route` utilise le pattern Nest (`/api/v1/auth/login`, pas l'URL
 * finale avec params), pour éviter une explosion cardinale.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();
    const start = process.hrtime.bigint();
    const route = this.extractRoute(req);
    const method = req.method;

    return next.handle().pipe(
      tap({
        next: () => this.record(start, method, String(res.statusCode), route),
        error: () => this.record(start, method, String(res.statusCode || 500), route),
      }),
    );
  }

  private record(start: bigint, method: string, status: string, route: string) {
    const elapsedSec = Number(process.hrtime.bigint() - start) / 1e9;
    this.metrics.incCounter('iox_http_requests_total', { method, status, route });
    this.metrics.observeHistogram('iox_http_duration_seconds', elapsedSec, { method, route });
  }

  private extractRoute(req: Request): string {
    const route = (req as Request & { route?: { path?: string } }).route?.path;
    if (route) return route;
    // Fallback : on strip les IDs numériques/uuid pour limiter la cardinalité.
    return (req.path || '/')
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+(?=\/|$)/g, '/:id');
  }
}
