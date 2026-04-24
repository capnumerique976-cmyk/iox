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

export default nextConfig;
