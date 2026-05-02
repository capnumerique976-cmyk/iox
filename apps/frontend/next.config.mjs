// I18N-1 phase 1 — next-intl plugin (sans i18n routing).
// Le plugin résout les messages côté serveur via `src/i18n/request.ts`.
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@iox/shared'],
  output: 'standalone',
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  /**
   * PRODUCTION-HARDENING — Security headers appliqués à toutes les réponses Next.js.
   */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  /**
   * Le navigateur appelle /api/v1 sur le même hôte que le frontend (voir api.ts).
   * Next proxy vers le backend Nest — évite NEXT_PUBLIC_API_URL en prod et les soucis CORS.
   * Sur le VPS : BACKEND_INTERNAL_URL=http://127.0.0.1:3001 (ou le service Docker).
   */
  async rewrites() {
    const target = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:3001';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${target.replace(/\/$/, '')}/api/v1/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
