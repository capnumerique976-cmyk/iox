'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <p className="text-7xl font-black text-red-100 select-none">!</p>
          <h1 className="text-2xl font-bold text-gray-900">Cette page n&apos;a pas pu être affichée</h1>
          <p className="text-sm text-gray-500">
            Un incident technique a interrompu le rendu. Réessayer suffit généralement ; si l&apos;erreur
            se reproduit, communiquez la référence ci-dessous à votre administrateur IOX.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-gray-400 bg-gray-100 rounded px-2 py-1 inline-block">
              Réf : {error.digest}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Tableau de bord
          </Link>
        </div>
      </div>
    </div>
  );
}
