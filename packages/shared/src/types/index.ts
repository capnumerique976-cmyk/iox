import { UserRole } from '../enums';

// ─── ENVELOPPE DE RÉPONSE API STANDARD ────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  /**
   * Identifiant de corrélation de la requête (propagé via l'en-tête
   * `x-request-id`). Présent en erreur pour permettre au support de
   * retrouver la trace serveur correspondante dans les logs.
   */
  requestId?: string;
  timestamp: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// ─── PAYLOAD JWT ───────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ─── CONTEXTE UTILISATEUR (disponible dans les requêtes authentifiées) ─────
export interface RequestUser {
  id: string;
  email: string;
  role: UserRole;
  /**
   * V2 — IDs des `SellerProfile` accessibles par ce user, résolus à la
   * validation du JWT via la table `UserCompanyMembership`
   * (User → Company → SellerProfile).
   *
   * - `[]` pour un user sans rattachement (staff IOX, buyer, beneficiary).
   * - `[id1]` pour un seller attaché à une seule company possédant un profil.
   * - `[id1, id2, ...]` pour les cas multi-company (consultant, groupe).
   *
   * Les services marketplace utilisent ce tableau pour vérifier l'ownership
   * d'une ressource seller-scope. Les rôles staff (ADMIN/COORDINATOR/
   * QUALITY_MANAGER/AUDITOR) bypassent la vérification côté SellerOwnershipService.
   */
  sellerProfileIds?: string[];
  /** IDs des Companies dont l'utilisateur est membre. */
  companyIds?: string[];
}

// ─── CODES FONCTIONNELS ────────────────────────────────────────────────────
// BEN-0001, PRD-0001, IB-2026-0001, PB-2026-0001
export type FunctionalCode = string;
