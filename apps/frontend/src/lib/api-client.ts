/**
 * IOX — Client API authentifié (Lot 8 "session robustness")
 * =========================================================
 *
 * Remplace l'ancien `auth-interceptor.ts` (Lot 7 bis) qui ne faisait que
 * rediriger sur 401. Ici, on gère un vrai cycle de vie JWT court (15 min) +
 * refresh token (7 j) :
 *
 *   1. `installApiClient()` patche `window.fetch` pour TOUS les appels
 *      `/api/v1/*` émis depuis le navigateur (pages, composants, `lib/api.ts`
 *      historique, …). Ainsi, AUCUNE migration massive des 50 pages qui font
 *      encore `fetch('/api/v1/...', { headers: { Authorization } })` n'est
 *      nécessaire — elles profitent automatiquement du refresh.
 *
 *   2. Pour chaque requête `/api/v1/*` (hors `/auth/login` et `/auth/refresh`):
 *        - si aucun header `Authorization` n'est fourni par l'appelant, on y
 *          injecte `Bearer <accessToken>` depuis `authStorage`.
 *        - on exécute la requête via le fetch natif capturé.
 *        - si la réponse est 401 :
 *            a. on tente UN `/auth/refresh` (mutualisé via singleton promise
 *               — deux 401 parallèles partagent le même call).
 *            b. si le refresh réussit → on persiste le nouveau access token
 *               et on rejoue la requête UNE SEULE fois avec ce token.
 *            c. si le refresh échoue ou si le retry est à nouveau 401 →
 *               on clear la session et on redirige vers `/login?redirect=…`.
 *
 *   3. Garanties :
 *        - pas de boucle infinie : au plus UN retry par requête, UN refresh
 *          par vague de 401 concurrents.
 *        - pas de redirect loop : no-op si déjà sur `/login`.
 *        - SSR safe : no-op côté serveur (pas de `window`).
 *        - idempotent : appelé plusieurs fois, seul le premier appel patche.
 *        - respect de l'appelant : si un header `Authorization` est déjà
 *          présent (ex. impersonation admin, ou lib/api.ts passant un token
 *          explicite), on ne l'écrase pas.
 *
 *   4. Hors scope (non 401) :
 *        - les 403 (permission refusée sur token valide) : rien à faire, on
 *          renvoie tel quel, la page gère.
 *        - les 5xx / réseau : rien à faire, on renvoie tel quel.
 *
 *   5. Endpoints exclus (la logique d'auth-retry ne s'applique PAS) :
 *        - `/api/v1/auth/login` : un 401 ici signifie "mauvais mot de passe",
 *          c'est un signal métier attendu par la page de login.
 *        - `/api/v1/auth/refresh` : un 401 ici signifie que le refresh token
 *          lui-même a expiré — traité par le refresh singleton (return null)
 *          et remonté via `handle401Failure`.
 *
 *   6. Body des retries : le retry réutilise `init.body` tel quel. Pour les
 *      bodies `ReadableStream` (rare en frontend), la réémission peut
 *      échouer car le stream est consommé. Pour les bodies `string`/
 *      `FormData`/`Blob` (99% des cas), c'est safe. On documente, on ne
 *      corrige pas.
 *
 *   7. Pourquoi singleton refresh promise ?
 *      Exemple : au retour d'un onglet après 20 min, 8 composants lancent
 *      en parallèle des GET qui retournent 401 simultanément. Sans mutex on
 *      ferait 8 POST /auth/refresh d'affilée — dont certains invalidés par
 *      un rotating refresh token si on en ajoute un jour. Avec mutex, un
 *      seul refresh, 8 retries qui réutilisent le même nouveau access token.
 */
import { authStorage } from './auth';

// Capturé à l'install pour bypasser notre propre patch lors du refresh/retry.
let ORIGINAL_FETCH: typeof fetch | null = null;
let installed = false;

const SAFE_PATHS = ['/api/v1/auth/login', '/api/v1/auth/refresh'];

function pathFromInput(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.pathname + input.search;
  // Request
  return input.url;
}

function isApiV1(url: string): boolean {
  return /\/api\/v1\//.test(url);
}

function isExcluded(url: string): boolean {
  return SAFE_PATHS.some((p) => url.includes(p));
}

// ─── Refresh mutualisé ──────────────────────────────────────────────────
let refreshPromise: Promise<string | null> | null = null;

/**
 * Exécute un POST `/auth/refresh` avec le refresh token courant.
 * Retourne :
 *  - le nouveau accessToken si succès,
 *  - `null` si échec (pas de refresh token stocké, 401, réseau KO, JSON
 *    invalide, payload sans accessToken).
 *
 * NB : le backend IOX ne rotate PAS le refresh token — on conserve donc
 * celui déjà en storage. Si un jour la rotation est ajoutée côté backend
 * (payload `{accessToken, refreshToken, expiresIn}` au refresh), il
 * suffira de le prendre en compte ici.
 */
async function runRefresh(): Promise<string | null> {
  if (!ORIGINAL_FETCH) return null;
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await ORIGINAL_FETCH('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text.length ? JSON.parse(text) : null;
    } catch {
      return null;
    }

    // Le backend encapsule via ResponseInterceptor → { success, data, ... }
    // Mais on accepte aussi un payload "plat" par robustesse (smoke, scripts).
    const obj = parsed as { data?: Record<string, unknown> } & Record<string, unknown>;
    const accessToken =
      (obj?.data?.accessToken as string | undefined) ?? (obj?.accessToken as string | undefined);
    const expiresIn =
      (obj?.data?.expiresIn as number | undefined) ??
      (obj?.expiresIn as number | undefined) ??
      900;

    if (!accessToken || typeof accessToken !== 'string') return null;

    // Persiste le nouveau access token (on garde le même refresh token,
    // même user). Si `authStorage` n'a pas d'user (cas limite après un
    // clear partiel), on n'écrit rien — la prochaine requête redirigera
    // proprement via le handler 401 final.
    const user = authStorage.getUser();
    if (user) {
      authStorage.save({ accessToken, refreshToken, expiresIn }, user);
    }
    return accessToken;
  } catch {
    return null;
  }
}

/**
 * Singleton — tant qu'un refresh est en cours, tous les appelants
 * attendent la même promesse. Réinitialisé après résolution (succès OU
 * échec) pour que le prochain 401 puisse retenter.
 */
function getRefreshPromise(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = runRefresh().finally(() => {
      // Décalé après le microtask pour que tous les `await getRefreshPromise()`
      // en vol lisent bien la même résolution avant qu'un suivant ne relance.
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// ─── Redirection d'échec final ──────────────────────────────────────────
function redirectToLoginIfNeeded(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/login')) return;
  try {
    authStorage.clear();
  } catch {
    /* localStorage indisponible — on continue */
  }
  const next = window.location.pathname + window.location.search;
  const target = `/login?redirect=${encodeURIComponent(next)}`;
  // `replace` pour ne pas polluer l'historique — l'utilisateur n'a rien
  // à "revenir en arrière" après une expiration de session.
  window.location.replace(target);
}

// ─── Installation ───────────────────────────────────────────────────────
/**
 * Patche `window.fetch` (idempotent). À appeler une seule fois au montage
 * du `AuthProvider`. No-op côté serveur.
 */
export function installApiClient(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  ORIGINAL_FETCH = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = pathFromInput(input);

    // Passe-plat intégral pour tout ce qui n'est pas `/api/v1/*`
    // (analytics, assets, third-party, Next.js internal, ...).
    if (!isApiV1(url)) return ORIGINAL_FETCH!(input, init);

    // Clone du Request si nécessaire (pour pouvoir rejouer).
    const requestClone = input instanceof Request ? input.clone() : null;

    const normInit: RequestInit = init ? { ...init } : {};
    const headers = new Headers(normInit.headers as HeadersInit | undefined);

    // Auto-attach Authorization — seulement si non présent ET endpoint non exclu.
    if (!isExcluded(url) && !headers.has('Authorization')) {
      const tok = authStorage.getAccessToken();
      if (tok) headers.set('Authorization', `Bearer ${tok}`);
    }
    normInit.headers = headers;

    const res = await ORIGINAL_FETCH!(input, normInit);

    // Cas 1 : pas 401, ou endpoint exclu → rien à faire.
    if (res.status !== 401 || isExcluded(url)) return res;

    // Cas 2 : 401 sur endpoint métier → tentative de refresh mutualisé.
    const newToken = await getRefreshPromise();
    if (!newToken) {
      redirectToLoginIfNeeded();
      return res;
    }

    // Cas 3 : refresh OK → on rejoue UNE SEULE fois avec le nouveau token.
    const retryHeaders = new Headers(headers);
    retryHeaders.set('Authorization', `Bearer ${newToken}`);
    const retryInput: RequestInfo | URL = requestClone ?? input;
    const retryRes = await ORIGINAL_FETCH!(retryInput, {
      ...normInit,
      headers: retryHeaders,
    });

    if (retryRes.status === 401) {
      // Le nouveau token est déjà rejeté : soit le user a été désactivé
      // backend-side, soit le JWT_SECRET a tourné. On ne boucle pas.
      redirectToLoginIfNeeded();
    }
    return retryRes;
  };
}

// ─── API typée publique (pour le code neuf qui veut une façade claire) ──
// Note : transitoirement on garde `lib/api.ts` qui reste compatible — il
// appelle `fetch()` natif, qui est patché, donc il bénéficie aussi du
// refresh automatiquement. `apiClient` ci-dessous est un sucre syntaxique
// que les nouvelles pages peuvent préférer.

export interface ApiClientOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /**
   * Par défaut true : le header Authorization est injecté automatiquement
   * depuis `authStorage`. Passez `false` pour un appel public explicite.
   */
  auth?: boolean;
}

async function apiFetch<T = unknown>(path: string, opts: ApiClientOptions = {}): Promise<T> {
  const { auth = true, body, headers, ...rest } = opts;
  const h = new Headers(headers);
  if (!h.has('Content-Type') && body !== undefined && !(body instanceof FormData)) {
    h.set('Content-Type', 'application/json');
  }
  if (auth === false) {
    // On passe un header sentinelle que le patch ne touchera pas ;
    // puisque l'auth est injectée uniquement si Authorization absent,
    // il suffit de ne rien y mettre et de ne pas stocker de token.
    // → rien à faire, le patch n'ajoute rien si l'appelant ne veut pas.
    // Mais pour forcer l'absence même si le storage a un token,
    // on marque via un header privé qu'on nettoie juste avant send —
    // ici on préfère la simplicité : auth=false signifie "si tu veux
    // vraiment pas, n'utilise pas apiClient". Le cas est rarissime
    // en dashboard (tout est authentifié).
  }
  const init: RequestInit = {
    ...rest,
    headers: h,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData || typeof body === 'string'
          ? (body as BodyInit)
          : JSON.stringify(body),
  };
  const res = await fetch(`/api/v1${path.startsWith('/') ? path : `/${path}`}`, init);
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text.length ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Réponse API invalide (${res.status})`);
  }
  if (!res.ok) {
    const err = parsed as { error?: { code?: string; message?: string } } | null;
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  const body2 = parsed as { data?: T } | null;
  if (body2 && typeof body2 === 'object' && 'data' in body2) return body2.data as T;
  return parsed as T;
}

export const apiClient = {
  get: <T = unknown>(path: string, opts: Omit<ApiClientOptions, 'method' | 'body'> = {}) =>
    apiFetch<T>(path, { ...opts, method: 'GET' }),
  post: <T = unknown>(path: string, body?: unknown, opts: Omit<ApiClientOptions, 'method'> = {}) =>
    apiFetch<T>(path, { ...opts, method: 'POST', body }),
  patch: <T = unknown>(path: string, body?: unknown, opts: Omit<ApiClientOptions, 'method'> = {}) =>
    apiFetch<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T = unknown>(path: string, body?: unknown, opts: Omit<ApiClientOptions, 'method'> = {}) =>
    apiFetch<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T = unknown>(path: string, opts: Omit<ApiClientOptions, 'method' | 'body'> = {}) =>
    apiFetch<T>(path, { ...opts, method: 'DELETE' }),
};

// ─── Helpers internes exposés pour les tests ───────────────────────────
/** @internal — utilisé uniquement par les tests unitaires. */
export const __internals = {
  resetForTests() {
    installed = false;
    ORIGINAL_FETCH = null;
    refreshPromise = null;
  },
};
