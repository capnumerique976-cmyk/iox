// MP-NOTIF-3 — Helper API frontend pour `/notif-email/*`.

import { api } from './api';

export interface EmailLogItem {
  id: string;
  transport: string;
  templateId: string;
  recipientEmail: string;
  recipientUserId: string | null;
  subject: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  errorCode: string | null;
  errorMessage: string | null;
  providerMessageId: string | null;
  metadataJson: unknown;
  createdAt: string;
}

export interface EmailLogListResponse {
  data: EmailLogItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ListEmailLogsParams {
  page?: number;
  limit?: number;
  status?: 'SENT' | 'FAILED' | 'SKIPPED';
  templateId?: string;
  recipientEmail?: string;
  createdAtAfter?: string;
}

export const notifEmailApi = {
  listLogs: (params: ListEmailLogsParams, token: string) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<EmailLogListResponse>(`/notif-email/logs${suffix}`, token);
  },
  // MP-NOTIF-3 phase 3 — détail unitaire (avec metadataJson complet).
  getLogById: (id: string, token: string) =>
    api.get<EmailLogItem>(`/notif-email/logs/${id}`, token),

  // MP-NOTIF-3 phase 4 — liste désinscriptions (admin).
  listUnsubscribes: (params: ListUnsubscribesParams, token: string) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<UnsubscribeListResponse>(`/notif-email/unsubscribes${suffix}`, token);
  },
};

// MP-NOTIF-3 phase 4 — types unsubscribe.
export type EmailUnsubscribeType = 'ALL' | 'RFQ_NOTIFICATIONS' | 'TRANSACTIONAL';

export interface EmailUnsubscribeItem {
  id: string;
  email: string;
  unsubscribeType: EmailUnsubscribeType;
  userId: string | null;
  reason: string | null;
  createdAt: string;
}

export interface UnsubscribeListResponse {
  data: EmailUnsubscribeItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ListUnsubscribesParams {
  page?: number;
  limit?: number;
  type?: EmailUnsubscribeType;
  email?: string;
}

// MP-NOTIF-3 phase 5 — types stats EmailLog.
export interface EmailLogsStats {
  byStatus: Array<{ status: 'SENT' | 'FAILED' | 'SKIPPED'; count: number }>;
  byTemplate: Array<{ templateId: string; count: number }>;
  byDay: Array<{ day: string; sent: number; failed: number; skipped: number }>;
}

export const notifEmailStatsApi = {
  getStats: (token: string) => api.get<EmailLogsStats>('/notif-email/logs-stats', token),
};
