import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware — runs at the CDN edge before page render.
 *
 * Responsibilities:
 * 1. Remove trailing slashes (SEO: canonical URLs, avoid duplicate content)
 * 2. Add security headers not covered by backend (X-Content-Type-Options,
 *    Permissions-Policy, X-Frame-Options for non-API routes)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Trailing slash redirect (except root "/")
  if (pathname !== '/' && pathname.endsWith('/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, '');
    return NextResponse.redirect(url, 308);
  }

  // 2. Security headers on all responses
  const response = NextResponse.next();

  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Restrict browser features (camera, mic, etc.) — defense in depth
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  );

  // Prevent clickjacking on non-API routes (API has its own CORS/headers)
  if (!pathname.startsWith('/api')) {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  }

  return response;
}

export const config = {
  // Apply to all routes except static assets, _next internals, and favicon
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
