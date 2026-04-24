import { api } from './api';
import { UserRole } from '@iox/shared';

export interface MembershipRow {
  id: string;
  userId: string;
  companyId: string;
  isPrimary: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  company: {
    id: string;
    code: string;
    name: string;
    sellerProfile: {
      id: string;
      publicDisplayName: string | null;
      status: string;
    } | null;
  };
}

export interface OrphanSeller {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface MembershipsDiagnostic {
  totalSellerUsers: number;
  sellersWithMembership: number;
  sellersWithoutMembership: number;
  totalMemberships: number;
  membershipsWithoutSellerProfile: number;
}

interface Paginated<T> {
  data: T[];
  meta: { total: number; page?: number; limit?: number; totalPages?: number };
}

export interface ListMembershipsParams {
  userId?: string;
  companyId?: string;
  page?: number;
  limit?: number;
}

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export async function listMemberships(
  token: string,
  params: ListMembershipsParams = {},
): Promise<Paginated<MembershipRow>> {
  return api.get(
    `/admin/memberships${qs({ ...params } as Record<string, string | number | undefined>)}`,
    token,
  );
}

export async function listOrphanSellers(token: string): Promise<Paginated<OrphanSeller>> {
  return api.get('/admin/memberships/orphan-sellers', token);
}

export async function listOrphanMemberships(token: string): Promise<Paginated<MembershipRow>> {
  return api.get('/admin/memberships/orphan-memberships', token);
}

export async function getMembershipsDiagnostic(token: string): Promise<MembershipsDiagnostic> {
  return api.get('/admin/memberships/diagnostic', token);
}

export async function createMembership(
  token: string,
  payload: { userId: string; companyId: string; isPrimary?: boolean },
): Promise<MembershipRow> {
  return api.post('/admin/memberships', payload, token);
}

export async function deleteMembership(
  token: string,
  id: string,
): Promise<{ success: boolean; autoPromotedMembershipId: string | null }> {
  return api.delete(`/admin/memberships/${id}`, token);
}

export async function setPrimaryMembership(token: string, id: string): Promise<MembershipRow> {
  return api.patch(`/admin/memberships/${id}/primary`, {}, token);
}
