import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { createHash } from 'crypto';
import { Request, Response } from 'express';

/**
 * ETagInterceptor — LOT-J
 *
 * Generates a weak ETag from the response body hash on GET requests.
 * If the client sends `If-None-Match` matching the current ETag,
 * returns 304 Not Modified with no body (bandwidth saving).
 *
 * Applied globally but only acts on GET methods.
 */
@Injectable()
export class ETagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();

    // Only compute ETag for GET requests
    if (req.method !== 'GET') {
      return next.handle();
    }

    return next.handle().pipe(
      map((body) => {
        if (body === null || body === undefined) return body;

        const res = context.switchToHttp().getResponse<Response>();
        const json = JSON.stringify(body);
        const hash = createHash('md5').update(json).digest('hex').slice(0, 16);
        const etag = `W/"${hash}"`;

        res.setHeader('ETag', etag);

        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === etag) {
          res.status(304);
          return undefined;
        }

        return body;
      }),
    );
  }
}
