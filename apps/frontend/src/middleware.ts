import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware — runs at the CDN edge before page render.
 *
 * Responsibilities:
 * 1. Remove trailing slashes (SEO: canonical URLs, avoid duplicate content)
 * 2. Add security headers not covered by next.config.mjs (X-Content-Type-Options,
 *    Permissions-Policy). NOTE: X-Frame-Options is set to DENY globally in
 *    next.config.mjs headers() — do NOT set it here to avoid conflicting values.
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

  // X-Frame-Options intentionally omitted here — set to DENY in next.config.mjs
  // headers() for all routes. Setting it here too would produce duplicate/conflicting
  // values (SAMEORIGIN vs DENY). Single source of truth: next.config.mjs.

  return response;
}

export const config = {
  // Apply to all routes except static assets, _next internals, and favicon
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
