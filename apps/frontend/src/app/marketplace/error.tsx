'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw, ShoppingBag, Users } from 'lucide-react';

/**
 * Marketplace error boundary — catches rendering errors within /marketplace/*.
 * Dark-premium neon theme aligned with marketplace DS.
 */
export default function MarketplaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="iox-glass-strong relative w-full max-w-md overflow-hidden rounded-2xl p-8 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#ff4757]/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-12 h-36 w-36 rounded-full bg-[#7B61FF]/20 blur-3xl"
        />

        <div className="relative z-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff4757]/10 ring-1 ring-[#ff4757]/20">
            <AlertTriangle className="h-7 w-7 text-[#ff4757]" aria-hidden />
          </div>

          <h1 className="text-lg font-bold text-white">
            Une erreur est survenue
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Le contenu n&apos;a pas pu être affiché. Réessayez ou naviguez vers une autre section.
          </p>

          {error.digest && (
            <p className="mt-3 rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] text-white/30">
              Ref: {error.digest}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00D4FF] to-[#7B61FF] px-4 py-2.5 text-sm font-semibold text-white shadow-glow-cyan-sm transition-all hover:-translate-y-0.5 hover:shadow-glow-cyan active:scale-[0.98]"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Réessayer
            </button>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition-all hover:border-[#00D4FF]/40 hover:bg-[#00D4FF]/10 hover:text-white"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden />
              Catalogue
            </Link>
            <Link
              href="/marketplace/sellers"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition-all hover:border-[#7B61FF]/40 hover:bg-[#7B61FF]/10 hover:text-white"
            >
              <Users className="h-4 w-4" aria-hidden />
              Producteurs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
