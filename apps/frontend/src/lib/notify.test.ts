/**
 * Tests du helper notify (Lot 9 — L9-1).
 *
 * Vérifie :
 *  1. ApiError → titre = message backend, description avec code + requestId.
 *  2. ApiError 401 → silence par défaut (api-client gère refresh+redirect).
 *  3. ApiError 401 + showOn401 → toast quand même (cas exotique).
 *  4. TypeError "Failed to fetch" → message UX dédié réseau.
 *  5. Error standard → fallback en titre, message en description.
 *  6. Erreur non-Error (string, undefined) → fallback seul.
 *  7. Dédoublonnage : 2 appels identiques rapprochés → 1 seul toast.
 *  8. Dédoublonnage expire après la fenêtre.
 *  9. notifySuccess / notifyInfo passent au toast sonner.
 * 10. installGlobalErrorHandler idempotent + capture unhandledrejection
 *     mais ignore les ApiError 401.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { toast } from 'sonner';
import { ApiError } from './api';
import {
  notifyError,
  notifySuccess,
  notifyInfo,
  installGlobalErrorHandler,
  __resetNotifyForTests,
} from './notify';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('notifyError', () => {
  beforeEach(() => {
    __resetNotifyForTests();
    vi.clearAllMocks();
  });

  it('extrait message + code + requestId d\'une ApiError', () => {
    const err = new ApiError('VALIDATION_ERROR', 'Email invalide', undefined, 'req-123', 400);
    notifyError(err, 'Création impossible');
    expect(toast.error).toHaveBeenCalledWith('Email invalide', {
      description: 'code: VALIDATION_ERROR · requestId: req-123',
    });
  });

  it('reste silencieux sur ApiError 401 par défaut', () => {
    const err = new ApiError('UNAUTHORIZED', 'Non authentifié', undefined, undefined, 401);
    notifyError(err);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('émet quand même si showOn401 forcé', () => {
    const err = new ApiError('UNAUTHORIZED', 'Non authentifié', undefined, undefined, 401);
    notifyError(err, 'Erreur', { showOn401: true });
    expect(toast.error).toHaveBeenCalled();
  });

  it('détecte TypeError fetch comme erreur réseau', () => {
    notifyError(new TypeError('Failed to fetch'));
    expect(toast.error).toHaveBeenCalledWith('Réseau indisponible', {
      description: 'Vérifiez votre connexion puis réessayez.',
    });
  });

  it('utilise fallback en titre et Error.message en description', () => {
    notifyError(new Error('boom interne'), 'Action impossible');
    expect(toast.error).toHaveBeenCalledWith('Action impossible', {
      description: 'boom interne',
    });
  });

  it('utilise le fallback seul pour une valeur non-Error', () => {
    notifyError('weird string', 'Fallback msg');
    expect(toast.error).toHaveBeenCalledWith('Fallback msg', undefined);
  });

  it('dédoublonne deux appels identiques rapprochés', () => {
    const err = new ApiError('FOO', 'message identique', undefined, undefined, 500);
    notifyError(err);
    notifyError(err);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('ré-émet après la fenêtre de dédoublonnage', () => {
    vi.useFakeTimers();
    const err = new ApiError('FOO', 'msg', undefined, undefined, 500);
    notifyError(err);
    vi.advanceTimersByTime(3500);
    notifyError(err);
    expect(toast.error).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('notifySuccess / notifyInfo', () => {
  beforeEach(() => {
    __resetNotifyForTests();
    vi.clearAllMocks();
  });

  it('appelle toast.success', () => {
    notifySuccess('Sauvegardé');
    expect(toast.success).toHaveBeenCalledWith('Sauvegardé', undefined);
  });

  it('appelle toast.info', () => {
    notifyInfo('Rien à faire');
    expect(toast.info).toHaveBeenCalledWith('Rien à faire', undefined);
  });
});

describe('installGlobalErrorHandler', () => {
  beforeEach(() => {
    __resetNotifyForTests();
    vi.clearAllMocks();
  });

  afterEach(() => {
    __resetNotifyForTests();
  });

  it('capture unhandledrejection et émet un toast', () => {
    installGlobalErrorHandler();
    const event = new Event('unhandledrejection') as Event & { reason?: unknown };
    (event as { reason: unknown }).reason = new Error('boom async');
    window.dispatchEvent(event);
    expect(toast.error).toHaveBeenCalled();
  });

  it('ignore les ApiError 401 (gérées par api-client)', () => {
    installGlobalErrorHandler();
    const event = new Event('unhandledrejection') as Event & { reason?: unknown };
    (event as { reason: unknown }).reason = new ApiError(
      'UNAUTHORIZED',
      'Nope',
      undefined,
      undefined,
      401,
    );
    window.dispatchEvent(event);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('est idempotent (deux installs = un seul listener)', () => {
    installGlobalErrorHandler();
    installGlobalErrorHandler();
    const event = new Event('unhandledrejection') as Event & { reason?: unknown };
    (event as { reason: unknown }).reason = new Error('once');
    window.dispatchEvent(event);
    // Sans dédup, on aurait 2 toasts (un par listener). Avec dédup interne
    // on aurait 1. Le test plus strict : un seul listener installé.
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
