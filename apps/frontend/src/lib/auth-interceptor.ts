/**
 * IOX — Auth interceptor (401 → redirect /login)
 *
 * Wrap `window.fetch` pour intercepter les 401 sur les endpoints `/api/v1/*`
 * et déclencher une déconnexion + redirection vers `/login?redirect=…`.
 *
 * Pourquoi : la majorité des pages métier (dashboard, distributions,
 * incidents, label-validations, admin, …) lisent le token directement via
 * `authStorage.getAccessToken()` puis font un `fetch()` brut. Si le JWT
 * (TTL 15 min côté backend, voir `JWT_EXPIRES_IN`) expire, ces fetchs
 * échouent en 401 et chaque page affiche son propre message générique
 * ("Impossible de charger…", "Unauthorized", …) sans réinitialiser la
 * session. L'utilisateur reste bloqué sur un shell connecté inutilisable
 * jusqu'à ce qu'il clique manuellement sur "Déconnexion".
 *
 * Cet intercepteur centralise la réponse à 401 :
 *   - vide `authStorage`
 *   - redirige vers `/login?redirect=<chemin courant>` (full reload)
 *
 * Exclusions :
 *   - les appels à `/api/v1/auth/login` (un 401 est attendu pour identifier
 *     un mauvais mot de passe)
 *   - les appels à `/api/v1/auth/refresh` (échec de refresh = expiration —
 *     traité par l'appelant, pas par l'intercepteur)
 *   - si on est déjà sur `/login`, on ne fait rien (pas de boucle)
 *
 * Idempotent : la première installation patche `window.fetch`, les suivantes
 * sont des no-ops.
 */
import { authStorage } from './auth';

let installed = false;

const SAFE_PATHS = ['/api/v1/auth/login', '/api/v1/auth/refresh'];

function pathFromInput(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.pathname + input.search;
  // Request
  return input.url;
}

function isApiV1(url: string): boolean {
  // Match `/api/v1/...` qu'il s'agisse d'une URL absolue ou relative
  return /\/api\/v1\//.test(url);
}

function isExcluded(url: string): boolean {
  return SAFE_PATHS.some((p) => url.includes(p));
}

export function installAuthInterceptor(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const original = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const response = await original(input, init);

    if (response.status !== 401) return response;

    const url = pathFromInput(input);
    if (!isApiV1(url) || isExcluded(url)) return response;

    // Évite la boucle si on est déjà sur /login.
    if (window.location.pathname.startsWith('/login')) return response;

    // Session expirée ou invalide : on nettoie et on redirige.
    try {
      authStorage.clear();
    } catch {
      /* localStorage indisponible — on continue quand même */
    }

    const next = window.location.pathname + window.location.search;
    const target = `/login?redirect=${encodeURIComponent(next)}`;
    // `replace` plutôt que `assign` pour ne pas polluer l'historique.
    window.location.replace(target);

    return response;
  };
}
