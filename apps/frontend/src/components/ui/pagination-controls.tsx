/**
 * IOX — PaginationControls
 *
 * Contrôles de pagination partagés pour les listes stateful côté client
 * (hooks `useState`). Variante DS-1 du bouton/lien : bordure légère,
 * `shadow-premium-sm`, hover accent premium.
 *
 * Pour la pagination URL-based (SSR marketplace), voir
 * `src/components/marketplace/Pagination.tsx`.
 */
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  /** Optionnel — affiché à gauche. Ex. "20 résultats" ou "Page 2 sur 5". */
  label?: React.ReactNode;
  className?: string;
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  label,
  className,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;
  const atStart = page <= 1;
  const atEnd = page >= totalPages;
  return (
    <nav
      aria-label="Pagination"
      className={
        'flex flex-col items-start justify-between gap-2 text-sm text-gray-600 sm:flex-row sm:items-center ' +
        (className ?? '')
      }
    >
      <span className="text-xs text-gray-500">
        {label ?? (
          <>
            Page {page} sur {totalPages}
          </>
        )}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={atStart}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-premium-sm transition-all duration-fast ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-700"
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Précédent
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={atEnd}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-premium-sm transition-all duration-fast ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-700"
          aria-label="Page suivante"
        >
          Suivant
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </nav>
  );
}

export default PaginationControls;
