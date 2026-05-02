'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, LayoutDashboard, AlertTriangle } from 'lucide-react';

/**
 * ERROR-PAGES — Error boundary for the (dashboard) route group.
 *
 * Catches any unhandled error within dashboard routes (buyer, seller,
 * admin, etc.). Dark neon theme consistent with the dashboard layout.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h1 className="mt-6 text-xl font-bold text-white">
        Une erreur est survenue
      </h1>
      <p className="mt-2 max-w-md text-sm text-white/60">
        Un problème technique empêche l&apos;affichage de cette page.
        Réessayer suffit généralement. Si l&apos;erreur persiste, contactez votre administrateur.
      </p>
      {error.digest && (
        <p className="mt-3 rounded bg-white/5 px-3 py-1.5 font-mono text-xs text-white/40">
          Réf : {error.digest}
        </p>
      )}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
          Accueil
        </Link>
      </div>
    </div>
  );
}
