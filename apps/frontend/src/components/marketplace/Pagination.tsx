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
    'inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors';
  const btnActive =
    'border-white/15 bg-white/5 text-white/80 hover:border-[#00D4FF]/50 hover:bg-[#00D4FF]/10 hover:text-white';
  const btnDisabled =
    'border-white/5 bg-white/[0.02] text-white/25 cursor-not-allowed pointer-events-none';

  return (
    <nav className="mt-6 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
      <Link
        href={buildHref(prev)}
        aria-disabled={atStart}
        className={`${btnBase} ${atStart ? btnDisabled : btnActive}`}
      >
        <ChevronLeft className="h-4 w-4" />
        Précédent
      </Link>

      <p className="text-sm text-white/60 tabular-nums">
        Page <strong className="text-white">{currentPage}</strong> / {totalPages}
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
