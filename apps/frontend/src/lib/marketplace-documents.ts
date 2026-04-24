import { api } from './api';
import type {
  MarketplaceDocumentVisibility,
  MarketplaceRelatedEntityType,
  MarketplaceVerificationStatus,
} from '@iox/shared';

/**
 * Vue vendeur / staff d'un document marketplace.
 * Inclut le Document source projeté (métadonnées fichier + storageKey).
 */
export interface MarketplaceDocumentRow {
  id: string;
  relatedType: MarketplaceRelatedEntityType;
  relatedId: string;
  documentId: string;
  documentType: string;
  title: string;
  visibility: MarketplaceDocumentVisibility;
  verificationStatus: MarketplaceVerificationStatus;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
  document: {
    id: string;
    name: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    status: string;
    expiresAt: string | null;
  };
}

export interface MarketplaceDocumentListResponse {
  data: MarketplaceDocumentRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface CreateMarketplaceDocumentPayload {
  relatedType: MarketplaceRelatedEntityType;
  relatedId: string;
  documentId: string;
  documentType: string;
  title: string;
  visibility?: MarketplaceDocumentVisibility;
  validFrom?: string;
  validUntil?: string;
}

export interface UpdateMarketplaceDocumentPayload {
  title?: string;
  documentType?: string;
  visibility?: MarketplaceDocumentVisibility;
  validFrom?: string;
  validUntil?: string;
}

/**
 * Item brut de la queue de revue (projection utile au vendeur).
 * Le vendeur n'a PAS le droit de décider — lecture seule pour voir l'état
 * de ses docs PENDING/APPROVED/REJECTED et le motif éventuel.
 */
export interface ReviewQueueItem {
  id: string;
  entityType: MarketplaceRelatedEntityType;
  entityId: string;
  reviewType: 'PUBLICATION' | 'MEDIA' | 'DOCUMENT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewReason: string | null;
  reviewedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const marketplaceDocumentsApi = {
  list: (
    params: {
      relatedType: MarketplaceRelatedEntityType;
      relatedId: string;
      limit?: number;
    },
    token: string,
  ) => {
    const qs = new URLSearchParams({
      relatedType: params.relatedType,
      relatedId: params.relatedId,
      limit: String(params.limit ?? 50),
    });
    return api.get<MarketplaceDocumentListResponse>(
      `/marketplace/documents?${qs.toString()}`,
      token,
    );
  },

  get: (id: string, token: string) =>
    api.get<MarketplaceDocumentRow>(`/marketplace/documents/${id}`, token),

  create: (payload: CreateMarketplaceDocumentPayload, token: string) =>
    api.post<MarketplaceDocumentRow>('/marketplace/documents', payload, token),

  update: (id: string, payload: UpdateMarketplaceDocumentPayload, token: string) =>
    api.patch<MarketplaceDocumentRow>(`/marketplace/documents/${id}`, payload, token),

  remove: (id: string, token: string) =>
    api.delete<{ id: string; deleted: boolean }>(`/marketplace/documents/${id}`, token),

  /** URL signée (tout statut — réservée seller/staff). */
  getUrl: (id: string, token: string) =>
    api.get<{ id: string; url: string; expiresIn: number }>(
      `/marketplace/documents/${id}/url`,
      token,
    ),

  /**
   * Items de revue attachés à un marketplaceDocument donné.
   * On filtre côté client par entityId (= marketplaceDocument.id) et reviewType=DOCUMENT.
   */
  reviewItemsFor: (marketplaceDocumentId: string, token: string) => {
    const qs = new URLSearchParams({
      reviewType: 'DOCUMENT',
      entityId: marketplaceDocumentId,
      limit: '5',
    });
    return api.get<{ data: ReviewQueueItem[]; meta: unknown }>(
      `/marketplace/review-queue?${qs.toString()}`,
      token,
    );
  },

  /** Documents existants rattachés à une entité (Document côté socle). */
  listSourceDocuments: (
    params: { linkedEntityType: string; linkedEntityId: string },
    token: string,
  ) => {
    const qs = new URLSearchParams({
      linkedEntityType: params.linkedEntityType,
      linkedEntityId: params.linkedEntityId,
      status: 'ACTIVE',
      limit: '100',
    });
    return api.get<{
      data: Array<{
        id: string;
        name: string;
        originalFilename: string;
        mimeType: string;
        sizeBytes: number;
        createdAt: string;
      }>;
      meta: unknown;
    }>(`/documents?${qs.toString()}`, token);
  },
};
