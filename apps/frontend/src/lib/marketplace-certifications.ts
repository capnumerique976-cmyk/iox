// FP-2.1 — Helper API authentifié pour les certifications marketplace
// (édition seller).
//
// Mappé sur `@Controller('marketplace/certifications')` côté backend.
// On expose seulement le sous-ensemble nécessaire à un MARKETPLACE_SELLER :
// list / create / update / delete. Les endpoints staff (verify/reject) et
// la projection publique restent gérés ailleurs (composant
// CertificationBadgeList côté catalogue public).
//
// Le scope est polymorphe (`relatedType` ∈ {SELLER_PROFILE,
// MARKETPLACE_PRODUCT}), l'ownership est imposée côté backend par
// `SellerOwnershipService.assertRelatedEntityOwnership` — on n'a donc pas
// besoin de pré-filtrer ici.

import { api } from './api';
import type {
  CertificationType,
  MarketplaceRelatedEntityType,
  MarketplaceVerificationStatus,
} from '@iox/shared';

export type { CertificationType, MarketplaceRelatedEntityType, MarketplaceVerificationStatus };

/** Projection renvoyée par GET/PATCH/POST (sous-ensemble exposé par le service). */
export interface MarketplaceCertification {
  id: string;
  relatedType: MarketplaceRelatedEntityType;
  relatedId: string;
  type: CertificationType;
  code: string | null;
  issuingBody: string | null;
  issuedAt: string | null;
  validFrom: string | null;
  validUntil: string | null;
  documentMediaId: string | null;
  verificationStatus: MarketplaceVerificationStatus;
  rejectionReason: string | null;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload de création — aligné sur `CreateMarketplaceCertificationDto`.
 * `relatedType` + `relatedId` sont obligatoires côté serveur ; les dates
 * sont des chaînes ISO-8601 (le backend accepte `YYYY-MM-DD`).
 */
export interface CreateMarketplaceCertificationInput {
  relatedType: MarketplaceRelatedEntityType;
  relatedId: string;
  type: CertificationType;
  code?: string;
  issuingBody?: string;
  issuedAt?: string;
  validFrom?: string;
  validUntil?: string;
  documentMediaId?: string;
}

/**
 * Payload de mise à jour — aligné sur `UpdateMarketplaceCertificationDto`.
 * `type` n'est PAS modifiable (le backend ne l'expose pas, c'est volontaire :
 * un changement de type implique une nouvelle entrée).
 */
export interface UpdateMarketplaceCertificationInput {
  code?: string;
  issuingBody?: string;
  issuedAt?: string;
  validFrom?: string;
  validUntil?: string;
  documentMediaId?: string;
}

export interface ListMarketplaceCertificationsParams {
  relatedType: MarketplaceRelatedEntityType;
  relatedId: string;
  page?: number;
  limit?: number;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const marketplaceCertificationsApi = {
  /**
   * Liste les certifications d'une entité (SellerProfile ou MarketplaceProduct).
   * Le backend filtre déjà par ownership pour un MARKETPLACE_SELLER ; pour
   * staff/qualité la liste est complète.
   */
  list: (params: ListMarketplaceCertificationsParams, token: string) =>
    api.get<Paginated<MarketplaceCertification>>(
      `/marketplace/certifications${qs(params as unknown as Record<string, string | number | boolean | undefined>)}`,
      token,
    ),

  create: (dto: CreateMarketplaceCertificationInput, token: string) =>
    api.post<MarketplaceCertification>('/marketplace/certifications', dto, token),

  update: (id: string, dto: UpdateMarketplaceCertificationInput, token: string) =>
    api.patch<MarketplaceCertification>(`/marketplace/certifications/${id}`, dto, token),

  remove: (id: string, token: string) =>
    api.delete<{ id: string; deleted: true }>(`/marketplace/certifications/${id}`, token),
};
