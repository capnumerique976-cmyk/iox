import type { MetadataRoute } from 'next';
import { fetchCatalog, fetchSellers } from '@/lib/marketplace/api';

/**
 * DYNAMIC-SITEMAP — Generates sitemap.xml dynamically at build/request time.
 *
 * Includes:
 * - Static pages (home, marketplace, how-it-works, categories, sellers index)
 * - All published product pages (/marketplace/products/:slug)
 * - All approved seller pages (/marketplace/sellers/:slug)
 *
 * Next.js App Router convention: export default function → /sitemap.xml
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://iox.mycloud.yt').replace(
    /\/$/,
    '',
  );

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/marketplace`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/marketplace/how-it-works`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/marketplace/categories`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/marketplace/sellers`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/marketplace/favorites`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  // Dynamic product pages — fetch all published products (limit high enough for beta)
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const catalog = await fetchCatalog(new URLSearchParams({ limit: '500' }));
    const products = Array.isArray(catalog) ? catalog : catalog?.data ?? [];
    productRoutes = products.map((p) => ({
      url: `${baseUrl}/marketplace/products/${p.productSlug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      ...(p.publishedAt && { lastModified: new Date(p.publishedAt) }),
    }));
  } catch {
    // If catalog fetch fails, skip product routes (sitemap still valid)
  }

  // Dynamic seller pages
  let sellerRoutes: MetadataRoute.Sitemap = [];
  try {
    const sellers = await fetchSellers(new URLSearchParams({ limit: '200' }));
    const sellerList = Array.isArray(sellers) ? sellers : sellers?.data ?? [];
    sellerRoutes = sellerList.map((s) => ({
      url: `${baseUrl}/marketplace/sellers/${s.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    // If sellers fetch fails, skip seller routes
  }

  return [...staticRoutes, ...productRoutes, ...sellerRoutes];
}
