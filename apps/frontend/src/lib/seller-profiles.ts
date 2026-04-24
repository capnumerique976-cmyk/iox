import { api } from './api';
import type { SellerProfileStatus } from '@iox/shared';

/**
 * Client API — profils vendeurs marketplace (vue admin/qualité).
 *
 * Mappé sur `@Controller('marketplace/seller-profiles')` côté backend.
 * N'expose volontairement QUE les endpoints admin/QUALITY_MANAGER :
 * la partie seller (edit self) reste gérée dans le flow onboarding.
 */

export interface SellerProfileRow {
  id: string;
  companyId: string;
  slug: string;
  publicDisplayName: string | null;
  tagline: string | null;
  status: SellerProfileStatus;
  isFeatured: boolean;
  country: string | null;
  region: string | null;
  rejectionReason: string | null;
  suspensionReason: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; code: string; name: string };
  _count?: { marketplaceOffers: number; marketplaceProducts: number };
}

export interface SellerProfileDetail extends SellerProfileRow {
  aboutFr: string | null;
  aboutEn: string | null;
  mainProductCategories: string[] | null;
  destinationsServed: string[] | null;
  certifications: string[] | null;
  averageLeadTimeDays: number | null;
  websiteUrl: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  logoMediaId: string | null;
  bannerMediaId: string | null;
  approvedByUser?: { id: string; firstName: string; lastName: string } | null;
}

export interface ListSellerProfilesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SellerProfileStatus;
  country?: string;
  region?: string;
  isFeatured?: boolean;
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

export const sellerProfilesApi = {
  list: (token: string, params: ListSellerProfilesParams = {}) =>
    api.get<Paginated<SellerProfileRow>>(
      `/marketplace/seller-profiles${qs(params as Record<string, string | number | boolean | undefined>)}`,
      token,
    ),

  get: (id: string, token: string) =>
    api.get<SellerProfileDetail>(`/marketplace/seller-profiles/${id}`, token),

  approve: (id: string, token: string) =>
    api.post<SellerProfileDetail>(`/marketplace/seller-profiles/${id}/approve`, {}, token),

  reject: (id: string, reason: string, token: string) =>
    api.post<SellerProfileDetail>(`/marketplace/seller-profiles/${id}/reject`, { reason }, token),

  suspend: (id: string, reason: string, token: string) =>
    api.post<SellerProfileDetail>(`/marketplace/seller-profiles/${id}/suspend`, { reason }, token),

  reinstate: (id: string, token: string) =>
    api.post<SellerProfileDetail>(`/marketplace/seller-profiles/${id}/reinstate`, {}, token),

  feature: (id: string, token: string) =>
    api.post<SellerProfileDetail>(`/marketplace/seller-profiles/${id}/feature`, {}, token),

  unfeature: (id: string, token: string) =>
    api.post<SellerProfileDetail>(`/marketplace/seller-profiles/${id}/unfeature`, {}, token),
};
