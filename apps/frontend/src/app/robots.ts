import type { MetadataRoute } from 'next';

/**
 * DYNAMIC-SITEMAP — robots.txt via Next.js App Router convention.
 *
 * Allows all crawlers on public marketplace pages.
 * Disallows dashboard/admin/seller/API routes.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://iox.mycloud.yt').replace(
    /\/$/,
    '',
  );

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/marketplace', '/marketplace/', '/'],
        disallow: [
          '/api/',
          '/admin/',
          '/seller/',
          '/coordinator/',
          '/quality/',
          '/buyer/',
          '/login',
          '/register',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
