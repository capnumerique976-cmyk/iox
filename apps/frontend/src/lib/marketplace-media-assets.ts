// FP-3.1 — Helper API authentifié pour les media assets marketplace.
//
// Le backend expose `POST /marketplace/media-assets/upload` (multipart) et
// `GET /marketplace/media-assets/:id/url` (URL signée temporaire).
//
// `upload` ne peut PAS passer par le wrapper `api` partagé : ce dernier
// force `Content-Type: application/json`, ce qui empêche le navigateur de
// poser le boundary `multipart/form-data`. On ré-implémente donc la requête
// minimaliste via `fetch`, en récupérant la base API de la même façon
// (NEXT_PUBLIC_API_URL ou fallback `/api/v1` proxifié par next.config.mjs).

import { ApiError } from './api';
import {
  type MarketplaceRelatedEntityType,
  MediaAssetRole,
  MediaAssetType,
  type MediaModerationStatus,
} from '@iox/shared';

export { MediaAssetRole, MediaAssetType };

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;

// MP-MEDIA-1 LOT 1 — Cap UI client (backend illimité V1).
export const MEDIA_GALLERY_MAX_PER_PRODUCT_UI = 20;

// MP-MEDIA-1 LOT 2 — Bornes vidéo produit V1.
export const MEDIA_VIDEO_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
export const MEDIA_ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export type MediaAllowedMime = (typeof MEDIA_ALLOWED_IMAGE_MIMES)[number];
export type MediaAllowedVideoMime = (typeof MEDIA_ALLOWED_VIDEO_MIMES)[number];

export interface MediaAsset {
  id: string;
  relatedType: MarketplaceRelatedEntityType;
  relatedId: string;
  mediaType: MediaAssetType;
  role: MediaAssetRole;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  altTextFr: string | null;
  altTextEn: string | null;
  sortOrder: number;
  moderationStatus: MediaModerationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UploadMediaAssetMeta {
  relatedType: MarketplaceRelatedEntityType;
  relatedId: string;
  role?: MediaAssetRole;
  mediaType?: MediaAssetType;
  altTextFr?: string;
  altTextEn?: string;
  sortOrder?: number;
}

function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw && raw.trim().length > 0) return raw.replace(/\/$/, '');
  return '/api/v1';
}

/**
 * Validation client miroir backend. Renvoie un message d'erreur lisible
 * en français OU `null` si le fichier est acceptable.
 */
export function validateImageFile(file: File): string | null {
  if (!(MEDIA_ALLOWED_IMAGE_MIMES as readonly string[]).includes(file.type)) {
    return 'Format non supporté : seules les images PNG, JPEG ou WebP sont acceptées.';
  }
  if (file.size > MEDIA_MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `Fichier trop volumineux (${mb} Mo) — maximum 5 Mo.`;
  }
  return null;
}

/**
 * MP-MEDIA-1 LOT 2 — Validation vidéo (miroir backend).
 * Renvoie `{ ok: true }` ou `{ ok: false, error }`.
 */
export function validateVideoFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!(MEDIA_ALLOWED_VIDEO_MIMES as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      error:
        'Format vidéo non supporté : seules les vidéos MP4, WebM ou MOV (QuickTime) sont acceptées.',
    };
  }
  if (file.size > MEDIA_VIDEO_MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return { ok: false, error: `Vidéo trop volumineuse (${mb} Mo) — maximum 50 Mo.` };
  }
  return { ok: true };
}

export const marketplaceMediaAssetsApi = {
  /**
   * Upload multipart d'une image. `file` arrive en provenance d'un input
   * HTML `<input type="file">`, on le pose tel quel dans le FormData.
   */
  async upload(file: File, meta: UploadMediaAssetMeta, token: string): Promise<MediaAsset> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('relatedType', meta.relatedType);
    fd.append('relatedId', meta.relatedId);
    if (meta.role) fd.append('role', meta.role);
    if (meta.mediaType) fd.append('mediaType', meta.mediaType);
    if (meta.altTextFr) fd.append('altTextFr', meta.altTextFr);
    if (meta.altTextEn) fd.append('altTextEn', meta.altTextEn);
    if (meta.sortOrder !== undefined) fd.append('sortOrder', String(meta.sortOrder));

    const response = await fetch(`${getApiBase()}/marketplace/media-assets/upload`, {
      method: 'POST',
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      // NB : volontairement PAS de Content-Type — laisser le navigateur poser
      // le boundary multipart/form-data.
    });

    const headerRequestId = response.headers.get('x-request-id') ?? undefined;
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text.length ? JSON.parse(text) : {};
    } catch {
      throw new ApiError(
        'INVALID_RESPONSE',
        `Réponse invalide (${response.status})`,
        undefined,
        headerRequestId,
        response.status,
      );
    }

    if (!response.ok) {
      const error = parsed as { error?: { code?: string; message?: string; details?: unknown }; requestId?: string };
      throw new ApiError(
        error.error?.code ?? 'UNKNOWN_ERROR',
        error.error?.message ?? 'Échec du téléversement',
        error.error?.details,
        error.requestId ?? headerRequestId,
        response.status,
      );
    }

    const body = parsed as { data?: MediaAsset };
    if (!body || typeof body !== 'object' || !body.data) {
      throw new ApiError('INVALID_RESPONSE', 'Réponse API inattendue.');
    }
    return body.data;
  },

  /**
   * URL signée temporaire pour prévisualiser un média (tout statut, accès
   * réservé seller/staff/buyer côté backend).
   */
  async getUrl(id: string, token: string): Promise<{ id: string; url: string; expiresIn: number }> {
    const response = await fetch(`${getApiBase()}/marketplace/media-assets/${id}/url`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const text = await response.text();
    const parsed = text.length ? JSON.parse(text) : {};
    if (!response.ok) {
      const err = parsed as { error?: { code?: string; message?: string } };
      throw new ApiError(
        err.error?.code ?? 'UNKNOWN_ERROR',
        err.error?.message ?? 'URL indisponible',
        undefined,
        undefined,
        response.status,
      );
    }
    const body = parsed as { data?: { id: string; url: string; expiresIn: number } };
    if (!body?.data) throw new ApiError('INVALID_RESPONSE', 'URL absente.');
    return body.data;
  },

  // MP-MEDIA-1 LOT 1 — Liste des médias d'une entité (filtrée par role/status).
  async list(
    params: {
      relatedType: MarketplaceRelatedEntityType;
      relatedId: string;
      role?: MediaAssetRole;
      moderationStatus?: MediaModerationStatus;
      limit?: number;
    },
    token: string,
  ): Promise<{ data: MediaAsset[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const qs = new URLSearchParams();
    qs.set('relatedType', params.relatedType);
    qs.set('relatedId', params.relatedId);
    if (params.role) qs.set('role', params.role);
    if (params.moderationStatus) qs.set('moderationStatus', params.moderationStatus);
    qs.set('limit', String(params.limit ?? 100));
    const response = await fetch(`${getApiBase()}/marketplace/media-assets?${qs.toString()}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    const text = await response.text();
    const parsed = text.length ? JSON.parse(text) : {};
    if (!response.ok) {
      const err = parsed as { error?: { code?: string; message?: string } };
      throw new ApiError(
        err.error?.code ?? 'UNKNOWN_ERROR',
        err.error?.message ?? 'Liste indisponible',
        undefined,
        undefined,
        response.status,
      );
    }
    const body = parsed as { data?: MediaAsset[]; meta?: { total: number; page: number; limit: number; totalPages: number } };
    if (!body?.data || !body?.meta) throw new ApiError('INVALID_RESPONSE', 'Réponse liste invalide.');
    return { data: body.data, meta: body.meta };
  },

  // MP-MEDIA-1 LOT 1 — Reorder bulk médias.
  async reorder(
    items: Array<{ id: string; sortOrder: number }>,
    token: string,
  ): Promise<{ count: number }> {
    const response = await fetch(`${getApiBase()}/marketplace/media-assets/reorder`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ items }),
    });
    const text = await response.text();
    const parsed = text.length ? JSON.parse(text) : {};
    if (!response.ok) {
      const err = parsed as { error?: { code?: string; message?: string } };
      throw new ApiError(
        err.error?.code ?? 'UNKNOWN_ERROR',
        err.error?.message ?? 'Reorder échoué',
        undefined,
        undefined,
        response.status,
      );
    }
    const body = parsed as { data?: { count: number } };
    if (!body?.data) throw new ApiError('INVALID_RESPONSE', 'Réponse reorder invalide.');
    return body.data;
  },

  // MP-MEDIA-1 LOT 1 — Suppression d'un média.
  async delete(id: string, token: string): Promise<void> {
    const response = await fetch(`${getApiBase()}/marketplace/media-assets/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      const text = await response.text();
      let err: { error?: { code?: string; message?: string } } = {};
      try {
        err = text.length ? JSON.parse(text) : {};
      } catch {
        /* parsing échoué — fallback générique */
      }
      throw new ApiError(
        err.error?.code ?? 'UNKNOWN_ERROR',
        err.error?.message ?? 'Suppression échouée',
        undefined,
        undefined,
        response.status,
      );
    }
  },
};
