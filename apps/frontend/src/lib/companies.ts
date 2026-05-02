// BUYER-DASHBOARD-2 — Helper API companies (lecture seule côté buyer).
//
// `findMine` retourne les companies dont l'utilisateur connecté est
// membre (cf. backend `GET /companies/mine`). Pour un MARKETPLACE_BUYER,
// c'est typiquement sa company acheteuse. Pour ADMIN, dépend des
// memberships explicites.

import { api } from './api';

export interface CompanySummary {
  id: string;
  code: string;
  name: string;
  types: string[];
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  vatNumber: string | null;
  website: string | null;
  postalCode: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { supplyContracts: number; inboundBatches: number; documents: number };
}

export interface UpdateMyCompanyInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  vatNumber?: string;
  website?: string;
  postalCode?: string;
  description?: string;
}

export const companiesApi = {
  findMine: (token: string) => api.get<CompanySummary[]>('/companies/mine', token),
  // BUYER-DASHBOARD-3 — édition self-service champs identité/contact.
  updateMine: (id: string, dto: UpdateMyCompanyInput, token: string) =>
    api.patch<CompanySummary>(`/companies/mine/${id}`, dto, token),
};
