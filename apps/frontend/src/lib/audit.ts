import { api } from './api';
import type { EntityType } from '@iox/shared';

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: EntityType;
  entityId: string;
  previousData: unknown;
  newData: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  notes: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  } | null;
}

export interface AuditLogListResponse {
  data: AuditLogItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ListAuditLogsParams {
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export const auditApi = {
  list: (params: ListAuditLogsParams, token: string) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<AuditLogListResponse>(`/audit-logs${suffix}`, token);
  },
};
