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
};
