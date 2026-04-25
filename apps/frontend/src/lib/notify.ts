/**
 * Helpers de notification UI (Lot 9 — L9-1).
 *
 * Avant ce module, ~25 pages dupliquaient la même boilerplate :
 *   } catch { toast.error('Action impossible, réessayez.'); }
 * Le `ApiError` (lib/api.ts) — pourtant riche en infos (code, message
 * backend, requestId, status) — était systématiquement perdu : message
 * générique, aucune corrélation possible avec les logs serveur.
 *
 * Ce module centralise :
 *   - extraction du message d'erreur le plus parlant possible (ApiError
 *     > Error.message > fallback) ;
 *   - propagation du `requestId` en `description` du toast pour permettre
 *     au support de croiser avec les logs ;
 *   - silence sur 401 (le client API gère refresh + redirect login —
 *     toaster sur 401 polluerait l'écran) ;
 *   - détection des erreurs réseau (TypeError "Failed to fetch") avec
 *     message UX dédié ;
 *   - dédoublonnage temporel (3 s) pour éviter les rafales de toasts
 *     identiques (n requêtes parallèles qui échouent toutes pareil) ;
 *   - capture filet-de-sécurité des `unhandledrejection` non interceptés.
 *
 * Choix d'API : on expose `notifyError(err, fallback?)` plutôt qu'un
 * mapping (ApiError → toast) implicite, parce que (a) ça reste appelable
 * depuis n'importe quel `catch`, (b) l'appelant garde la main sur le
 * fallback (verbe métier : "Création impossible", "Chargement impossible"…),
 * (c) on peut migrer page par page sans tout casser.
 */
import { toast } from 'sonner';
import { ApiError } from './api';

const DEDUPE_WINDOW_MS = 3000;
const DEDUPE_MAX_ENTRIES = 50;
const dedupe = new Map<string, number>();

function shouldDedupe(key: string): boolean {
  const now = Date.now();
  const last = dedupe.get(key);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) {
    return true;
  }
  dedupe.set(key, now);
  // GC opportuniste pour ne pas grossir indéfiniment dans une SPA.
  if (dedupe.size > DEDUPE_MAX_ENTRIES) {
    for (const [k, t] of dedupe.entries()) {
      if (now - t >= DEDUPE_WINDOW_MS) dedupe.delete(k);
    }
  }
  return false;
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && /fetch|network|load failed/i.test(err.message)) {
    return true;
  }
  return false;
}

interface ExtractedError {
  /** Code HTTP si connu — utilisé pour silencer 401. */
  status?: number;
  /** Message à afficher en titre du toast. */
  title: string;
  /** Description optionnelle (requestId + code backend). */
  description?: string;
  /** Clé de dédup. */
  dedupeKey: string;
}

function extract(err: unknown, fallback: string): ExtractedError {
  if (err instanceof ApiError) {
    const parts: string[] = [];
    if (err.code && err.code !== 'UNKNOWN_ERROR') parts.push(`code: ${err.code}`);
    if (err.requestId) parts.push(`requestId: ${err.requestId}`);
    return {
      status: err.status,
      title: err.message || fallback,
      description: parts.length ? parts.join(' · ') : undefined,
      dedupeKey: `api:${err.status ?? '?'}:${err.code}:${err.message}`,
    };
  }

  if (isNetworkError(err)) {
    return {
      title: 'Réseau indisponible',
      description: 'Vérifiez votre connexion puis réessayez.',
      dedupeKey: 'network:offline',
    };
  }

  if (err instanceof Error) {
    return {
      title: fallback,
      description: err.message && err.message !== fallback ? err.message : undefined,
      dedupeKey: `err:${err.name}:${err.message}`,
    };
  }

  return { title: fallback, dedupeKey: `fallback:${fallback}` };
}

export interface NotifyErrorOptions {
  /**
   * Si `true`, le toast est aussi émis pour un 401. Par défaut `false`
   * parce que le client API (lib/api-client.ts) gère le refresh
   * silencieusement + la redirection vers /login le cas échéant. Émettre
   * un toast en plus déclencherait des "Session expirée" parasites
   * pendant le retry.
   */
  showOn401?: boolean;
}

/**
 * Affiche un toast d'erreur basé sur n'importe quel `unknown` capturé.
 * À appeler dans tous les `catch` côté UI à la place de la boilerplate
 * `toast.error('Action impossible, réessayez.')`.
 */
export function notifyError(
  err: unknown,
  fallback = 'Une erreur est survenue',
  opts: NotifyErrorOptions = {},
): void {
  const info = extract(err, fallback);

  if (info.status === 401 && !opts.showOn401) {
    // Le client API a déjà déclenché refresh+redirect — silence radio.
    return;
  }

  if (shouldDedupe(info.dedupeKey)) return;

  toast.error(info.title, info.description ? { description: info.description } : undefined);
}

/** Toast de succès — wrapper trivial pour homogénéiser les call sites. */
export function notifySuccess(message: string, opts?: { description?: string }): void {
  toast.success(message, opts);
}

/** Toast info — usage rare (cancel, no-op, "rien à faire"). */
export function notifyInfo(message: string, opts?: { description?: string }): void {
  toast.info(message, opts);
}

let globalHandlerInstalled = false;

/**
 * Filet de sécurité : capture les promesses rejetées qu'aucun `catch`
 * n'a interceptées (typiquement des `void someAsync()` oubliés). Évite
 * que l'utilisateur reste devant un écran muet alors qu'une opération
 * a planté en arrière-plan.
 *
 * Idempotent — appel multiple sans effet, utile en HMR / re-render
 * d'AuthProvider.
 */
export function installGlobalErrorHandler(): void {
  if (globalHandlerInstalled) return;
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    // Les 401 sont gérés par api-client (refresh+redirect) — on ignore.
    if (reason instanceof ApiError && reason.status === 401) return;
    notifyError(reason, 'Une opération a échoué en arrière-plan');
  });

  globalHandlerInstalled = true;
}

/** Pour les tests uniquement. */
export function __resetNotifyForTests(): void {
  dedupe.clear();
  globalHandlerInstalled = false;
}
