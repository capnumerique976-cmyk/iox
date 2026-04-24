import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api, ApiError } from './api';

const originalFetch = globalThis.fetch;

function mockFetchResponse(body: unknown, init: Partial<ResponseInit> & { ok?: boolean } = {}) {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  const headers = new Headers(init.headers ?? {});
  return {
    ok,
    status,
    headers,
    text: async () => text,
  } as unknown as Response;
}

describe('api client', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('GET : unwrap le champ "data" de la ResponseInterceptor', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchResponse({ success: true, data: { id: 42 }, timestamp: '2026-01-01' }),
    );

    const result = await api.get<{ id: number }>('/foo');
    expect(result).toEqual({ id: 42 });
  });

  it('envoie le header Authorization si token fourni', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockFetchResponse({ data: { ok: true } }));

    await api.get('/secured', 'my-jwt');

    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer my-jwt',
      'Content-Type': 'application/json',
    });
  });

  it('POST sérialise le body en JSON', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(mockFetchResponse({ data: { created: true } }));

    await api.post('/users', { name: 'Ada' }, 't');

    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).method).toBe('POST');
    expect((init as RequestInit).body).toBe('{"name":"Ada"}');
  });

  it('remonte une ApiError avec code + message depuis une erreur backend', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchResponse(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Champ manquant' } },
        { status: 400 },
      ),
    );

    await expect(api.get('/foo')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Champ manquant',
    });
  });

  it("rejette en INVALID_RESPONSE si l'API renvoie du HTML", async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchResponse('<!doctype html><html>...</html>', { status: 502 }),
    );

    const err = (await api.get('/foo').catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('INVALID_RESPONSE');
    expect(err.message).toMatch(/HTML/);
  });

  it('rejette en INVALID_RESPONSE si pas de champ "data"', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchResponse({ unexpected: 'shape' }),
    );

    await expect(api.get('/foo')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('propage le requestId depuis le body erreur (priorité) puis le header', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchResponse(
        { success: false, error: { code: 'FORBIDDEN', message: 'ko' }, requestId: 'req-body-123' },
        { status: 403, headers: { 'x-request-id': 'req-header-999' } },
      ),
    );
    const err = (await api.get('/foo').catch((e) => e)) as ApiError;
    expect(err.requestId).toBe('req-body-123');
    expect(err.status).toBe(403);
  });

  it('retombe sur le header x-request-id si le body n\'a pas de requestId', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchResponse(
        { success: false, error: { code: 'BOOM', message: 'x' } },
        { status: 500, headers: { 'x-request-id': 'req-header-only' } },
      ),
    );
    const err = (await api.get('/foo').catch((e) => e)) as ApiError;
    expect(err.requestId).toBe('req-header-only');
  });

  it('gère un body vide (204 No Content) côté succès comme invalide', async () => {
    (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      mockFetchResponse('', { status: 204 }),
    );

    // Le client attend { data } — un 204 sans corps tombe sur INVALID_RESPONSE.
    await expect(api.get('/foo')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
