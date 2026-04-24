import { api } from './api';
import type { QuoteRequestStatus } from '@iox/shared';

export interface QuoteRequestSummary {
  id: string;
  status: QuoteRequestStatus;
  requestedQuantity: string | number | null;
  requestedUnit: string | null;
  deliveryCountry: string | null;
  targetMarket: string | null;
  message: string | null;
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
  marketplaceOffer: {
    id: string;
    title: string;
    priceMode: string;
    unitPrice: string | number | null;
    currency: string | null;
    moq: string | number | null;
    incoterm: string | null;
    leadTimeDays: number | null;
    departureLocation: string | null;
    sellerProfile: { id: string; slug: string; publicDisplayName: string } | null;
    marketplaceProduct: { id: string; slug: string; commercialName: string } | null;
  };
  buyerCompany: { id: string; code: string; name: string; country: string | null } | null;
  buyerUser: { id: string; firstName: string; lastName: string; email: string } | null;
  assignedToUser: { id: string; firstName: string; lastName: string } | null;
  _count?: { messages: number };
}

export interface QuoteRequestMessage {
  id: string;
  message: string;
  isInternalNote: boolean;
  createdAt: string;
  authorUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface CreateQuoteRequestPayload {
  marketplaceOfferId: string;
  buyerCompanyId: string;
  requestedQuantity?: number;
  requestedUnit?: string;
  deliveryCountry?: string;
  targetMarket?: string;
  message?: string;
}

export interface QuoteRequestListResponse {
  data: QuoteRequestSummary[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const quoteRequestsApi = {
  list: (token: string, params: Record<string, string | undefined> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<QuoteRequestListResponse>(`/marketplace/quote-requests${suffix}`, token);
  },
  get: (id: string, token: string) =>
    api.get<QuoteRequestSummary>(`/marketplace/quote-requests/${id}`, token),
  create: (payload: CreateQuoteRequestPayload, token: string) =>
    api.post<QuoteRequestSummary>('/marketplace/quote-requests', payload, token),
  updateStatus: (id: string, status: QuoteRequestStatus, token: string, note?: string) =>
    api.patch<QuoteRequestSummary>(
      `/marketplace/quote-requests/${id}/status`,
      { status, note },
      token,
    ),
  messages: (id: string, token: string) =>
    api.get<QuoteRequestMessage[]>(`/marketplace/quote-requests/${id}/messages`, token),
  addMessage: (id: string, token: string, message: string, isInternalNote = false) =>
    api.post<QuoteRequestMessage>(
      `/marketplace/quote-requests/${id}/messages`,
      { message, isInternalNote },
      token,
    ),
};
