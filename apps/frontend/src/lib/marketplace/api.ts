import type { CatalogResponse, ProductDetail, SellerPublic } from './types';

/**
 * Résolution du base URL du backend.
 *
 * - **Navigateur** : chemin relatif `/api/v1`. Next.js proxifie via `rewrites`
 *   (cf. next.config.mjs) vers `BACKEND_INTERNAL_URL` — pas de CORS ni de
 *   fuite de l'URL interne dans le bundle client.
 * - **SSR / Node runtime** : la fetch native de Node rejette les URLs
 *   relatives (`Failed to parse URL`). On doit construire une URL absolue
 *   pointant directement vers le backend interne.
 *
 * Le garde `typeof window === 'undefined'` distingue sans heuristique fragile.
 */
function resolveApiBase(): string {
  const publicOverride = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (publicOverride) return publicOverride;
  if (typeof window === 'undefined') {
    const internal = (process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
    return `${internal}/api/v1`;
  }
  return '/api/v1';
}

async function publicGet<T>(path: string): Promise<T> {
  const API_BASE = resolveApiBase();
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
