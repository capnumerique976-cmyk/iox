import type { CatalogResponse, ProductDetail, SellerPublic } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '/api/v1';

async function publicGet<T>(path: string): Promise<T> {
  // En E2E, on désactive totalement le Data Cache de Next : chaque test reseed
  // l'état du mock backend et attend un rendu SSR frais. En prod, on garde
  // l'ISR 60s pour le catalogue public.
  const cacheOpts =
    process.env.NEXT_PUBLIC_E2E === '1'
      ? { cache: 'no-store' as const }
      : { next: { revalidate: 60 } };
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    ...cacheOpts,
  });
  if (!res.ok) {
    throw new Error(`Catalogue indisponible (${res.status})`);
  }
  const body = await res.json();
  return (body?.data ?? body) as T;
}

export function fetchCatalog(search: URLSearchParams): Promise<CatalogResponse> {
  const qs = search.toString();
  return publicGet<CatalogResponse>(`/marketplace/catalog${qs ? `?${qs}` : ''}`);
}

export function fetchProductBySlug(slug: string): Promise<ProductDetail> {
  return publicGet<ProductDetail>(`/marketplace/catalog/products/${encodeURIComponent(slug)}`);
}

export function fetchSellerBySlug(slug: string): Promise<SellerPublic> {
  return publicGet<SellerPublic>(`/marketplace/catalog/sellers/${encodeURIComponent(slug)}`);
}
