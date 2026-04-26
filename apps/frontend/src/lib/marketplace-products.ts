// FP-4 — Helper API authentifié pour les produits marketplace côté seller.
//
// Couvre uniquement la partie nécessaire à l'édition seller (lot FP-4) :
//   - lister les produits du vendeur connecté (le backend applique
//     automatiquement le filtre `scopeSellerProfileFilter` sur le rôle
//     MARKETPLACE_SELLER, on n'a donc pas besoin de passer `sellerProfileId`)
//   - récupérer un produit par id
//   - PATCH ciblé sur la saisonnalité (FP-1) — le backend accepte
//     `harvestMonths`, `availabilityMonths`, `isYearRound` via
//     `UpdateMarketplaceProductDto`.

import { api } from './api';
import type { SeasonalityMonth } from './marketplace/types';

export type MarketplacePublicationStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'ARCHIVED';

/** Projection minimale renvoyée par GET /marketplace/products[/:id]. */
export interface SellerMarketplaceProduct {
  id: string;
  slug: string;
  commercialName: string;
  publicationStatus: MarketplacePublicationStatus;
  originCountry: string;
  originRegion: string | null;
  // FP-6 — origine fine (tous optionnels). gpsLat/gpsLng arrivent en string
  // depuis Prisma (Decimal sérialisé), à parser côté UI si besoin numérique.
  originLocality?: string | null;
  altitudeMeters?: number | null;
  gpsLat?: string | number | null;
  gpsLng?: string | number | null;
  harvestMonths: SeasonalityMonth[];
  availabilityMonths: SeasonalityMonth[];
  isYearRound: boolean;
  updatedAt: string;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface UpdateSeasonalityInput {
  harvestMonths: SeasonalityMonth[];
  availabilityMonths: SeasonalityMonth[];
  isYearRound: boolean;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export interface ListMyMarketplaceProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  publicationStatus?: MarketplacePublicationStatus;
}

export const marketplaceProductsApi = {
  /**
   * Liste les produits marketplace visibles par l'acteur courant.
   *
   * Pour un MARKETPLACE_SELLER, le backend restreint automatiquement aux
   * produits dont `sellerProfileId` ∈ `actor.sellerProfileIds` via
   * `SellerOwnershipService.scopeSellerProfileFilter`.
   */
  listMine: (token: string, params: ListMyMarketplaceProductsParams = {}) =>
    api.get<Paginated<SellerMarketplaceProduct>>(
      `/marketplace/products${qs(params as Record<string, string | number | boolean | undefined>)}`,
      token,
    ),

  getById: (id: string, token: string) =>
    api.get<SellerMarketplaceProduct>(`/marketplace/products/${id}`, token),

  /**
   * Mise à jour ciblée saisonnalité — n'envoie QUE les 3 champs concernés
   * pour éviter tout effet de bord sur les descriptions ou la slug.
   */
  updateSeasonality: (id: string, dto: UpdateSeasonalityInput, token: string) =>
    api.patch<SellerMarketplaceProduct>(`/marketplace/products/${id}`, dto, token),
};
