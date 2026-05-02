// PAY-2 — Invoice API helper.
//
// Consomme les endpoints :
//  - GET /invoices        (liste paginee, scope auto par role)
//  - GET /invoices/:id    (detail)

import { api } from './api';

export interface InvoiceSummary {
  id: string;
  paymentId: string;
  sellerProfileId: string;
  buyerCompanyId: string;
  invoiceNumber: string;
  amountCents: number;
  currency: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELED';
  pdfStorageKey: string | null;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListResponse {
  data: InvoiceSummary[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const invoicesApi = {
  list: (params: Record<string, string | undefined>, token: string) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<InvoiceListResponse>(`/invoices${suffix}`, token);
  },
  get: (id: string, token: string) =>
    api.get<InvoiceSummary>(`/invoices/${id}`, token),
};
