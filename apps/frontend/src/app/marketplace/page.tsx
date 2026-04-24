import { Sparkles, Package } from 'lucide-react';
import { fetchCatalog } from '@/lib/marketplace/api';
import { ProductCard } from '@/components/marketplace/ProductCard';
import { CatalogFilters } from '@/components/marketplace/CatalogFilters';
import { Pagination } from '@/components/marketplace/Pagination';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === 'string' && v.length > 0) params.set(k, v);
  }
  if (!params.has('limit')) params.set('limit', '24');

  const res = await fetchCatalog(params).catch(() => null);
  const totalLabel = res ? `${res.meta.total} offre${res.meta.total > 1 ? 's' : ''}` : 'Chargement…';

  return (
    <div className="space-y-8">
      {/* Hero du catalogue */}
      <section className="relative overflow-hidden rounded-2xl border border-gray-200/70 bg-gradient-to-br from-premium-primary via-premium-primary-light to-premium-accent p-6 text-white shadow-premium-lg sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-premium-accent-light/30 blur-3xl"
        />
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Sparkles className="h-3 w-3" aria-hidden />
            Produits de Mayotte sélectionnés
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Catalogue marketplace
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
            Découvrez les offres d&apos;export des entreprises engagées dans le programme MCH —
            traçabilité garantie, conformité validée.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
            <Package className="h-4 w-4" aria-hidden />
            {totalLabel} disponibles
          </div>
        </div>
      </section>

      {/* Grille : filtres + résultats */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
        <aside>
          <div className="sticky top-24">
            <CatalogFilters />
          </div>
        </aside>

        <section>
          {!res ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-premium-sm">
              Le catalogue est temporairement indisponible.
            </div>
          ) : res.data.length === 0 ? (
            <div className="rounded-2xl border border-gray-200/70 bg-white p-12 text-center shadow-premium-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                <Package className="h-6 w-6 text-gray-400" aria-hidden />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Aucune offre correspondante</h2>
              <p className="mt-1 text-sm text-gray-500">
                Essayez d&apos;élargir vos filtres pour découvrir plus de produits.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {res.data.map((card) => (
                  <ProductCard key={card.offerId} card={card} />
                ))}
              </div>
              <Pagination
                currentPage={res.meta.page}
                totalPages={res.meta.totalPages}
                basePath="/marketplace"
                searchParams={searchParams}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
