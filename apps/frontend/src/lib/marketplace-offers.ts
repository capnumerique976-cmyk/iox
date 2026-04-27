// Helper API authentifié pour les offres marketplace côté seller.
//
// Pattern miroir de `marketplace-products.ts`. Le backend
// (`/marketplace/offers`) restreint automatiquement les requêtes seller
// au scope ownership (`SellerOwnershipService.scopeSellerProfileFilter`).
//
// MP-OFFER-VIEW (LOT 1 mandat 14) — lecture seule :
//   - listMine(token, params)
//   - getById(id, token)
//
// L'édition (PATCH/POST) est introduite par MP-OFFER-EDIT-1 (LOT 2).

import { api } from './api';

export type MarketplacePublicationStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'ARCHIVED';

export type MarketplacePriceMode = 'FIXED' | 'QUOTE_ONLY' | 'FROM_PRICE';

export type MarketplaceVisibilityScope = 'PUBLIC' | 'BUYERS_ONLY' | 'PRIVATE';

export type ExportReadinessStatus =
  | 'NOT_ELIGIBLE'
  | 'INTERNAL_ONLY'
  | 'PENDING_DOCUMENTS'
  | 'PENDING_QUALITY_REVIEW'
  | 'EXPORT_READY'
  | 'EXPORT_READY_WITH_CONDITIONS';

/**
 * Projection seller d'une offre marketplace renvoyée par
 * `GET /marketplace/offers[/:id]`. Aligné sur `OFFER_INCLUDE` backend
 * (`marketplace-offers.service.ts`).
 *
 * Les valeurs Decimal Prisma (unitPrice, moq, availableQuantity) arrivent
 * sérialisées en `string` ou `number` selon le sérialiseur — on accepte
 * les deux côté lecture, parsing au point d'usage.
 */
export interface MarketplaceOfferDetail {
  id: string;
  marketplaceProductId: string;
  sellerProfileId: string;

  // Identité
  title: string;
  shortDescription?: string | null;

  // Prix
  priceMode: MarketplacePriceMode;
  unitPrice?: string | number | null;
  currency?: string | null;
  moq?: string | number | null;
  availableQuantity?: string | number | null;

  // Disponibilité
  availabilityStart?: string | null;
  availabilityEnd?: string | null;
  leadTimeDays?: number | null;

  // Logistique commerciale
  incoterm?: string | null;
  departureLocation?: string | null;
  destinationMarketsJson?: Record<string, unknown> | unknown[] | null;

  // Visibilité + workflow
  visibilityScope: MarketplaceVisibilityScope;
  publicationStatus: MarketplacePublicationStatus;
  exportReadinessStatus: ExportReadinessStatus;
  featuredRank?: number | null;
  rejectionReason?: string | null;

  // Dates workflow
  submittedAt?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  suspendedAt?: string | null;
  createdAt?: string;
  updatedAt: string;

  // Relations embarquées (cf. OFFER_INCLUDE backend)
  marketplaceProduct?: {
    id: string;
    slug: string;
    commercialName: string;
    publicationStatus: MarketplacePublicationStatus;
    sellerProfileId: string;
  } | null;
  sellerProfile?: {
    id: string;
    slug: string;
    publicDisplayName: string;
    status: string;
  } | null;
  _count?: {
    offerBatches: number;
    quoteRequests: number;
  } | null;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ListMyMarketplaceOffersParams {
  page?: number;
  limit?: number;
  search?: string;
  marketplaceProductId?: string;
  publicationStatus?: MarketplacePublicationStatus;
  exportReadinessStatus?: ExportReadinessStatus;
  visibilityScope?: MarketplaceVisibilityScope;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const marketplaceOffersApi = {
  /**
   * Liste les offres marketplace visibles par l'acteur courant.
   * Pour un MARKETPLACE_SELLER, le backend restreint automatiquement aux
   * offres dont `sellerProfileId` ∈ `actor.sellerProfileIds` via
   * `SellerOwnershipService.scopeSellerProfileFilter`.
   */
  listMine: (token: string, params: ListMyMarketplaceOffersParams = {}) =>
    api.get<Paginated<MarketplaceOfferDetail>>(
      `/marketplace/offers${qs(params as Record<string, string | number | boolean | undefined>)}`,
      token,
    ),

  getById: (id: string, token: string) =>
    api.get<MarketplaceOfferDetail>(`/marketplace/offers/${id}`, token),
};
