import { ApiResponse, ApiErrorResponse } from '@iox/shared';

/** Même origine par défaut (voir rewrites dans next.config.mjs). Surcharge explicite si besoin. */
function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw && raw.trim().length > 0) {
    return raw.replace(/\/$/, '');
  }
  return '/api/v1';
}

const API_BASE = getApiBase();

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
    /**
     * Identifiant de corrélation propagé par le backend via l'en-tête
     * `x-request-id` (ou dans le body d'erreur). Utile pour que le support
     * retrouve la trace serveur correspondante dans les logs / Loki.
     */
    public requestId?: string,
    /** HTTP status code pour permettre des affichages contextualisés. */
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const headerRequestId = response.headers.get('x-request-id') ?? undefined;
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = text.length ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(
      'INVALID_RESPONSE',
      text.startsWith('<')
        ? `L'API a renvoyé du HTML (${response.status}) — vérifiez le proxy / l'URL du backend.`
        : `Réponse invalide (${response.status})`,
      undefined,
      headerRequestId,
      response.status,
    );
  }

  if (!response.ok) {
    const error = parsed as ApiErrorResponse;
    throw new ApiError(
      error.error?.code ?? 'UNKNOWN_ERROR',
      error.error?.message ?? 'Erreur inconnue',
      error.error?.details,
      error.requestId ?? headerRequestId,
      response.status,
    );
  }

  const body = parsed as ApiResponse<T>;
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data;
  }

  throw new ApiError('INVALID_RESPONSE', 'Réponse API inattendue (champ « data » manquant).');
}

export const api = {
  get: <T>(path: string, token?: string) => request<T>(path, { method: 'GET' }, token),
  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, token),
  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, token),
  put: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }, token),
  delete: <T>(path: string, token?: string) => request<T>(path, { method: 'DELETE' }, token),
};
