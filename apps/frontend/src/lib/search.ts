// MeiliSearch full-text search — frontend API helper.
// Calls GET /marketplace/search/products and /marketplace/search/sellers.

function resolveApiBase(): string {
  const publicOverride = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (publicOverride) return publicOverride;
  if (typeof window === 'undefined') {
    const internal = (
      process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:3001'
    ).replace(/\/$/, '');
    return `${internal}/api/v1`;
  }
  return '/api/v1';
}

export interface SearchMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  backend: 'meilisearch' | 'postgres';
  processingTimeMs?: number;
}

export interface SearchResponse<T> {
  data: T[];
  meta: SearchMeta;
}

export interface SearchProductHit {
  id: string;
  commercialName: string;
  subtitle?: string | null;
  slug: string;
  originCountry: string;
  originRegion?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  sellerDisplayName: string;
  publicationStatus: string;
}

export interface SearchSellerHit {
  id: string;
  publicDisplayName: string;
  slug: string;
  descriptionShort?: string | null;
  country?: string | null;
  region?: string | null;
  status: string;
}

export interface SearchProductsParams {
  q?: string;
  category?: string;
  country?: string;
  availabilityMonth?: string;
  moqMax?: number;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface SearchSellersParams {
  q?: string;
  country?: string;
  region?: string;
  page?: number;
  limit?: number;
}

function toQueryString(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '' && value !== undefined) {
      sp.set(key, String(value));
    }
  }
  return sp.toString();
}

async function searchGet<T>(path: string): Promise<T> {
  const API_BASE = resolveApiBase();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Search unavailable (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function searchProducts(
  params: SearchProductsParams,
): Promise<SearchResponse<SearchProductHit>> {
  const qs = toQueryString(params as Record<string, unknown>);
  return searchGet<SearchResponse<SearchProductHit>>(
    `/marketplace/search/products${qs ? `?${qs}` : ''}`,
  );
}

export async function searchSellers(
  params: SearchSellersParams,
): Promise<SearchResponse<SearchSellerHit>> {
  const qs = toQueryString(params as Record<string, unknown>);
  return searchGet<SearchResponse<SearchSellerHit>>(
    `/marketplace/search/sellers${qs ? `?${qs}` : ''}`,
  );
}
