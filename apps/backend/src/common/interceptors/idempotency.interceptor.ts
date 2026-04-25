import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { Observable, from, of, switchMap, tap, catchError, throwError } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import { SKIP_IDEMPOTENCY_KEY } from '../decorators/skip-idempotency.decorator';

/**
 * Idempotency tokens (L9-3).
 *
 * Si la requête entrante porte un header `Idempotency-Key` valide ET utilise
 * une méthode mutante (POST/PATCH/PUT), on persiste la réponse 2xx dans la
 * table `IdempotencyKey` indexée par la clé. Une seconde requête avec la
 * même clé :
 *   - même hash de body  → renvoyée depuis le cache (status + body)
 *   - hash différent     → 422 (réutilisation incorrecte de la clé)
 *
 * En course concurrente (deux requêtes simultanées avec la même clé), la
 * 2e voit un P2002 sur le `create` et reçoit 409 (le client doit retry).
 *
 * Hors scope :
 *   - Pas de cleanup automatique des clés expirées (cron à venir L9-5+).
 *   - Pas de cache des réponses non-2xx.
 *   - Pas de support pour les flux streaming.
 *
 * Le décorateur `@SkipIdempotency()` désactive l'interceptor sur un handler.
 */

const KEY_REGEX = /^[A-Za-z0-9_-]{16,128}$/;
const TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT']);

interface CachedResponse {
  status: number;
  body: unknown;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Idempotency');

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<
      Request & { user?: { id?: string }; idempotencyReplay?: boolean }
    >();
    const res = http.getResponse<Response>();

    // Bypass : non-HTTP, méthode non mutante, opt-out explicite
    if (context.getType() !== 'http') return next.handle();
    if (!MUTATING_METHODS.has(req.method)) return next.handle();

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_IDEMPOTENCY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

    const rawKey = req.header('Idempotency-Key') ?? req.header('idempotency-key');
    if (!rawKey) return next.handle();

    if (!KEY_REGEX.test(rawKey)) {
      throw new UnprocessableEntityException({
        code: 'IDEMPOTENCY_KEY_INVALID',
        message:
          'Idempotency-Key invalide. Format attendu : 16–128 caractères [A-Za-z0-9_-].',
      });
    }

    const key = rawKey;
    const method = req.method;
    const path = req.originalUrl ?? req.url;
    const requestHash = hashRequest(method, path, req.body);
    const userId = req.user?.id ?? null;

    return from(this.prisma.idempotencyKey.findUnique({ where: { key } })).pipe(
      switchMap((existing) => {
        if (existing) {
          if (existing.expiresAt.getTime() < Date.now()) {
            // Clé expirée : on la traite comme inexistante (best-effort).
            // On la supprime puis on retombe dans le flow nominal.
            return from(
              this.prisma.idempotencyKey.delete({ where: { key } }).catch(() => null),
            ).pipe(switchMap(() => this.runAndStore(next, key, method, path, requestHash, userId, res)));
          }
          if (existing.requestHash !== requestHash) {
            throw new UnprocessableEntityException({
              code: 'IDEMPOTENCY_KEY_REUSED',
              message:
                'Idempotency-Key déjà utilisée pour une requête différente. Génère une nouvelle clé.',
            });
          }
          // Replay : on rejoue la réponse depuis le cache.
          req.idempotencyReplay = true;
          res.setHeader('Idempotency-Replay', 'true');
          res.status(existing.responseStatus);
          return of((existing.responseBody as Prisma.JsonValue) as unknown);
        }
        return this.runAndStore(next, key, method, path, requestHash, userId, res);
      }),
    );
  }

  private runAndStore(
    next: CallHandler,
    key: string,
    method: string,
    path: string,
    requestHash: string,
    userId: string | null,
    res: Response,
  ): Observable<unknown> {
    return next.handle().pipe(
      tap((data) => {
        const status = res.statusCode;
        if (status < 200 || status >= 300) return;
        // Le ResponseInterceptor s'exécute APRÈS celui-ci dans la chaîne
        // map() — donc `data` est ce que le handler a renvoyé. Pour rester
        // cohérent au replay, on stocke ce que le client verra réellement,
        // c'est-à-dire l'enveloppe ApiResponse. On reconstruit la même
        // forme que ResponseInterceptor (success/data/timestamp).
        const body = wrapApiResponse(data);
        const expiresAt = new Date(Date.now() + TTL_MS);
        this.prisma.idempotencyKey
          .create({
            data: {
              key,
              userId,
              method,
              path,
              requestHash,
              responseStatus: status,
              responseBody: body as Prisma.InputJsonValue,
              expiresAt,
            },
          })
          .catch((err: unknown) => {
            // P2002 = unique violation : une autre requête concurrente
            // a déjà persisté la même clé. Pas critique (le cache n'est
            // qu'un best-effort post-réponse), on log et on continue.
            if (
              err instanceof Prisma.PrismaClientKnownRequestError &&
              err.code === 'P2002'
            ) {
              this.logger.warn(
                `Race detected on idempotency key (${key}); response already cached.`,
              );
              return;
            }
            this.logger.error(
              `Failed to persist idempotency key (${key}): ${(err as Error)?.message}`,
            );
          });
      }),
      catchError((err) => throwError(() => err)),
    );
  }
}

function wrapApiResponse(data: unknown): unknown {
  // Idem ResponseInterceptor : si le handler renvoie déjà une ApiResponse
  // complète (success + timestamp), on la conserve telle quelle, sinon on
  // l'enveloppe.
  if (
    data &&
    typeof data === 'object' &&
    'success' in (data as Record<string, unknown>) &&
    'timestamp' in (data as Record<string, unknown>)
  ) {
    return data;
  }
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

function hashRequest(method: string, path: string, body: unknown): string {
  const normalized = JSON.stringify({ method, path, body: stableStringifyValue(body) });
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Stringification stable : trie les clés des objets pour que
 * `{a:1,b:2}` et `{b:2,a:1}` produisent le même hash. Indispensable
 * sinon les clients qui sérialisent dans un ordre non-déterministe
 * provoquent des faux positifs « clé réutilisée ».
 */
function stableStringifyValue(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(stableStringifyValue);
  const obj = v as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    sorted[k] = stableStringifyValue(obj[k]);
  }
  return sorted;
}
