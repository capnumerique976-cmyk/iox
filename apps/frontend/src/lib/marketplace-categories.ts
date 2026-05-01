// MP-CATEGORY-1 — Helper API admin catégories marketplace.

import { ApiError } from './api';

export interface CategoryNode {
  id: string;
  slug: string;
  nameFr: string;
  nameEn: string | null;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  productsCount: number;
  children: CategoryNode[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  slug: string;
  nameFr: string;
  nameEn: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  nameFr?: string;
  nameEn?: string;
  description?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw && raw.trim().length > 0) return raw.replace(/\/$/, '');
  return '/api/v1';
}

async function request<T>(
  path: string,
  init: RequestInit & { token?: string },
): Promise<T> {
  const { token, headers, ...rest } = init;
  const response = await fetch(`${getApiBase()}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
  });
  const text = await response.text();
  const parsed = text.length ? JSON.parse(text) : {};
  if (!response.ok) {
    const err = parsed as { error?: { code?: string; message?: string } };
    throw new ApiError(
      err.error?.code ?? 'UNKNOWN_ERROR',
      err.error?.message ?? `Erreur API (${response.status})`,
      undefined,
      undefined,
      response.status,
    );
  }
  const body = parsed as { data?: T };
  if (body.data === undefined) {
    throw new ApiError('INVALID_RESPONSE', 'Réponse API inattendue.');
  }
  return body.data;
}

export const adminCategoriesApi = {
  async listTree(includeInactive: boolean, token: string): Promise<CategoryNode[]> {
    const qs = includeInactive ? '?includeInactive=true' : '';
    return request<CategoryNode[]>(`/admin/marketplace/categories${qs}`, {
      method: 'GET',
      token,
    });
  },

  async create(input: CreateCategoryInput, token: string): Promise<CategoryNode> {
    return request<CategoryNode>('/admin/marketplace/categories', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    });
  },

  async update(id: string, input: UpdateCategoryInput, token: string): Promise<CategoryNode> {
    return request<CategoryNode>(`/admin/marketplace/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
      token,
    });
  },

  async remove(
    id: string,
    token: string,
  ): Promise<{ id: string; deleted: boolean; deactivated: boolean }> {
    return request<{ id: string; deleted: boolean; deactivated: boolean }>(
      `/admin/marketplace/categories/${id}`,
      { method: 'DELETE', token },
    );
  },
};
