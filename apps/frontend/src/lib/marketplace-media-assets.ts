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

export type MediaAllowedMime = (typeof MEDIA_ALLOWED_IMAGE_MIMES)[number];

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
};
