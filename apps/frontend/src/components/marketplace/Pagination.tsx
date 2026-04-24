import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination SSR-safe pour le catalogue marketplace.
 *
 * - Préserve tous les autres query params (filtres, tri).
 * - Affiche « page X / Y » + précédent/suivant.
 * - Désactive les boutons aux extrémités.
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}

export function Pagination({ currentPage, totalPages, basePath, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const buildHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === 'string' && v.length > 0 && k !== 'page') params.set(k, v);
    }
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const prev = Math.max(1, currentPage - 1);
  const next = Math.min(totalPages, currentPage + 1);
  const atStart = currentPage <= 1;
  const atEnd = currentPage >= totalPages;

  const btnBase =
    'inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors';
  const btnActive = 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50';
  const btnDisabled =
    'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed pointer-events-none';

  return (
    <nav className="mt-6 flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
      <Link
        href={buildHref(prev)}
        aria-disabled={atStart}
        className={`${btnBase} ${atStart ? btnDisabled : btnActive}`}
      >
        <ChevronLeft className="h-4 w-4" />
        Précédent
      </Link>

      <p className="text-sm text-gray-600 tabular-nums">
        Page <strong>{currentPage}</strong> / {totalPages}
      </p>

      <Link
        href={buildHref(next)}
        aria-disabled={atEnd}
        className={`${btnBase} ${atEnd ? btnDisabled : btnActive}`}
      >
        Suivant
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
