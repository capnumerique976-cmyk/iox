// Helper API authentifié pour les produits marketplace côté seller.
//
// Étendu pour MP-EDIT-PRODUCT.1 — édition des champs textuels sûrs.
// Le type `UpdateMarketplaceProductInput` n'expose **délibérément** que les
// champs autorisés au seller. Tenter d'envoyer `slug`, `categoryId`,
// `mainMediaId`, `publicationStatus` etc. via `update()` sera rejeté par
// `tsc` à la compilation — défense en profondeur en plus du whitelist
// backend.
//
// Couvre :
//   - lister les produits du vendeur connecté
//   - récupérer un produit par id (projection riche pour l'écran d'édition)
//   - PATCH ciblé saisonnalité (FP-1, conservé)
//   - PATCH ciblé édition de contenu (MP-EDIT-PRODUCT.1)

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

/**
 * Projection seller renvoyée par GET /marketplace/products[/:id].
 *
 * Tous les champs « sûrs » éditables MP-EDIT-PRODUCT.1 sont déclarés
 * optionnels (le backend renvoie `null` quand non renseigné). gpsLat/gpsLng
 * arrivent typiquement en string (Decimal Prisma sérialisé) ou number selon
 * la version de Prisma — on accepte les deux et on parse côté UI.
 */
export interface SellerMarketplaceProduct {
  id: string;
  slug: string;
  commercialName: string;
  publicationStatus: MarketplacePublicationStatus;

  // Identité publique
  regulatoryName?: string | null;
  subtitle?: string | null;

  // Origine
  originCountry: string;
  originRegion?: string | null;
  originLocality?: string | null;
  altitudeMeters?: number | null;
  gpsLat?: string | number | null;
  gpsLng?: string | number | null;

  // Variétés et méthode
  varietySpecies?: string | null;
  productionMethod?: string | null;

  // Descriptions
  descriptionShort?: string | null;
  descriptionLong?: string | null;
  usageTips?: string | null;

  // Conservation
  packagingDescription?: string | null;
  storageConditions?: string | null;
  shelfLifeInfo?: string | null;
  allergenInfo?: string | null;

  // FP-8 — Logistique structurée. grossWeight/netWeight arrivent en string
  // (Decimal sérialisé) ou number selon Prisma — on accepte les deux.
  packagingFormats?: string[];
  temperatureRequirements?: string | null;
  grossWeight?: string | number | null;
  netWeight?: string | number | null;
  palletization?: string | null;

  // Saisonnalité (édition via /seasonality, lecture seule ici)
  harvestMonths: SeasonalityMonth[];
  availabilityMonths: SeasonalityMonth[];
  isYearRound: boolean;

  // Lecture seule — affichés mais pas édités dans MP-EDIT-PRODUCT.1
  defaultUnit?: string | null;
  minimumOrderQuantity?: number | null;

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

/**
 * Champs autorisés en édition seller (MP-EDIT-PRODUCT.1).
 *
 * Les champs interdits (slug, categoryId, productId, sellerProfileId,
 * mainMediaId, harvestMonths, availabilityMonths, isYearRound,
 * minimumOrderQuantity, defaultUnit, nutritionInfoJson, publicationStatus,
 * scoring/audit) **ne figurent pas** dans cette interface. Tout appel
 * `update(id, { slug: '…' }, tok)` sera rejeté par tsc à la compilation
 * (excess property check + objet littéral).
 */
export interface UpdateMarketplaceProductInput {
  // Identité publique
  commercialName?: string;
  regulatoryName?: string;
  subtitle?: string;

  // Origine
  originCountry?: string;
  originRegion?: string;
  originLocality?: string;
  altitudeMeters?: number;
  gpsLat?: number;
  gpsLng?: number;

  // Variétés
  varietySpecies?: string;
  productionMethod?: string;

  // Descriptions
  descriptionShort?: string;
  descriptionLong?: string;
  usageTips?: string;

  // Conservation
  packagingDescription?: string;
  storageConditions?: string;
  shelfLifeInfo?: string;
  allergenInfo?: string;

  // FP-8 — Logistique structurée
  packagingFormats?: string[];
  temperatureRequirements?: string;
  grossWeight?: number;
  netWeight?: number;
  palletization?: string;
}

/**
 * MP-EDIT-PRODUCT.2 — Champs autorisés à la création d'un brouillon seller.
 *
 * Tous les champs `UpdateMarketplaceProductInput` sont permis (édition à
 * la création) PLUS les 2 champs requis backend `productId` et
 * `sellerProfileId` qui ne sont autorisés qu'à la création (immuables après).
 *
 * Champs interdits — non typés ici, donc rejetés par tsc :
 *   - `categoryId` (taxonomie staff)
 *   - `mainMediaId` (workflow upload séparé)
 *   - `nutritionInfoJson` (lot dédié)
 *   - `harvestMonths`, `availabilityMonths`, `isYearRound`
 *     (édition via /seasonality)
 *   - `defaultUnit`, `minimumOrderQuantity` (FP-5)
 *   - workflow / scoring (gérés serveur)
 */
export interface CreateMarketplaceProductInput extends UpdateMarketplaceProductInput {
  productId: string;
  sellerProfileId: string;
  commercialName: string;
  slug: string;
  originCountry: string;
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

  /**
   * MP-EDIT-PRODUCT.2 — Création d'un brouillon marketplace par le seller.
   * Le backend impose `publicationStatus=DRAFT` et `exportReadinessStatus=
   * PENDING_QUALITY_REVIEW` indépendamment du payload.
   */
  create: (dto: CreateMarketplaceProductInput, token: string) =>
    api.post<SellerMarketplaceProduct>('/marketplace/products', dto, token),

  /**
   * MP-EDIT-PRODUCT.2 — Soumettre à la revue qualité.
   * Allowed transitions backend : DRAFT|REJECTED → IN_REVIEW.
   */
  submit: (id: string, token: string) =>
    api.post<SellerMarketplaceProduct>(`/marketplace/products/${id}/submit`, {}, token),

  /**
   * MP-EDIT-PRODUCT.2 — Archiver un produit (action seller destructive).
   * Le backend autorise depuis n'importe quel statut sauf ARCHIVED.
   */
  archive: (id: string, token: string) =>
    api.post<SellerMarketplaceProduct>(`/marketplace/products/${id}/archive`, {}, token),

  /**
   * Mise à jour ciblée des champs textuels sûrs (MP-EDIT-PRODUCT.1).
   *
   * Le payload est typé `UpdateMarketplaceProductInput` qui exclut
   * strictement les champs interdits (slug, categoryId, mainMediaId,
   * publicationStatus, saisonnalité, MOQ, défaultUnit, nutrition…).
   * Le backend applique en plus la cohérence pair `gpsLat`/`gpsLng` et le
   * déclenchement re-revue sur statut APPROVED/PUBLISHED.
   */
  update: (id: string, dto: UpdateMarketplaceProductInput, token: string) =>
    api.patch<SellerMarketplaceProduct>(`/marketplace/products/${id}`, dto, token),
};
