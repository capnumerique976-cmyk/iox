/**
 * Tests IdempotencyInterceptor (L9-3).
 *
 * Couvre :
 *  1. Pas de header → bypass complet (handler appelé, rien persisté).
 *  2. Méthode non mutante (GET) → bypass.
 *  3. SkipIdempotency → bypass.
 *  4. Header invalide (format) → 422.
 *  5. Première requête : handler invoqué, réponse persistée.
 *  6. Replay (clé existe, hash identique) → handler PAS invoqué, réponse
 *     servie depuis le cache, header `Idempotency-Replay: true`.
 *  7. Clé réutilisée avec body différent → 422.
 *  8. Clé expirée → traitée comme inexistante (handler invoqué).
 *  9. Course concurrente (P2002 sur create) → log warn, pas d'erreur.
 * 10. Status non-2xx → pas de persistance.
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  CallHandler,
  ExecutionContext,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { firstValueFrom, of, lastValueFrom } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { PrismaService } from '../../database/prisma.service';
import { SKIP_IDEMPOTENCY_KEY } from '../decorators/skip-idempotency.decorator';

interface MockRes {
  statusCode: number;
  setHeader: jest.Mock;
  status: jest.Mock;
}

function makeContext({
  method = 'POST',
  url = '/api/v1/product-batches',
  body = { foo: 'bar' },
  headers = {} as Record<string, string>,
  user = { id: 'u-1' },
  res = { statusCode: 201, setHeader: jest.fn(), status: jest.fn() } as MockRes,
}: Partial<{
  method: string;
  url: string;
  body: unknown;
  headers: Record<string, string>;
  user: { id: string } | null;
  res: MockRes;
}> = {}): ExecutionContext {
  const req = {
    method,
    originalUrl: url,
    url,
    body,
    user,
    header: (name: string) => headers[name.toLowerCase()] ?? headers[name],
  };
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getHandler: () => () => {},
    getClass: () => class Dummy {},
  } as unknown as ExecutionContext;
}

function makeNext(value: unknown): CallHandler {
  return { handle: jest.fn(() => of(value)) };
}

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let prisma: {
    idempotencyKey: {
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
  };
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    prisma = {
      idempotencyKey: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        { provide: PrismaService, useValue: prisma },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();
    interceptor = module.get(IdempotencyInterceptor);
  });

  it('bypass si pas de header Idempotency-Key', async () => {
    const ctx = makeContext({ headers: {} });
    const next = makeNext({ id: 'pb-1' });
    const obs = await interceptor.intercept(ctx, next);
    await firstValueFrom(obs);
    expect(next.handle).toHaveBeenCalled();
    expect(prisma.idempotencyKey.findUnique).not.toHaveBeenCalled();
    expect(prisma.idempotencyKey.create).not.toHaveBeenCalled();
  });

  it('bypass si méthode non mutante (GET)', async () => {
    const ctx = makeContext({ method: 'GET', headers: { 'idempotency-key': 'a'.repeat(20) } });
    const next = makeNext({ ok: true });
    const obs = await interceptor.intercept(ctx, next);
    await firstValueFrom(obs);
    expect(next.handle).toHaveBeenCalled();
    expect(prisma.idempotencyKey.findUnique).not.toHaveBeenCalled();
  });

  it('bypass si @SkipIdempotency()', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = makeContext({ headers: { 'idempotency-key': 'a'.repeat(20) } });
    const next = makeNext({ ok: true });
    const obs = await interceptor.intercept(ctx, next);
    await firstValueFrom(obs);
    expect(prisma.idempotencyKey.findUnique).not.toHaveBeenCalled();
  });

  it('header au format invalide → 422', () => {
    const ctx = makeContext({ headers: { 'idempotency-key': 'short' } });
    const next = makeNext({ ok: true });
    expect(() => interceptor.intercept(ctx, next)).toThrow(UnprocessableEntityException);
  });

  it('première requête : handler invoqué et réponse persistée', async () => {
    prisma.idempotencyKey.findUnique.mockResolvedValue(null);
    const key = 'a'.repeat(32);
    const ctx = makeContext({ headers: { 'idempotency-key': key } });
    const next = makeNext({ id: 'pb-1' });

    const obs = await interceptor.intercept(ctx, next);
    const result = await firstValueFrom(obs);

    expect(next.handle).toHaveBeenCalled();
    expect(result).toEqual({ id: 'pb-1' });
    // create est appelé async dans le tap — on attend une microtask
    await new Promise((r) => setImmediate(r));
    expect(prisma.idempotencyKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          key,
          method: 'POST',
          path: '/api/v1/product-batches',
          responseStatus: 201,
          userId: 'u-1',
        }),
      }),
    );
    const persistedBody = (prisma.idempotencyKey.create.mock.calls[0][0] as { data: { responseBody: { success: boolean; data: unknown } } }).data.responseBody;
    expect(persistedBody).toEqual(
      expect.objectContaining({ success: true, data: { id: 'pb-1' } }),
    );
  });

  it('replay : clé existante, hash identique → cache renvoyé, handler ignoré', async () => {
    const key = 'a'.repeat(32);
    const cachedEnvelope = { success: true, data: { id: 'pb-cached' }, timestamp: 'x' };
    // Recompute hash pour simuler une vraie requête identique
    const InterceptorAny = interceptor as unknown as {
      // accès à la méthode privée via cast — pas idéal mais isole le test
    };
    void InterceptorAny;

    // Pour obtenir le hash attendu on appelle l'interceptor une 1re fois
    // sur findUnique=null pour qu'il calcule + persiste, on intercepte le
    // create pour récupérer le hash, puis on simule findUnique avec ce hash.
    let capturedHash = '';
    prisma.idempotencyKey.findUnique.mockResolvedValue(null);
    prisma.idempotencyKey.create.mockImplementation((args: { data: { requestHash: string } }) => {
      capturedHash = args.data.requestHash;
      return Promise.resolve({});
    });

    const ctxFirst = makeContext({ headers: { 'idempotency-key': key } });
    const obsFirst = await interceptor.intercept(ctxFirst, makeNext({ id: 'pb-cached' }));
    await firstValueFrom(obsFirst);
    await new Promise((r) => setImmediate(r));
    expect(capturedHash).toBeTruthy();

    // 2e appel : findUnique renvoie l'enregistrement, hash identique
    prisma.idempotencyKey.findUnique.mockResolvedValue({
      key,
      requestHash: capturedHash,
      responseStatus: 201,
      responseBody: cachedEnvelope as unknown as Prisma.JsonValue,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const res = { statusCode: 200, setHeader: jest.fn(), status: jest.fn() };
    const ctxReplay = makeContext({ headers: { 'idempotency-key': key }, res });
    const next2 = makeNext({ id: 'pb-NEW-not-used' });
    const obsReplay = await interceptor.intercept(ctxReplay, next2);
    const result = await firstValueFrom(obsReplay);
    expect(next2.handle).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Idempotency-Replay', 'true');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(result).toEqual(cachedEnvelope);
  });

  it('clé réutilisée avec body différent → 422', async () => {
    const key = 'a'.repeat(32);
    prisma.idempotencyKey.findUnique.mockResolvedValue({
      key,
      requestHash: 'hash-totalement-different',
      responseStatus: 201,
      responseBody: { success: true },
      expiresAt: new Date(Date.now() + 60_000),
    });
    const ctx = makeContext({ headers: { 'idempotency-key': key } });
    const obs = await interceptor.intercept(ctx, makeNext({ id: 'x' }));
    await expect(lastValueFrom(obs)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('clé expirée → traitée comme inexistante', async () => {
    const key = 'a'.repeat(32);
    prisma.idempotencyKey.findUnique.mockResolvedValue({
      key,
      requestHash: 'old',
      responseStatus: 201,
      responseBody: {},
      expiresAt: new Date(Date.now() - 60_000), // expirée
    });
    const ctx = makeContext({ headers: { 'idempotency-key': key } });
    const next = makeNext({ id: 'pb-fresh' });
    const obs = await interceptor.intercept(ctx, next);
    const result = await firstValueFrom(obs);
    expect(prisma.idempotencyKey.delete).toHaveBeenCalledWith({ where: { key } });
    expect(next.handle).toHaveBeenCalled();
    expect(result).toEqual({ id: 'pb-fresh' });
  });

  it('course concurrente : P2002 sur create → log warn sans throw', async () => {
    prisma.idempotencyKey.findUnique.mockResolvedValue(null);
    prisma.idempotencyKey.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '5.x',
      }),
    );
    const ctx = makeContext({ headers: { 'idempotency-key': 'a'.repeat(32) } });
    const next = makeNext({ ok: true });
    const obs = await interceptor.intercept(ctx, next);
    const result = await firstValueFrom(obs);
    expect(result).toEqual({ ok: true });
    // create rejette mais pas d'exception remontée
    await new Promise((r) => setImmediate(r));
  });

  it("status non-2xx (ex. handler renvoie via res.status(400)) → pas de persistance", async () => {
    prisma.idempotencyKey.findUnique.mockResolvedValue(null);
    const res = { statusCode: 400, setHeader: jest.fn(), status: jest.fn() };
    const ctx = makeContext({ headers: { 'idempotency-key': 'a'.repeat(32) }, res });
    const next = makeNext({ error: 'bad' });
    const obs = await interceptor.intercept(ctx, next);
    await firstValueFrom(obs);
    await new Promise((r) => setImmediate(r));
    expect(prisma.idempotencyKey.create).not.toHaveBeenCalled();
  });

  it('décorateur SKIP_IDEMPOTENCY_KEY exporté et utilisable par Reflector', () => {
    // Sanity check sur la constante de métadata
    expect(SKIP_IDEMPOTENCY_KEY).toBe('skip_idempotency');
  });
});
