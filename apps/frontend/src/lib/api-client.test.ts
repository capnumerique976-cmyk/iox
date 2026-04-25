/**
 * Tests api-client (Lot 8 — session robustness).
 *
 * Couvre :
 *  1. Installation idempotente.
 *  2. Passe-plat pour les URL hors /api/v1/.
 *  3. Auto-attach du Bearer depuis authStorage.
 *  4. Respect du header Authorization déjà fourni par l'appelant.
 *  5. Exclusion /auth/login et /auth/refresh (pas d'auto-attach, pas de retry).
 *  6. 401 → refresh OK → retry avec nouveau token → succès.
 *  7. 401 sans refresh token stocké → clear + redirect /login?redirect=…
 *  8. 401 → refresh KO (backend 401) → clear + redirect.
 *  9. 401 → refresh OK → retry toujours 401 → clear + redirect.
 * 10. Deux 401 concurrents → UN SEUL POST /auth/refresh (singleton).
 * 11. Si déjà sur /login → pas de redirect (pas de boucle).
 * 12. Le nouveau accessToken est persisté en storage.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { installApiClient, __internals } from './api-client';
import { authStorage, AuthUser } from './auth';
import { UserRole } from '@iox/shared';

const USER: AuthUser = {
  id: 'u1',
  email: 'admin@iox.mch',
  firstName: 'A',
  lastName: 'B',
  role: UserRole.ADMIN,
};

// Helper : construit une Response mockée.
function mkRes(body: unknown, status = 200): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    text: async () => text,
    clone() {
      return this;
    },
  } as unknown as Response;
}

// Spy sur window.location.replace (jsdom).
function spyOnLocationReplace() {
  const spy = vi.fn();
  // `location` n'est pas redéfinissable globalement mais ses méthodes oui.
  Object.defineProperty(window.location, 'replace', {
    configurable: true,
    writable: true,
    value: spy,
  });
  return spy;
}

describe('api-client (Lot 8)', () => {
  let originalFetch: typeof fetch;
  let fetchMock: ReturnType<typeof vi.fn>;
  let replaceSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset module state entre chaque test (sinon le 1er install persisterait).
    __internals.resetForTests();

    // localStorage propre (jsdom) + seed session.
    localStorage.clear();
    authStorage.save(
      { accessToken: 'access-v1', refreshToken: 'refresh-v1', expiresIn: 900 },
      USER,
    );

    // Mock fetch AVANT install (c'est ce fetch que le patch va capturer).
    originalFetch = window.fetch;
    fetchMock = vi.fn();
    window.fetch = fetchMock as unknown as typeof fetch;

    // Pathname par défaut (utilisé par redirectToLoginIfNeeded).
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/dashboard',
        search: '?x=1',
        replace: vi.fn(),
      },
    });
    replaceSpy = spyOnLocationReplace();

    installApiClient();
  });

  afterEach(() => {
    window.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ───────────────────────────────────────────────────────────────
  it('patche window.fetch une seule fois (idempotent)', () => {
    const patched = window.fetch;
    installApiClient();
    installApiClient();
    expect(window.fetch).toBe(patched);
  });

  it('passe-plat pour les URL hors /api/v1', async () => {
    fetchMock.mockResolvedValueOnce(mkRes({ ok: true }));
    const res = await fetch('/static/logo.svg');
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    // Aucune modif des headers attendue.
    expect(init).toBeUndefined();
  });

  it('auto-attach le Bearer depuis authStorage sur /api/v1/*', async () => {
    fetchMock.mockResolvedValueOnce(mkRes({ data: 1 }));
    await fetch('/api/v1/dashboard/stats');
    const [, init] = fetchMock.mock.calls[0];
    const headers = init!.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer access-v1');
  });

  it('respecte un Authorization déjà fourni par l\'appelant', async () => {
    fetchMock.mockResolvedValueOnce(mkRes({ data: 1 }));
    await fetch('/api/v1/dashboard/stats', {
      headers: { Authorization: 'Bearer explicit-override' },
    });
    const [, init] = fetchMock.mock.calls[0];
    const headers = init!.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer explicit-override');
  });

  it('n\'attache PAS de Bearer sur /auth/login (endpoint public)', async () => {
    fetchMock.mockResolvedValueOnce(mkRes({ data: { accessToken: 'x' } }));
    await fetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'a', password: 'b' }),
    });
    const [, init] = fetchMock.mock.calls[0];
    const headers = init!.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });

  it('un 401 sur /auth/login ne déclenche ni refresh ni redirect', async () => {
    fetchMock.mockResolvedValueOnce(mkRes({ error: 'bad creds' }, 401));
    const res = await fetch('/api/v1/auth/login', { method: 'POST' });
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1); // pas de refresh derrière
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('un 200 normal passe sans intervention', async () => {
    fetchMock.mockResolvedValueOnce(mkRes({ data: { ok: 1 } }));
    const res = await fetch('/api/v1/beneficiaries');
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // ───── 401 → refresh → retry ─────────────────────────────────
  it('401 → refresh OK → retry avec nouveau token → succès', async () => {
    fetchMock
      // 1. Requête initiale → 401
      .mockResolvedValueOnce(mkRes({ error: 'expired' }, 401))
      // 2. POST /auth/refresh → 200 avec nouveau accessToken
      .mockResolvedValueOnce(mkRes({ data: { accessToken: 'access-v2', expiresIn: 900 } }))
      // 3. Retry original avec le nouveau token → 200
      .mockResolvedValueOnce(mkRes({ data: { ok: true } }));

    const res = await fetch('/api/v1/dashboard/stats');

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Le refresh a bien été appelé.
    const refreshCall = fetchMock.mock.calls[1];
    expect(refreshCall[0]).toBe('/api/v1/auth/refresh');
    expect((refreshCall[1] as RequestInit).method).toBe('POST');

    // Le retry utilise le nouveau token.
    const retryCall = fetchMock.mock.calls[2];
    const retryHeaders = (retryCall[1] as RequestInit).headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer access-v2');

    // Le storage est mis à jour.
    expect(authStorage.getAccessToken()).toBe('access-v2');
    expect(authStorage.getRefreshToken()).toBe('refresh-v1'); // inchangé

    // Pas de redirect.
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it('401 sans refresh token stocké → clear + redirect /login?redirect=…', async () => {
    // Efface UNIQUEMENT le refresh token.
    localStorage.removeItem('iox_refresh_token');

    fetchMock.mockResolvedValueOnce(mkRes({ error: 'expired' }, 401));

    const res = await fetch('/api/v1/dashboard/stats');
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1); // pas de tentative de refresh
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy.mock.calls[0][0]).toMatch(
      /^\/login\?redirect=/,
    );
    // Storage cleared.
    expect(authStorage.getAccessToken()).toBeNull();
  });

  it('401 → refresh KO (backend 401) → clear + redirect', async () => {
    fetchMock
      .mockResolvedValueOnce(mkRes({ error: 'expired' }, 401)) // requête init
      .mockResolvedValueOnce(mkRes({ error: 'refresh invalid' }, 401)); // refresh

    await fetch('/api/v1/dashboard/stats');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(authStorage.getAccessToken()).toBeNull();
  });

  it('401 → refresh OK → retry toujours 401 → clear + redirect', async () => {
    fetchMock
      .mockResolvedValueOnce(mkRes({ error: 'expired' }, 401))
      .mockResolvedValueOnce(mkRes({ data: { accessToken: 'access-v2' } }))
      .mockResolvedValueOnce(mkRes({ error: 'still 401' }, 401));

    await fetch('/api/v1/dashboard/stats');

    expect(fetchMock).toHaveBeenCalledTimes(3); // pas de second retry (anti-boucle)
    expect(replaceSpy).toHaveBeenCalledTimes(1);
  });

  // ───── Singleton refresh ─────────────────────────────────────
  it('deux 401 concurrents partagent UN SEUL POST /auth/refresh', async () => {
    let resolveRefresh: (v: Response) => void = () => {};
    const refreshPromise = new Promise<Response>((r) => {
      resolveRefresh = r;
    });

    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      const path = typeof url === 'string' ? url : (url as URL).toString();
      if (path.includes('/auth/refresh')) return refreshPromise;
      if (path.includes('/dashboard/stats'))
        return Promise.resolve(mkRes({ error: 'expired' }, 401));
      if (path.includes('/beneficiaries'))
        return Promise.resolve(mkRes({ error: 'expired' }, 401));
      // retries (détectés par token v2 dans l'Authorization header côté fetchMock appelant)
      return Promise.resolve(mkRes({ data: { ok: true } }));
    });

    // Lance deux requêtes en parallèle — toutes deux vont 401.
    const p1 = fetch('/api/v1/dashboard/stats');
    const p2 = fetch('/api/v1/beneficiaries');

    // Laisse le event loop tourner pour que les deux fetch atterrissent sur
    // leur 401 et demandent toutes deux `getRefreshPromise()`.
    await new Promise((r) => setTimeout(r, 0));

    // Résout maintenant le refresh — les deux retries doivent partir ensuite.
    resolveRefresh(mkRes({ data: { accessToken: 'access-v2', expiresIn: 900 } }));

    await Promise.all([p1, p2]);

    // On compte combien d'appels de refresh ont été faits.
    const refreshCalls = fetchMock.mock.calls.filter(
      (c) =>
        (typeof c[0] === 'string' ? c[0] : (c[0] as URL).toString()).includes('/auth/refresh'),
    );
    expect(refreshCalls.length).toBe(1);
  });

  // ───── Garde anti-boucle de redirect ─────────────────────────
  it('pas de redirect si on est déjà sur /login', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/login',
        search: '?redirect=/dashboard',
        replace: vi.fn(),
      },
    });
    const replaceSpy2 = spyOnLocationReplace();
    localStorage.removeItem('iox_refresh_token');

    fetchMock.mockResolvedValueOnce(mkRes({ error: 'expired' }, 401));
    await fetch('/api/v1/dashboard/stats');

    expect(replaceSpy2).not.toHaveBeenCalled();
  });

  // ───── Form de la redirect URL ───────────────────────────────
  it('la redirect URL encode pathname + search du moment de l\'échec', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        pathname: '/admin/users',
        search: '?page=2&limit=50',
        replace: vi.fn(),
      },
    });
    const replaceSpy2 = spyOnLocationReplace();
    localStorage.removeItem('iox_refresh_token');

    fetchMock.mockResolvedValueOnce(mkRes({ error: 'expired' }, 401));
    await fetch('/api/v1/admin/users');

    expect(replaceSpy2).toHaveBeenCalledTimes(1);
    const target = replaceSpy2.mock.calls[0][0] as string;
    expect(target).toBe(
      `/login?redirect=${encodeURIComponent('/admin/users?page=2&limit=50')}`,
    );
  });
});
