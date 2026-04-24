import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Attache un identifiant unique à chaque requête entrante (récupère l'en-tête
 * `x-request-id` si fourni par un reverse-proxy, sinon génère un UUIDv4).
 * Exposé sur la réponse pour corrélation côté client / traces distribuées.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
