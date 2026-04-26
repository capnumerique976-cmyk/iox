import { Sparkles, Users } from 'lucide-react';
import { fetchSellers } from '@/lib/marketplace/api';
import { SellerCard } from '@/components/marketplace/SellerCard';
import { SellersFilters } from '@/components/marketplace/SellersFilters';
import { Pagination } from '@/components/marketplace/Pagination';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

/**
 * MP-S-INDEX — Page publique `/marketplace/sellers` : annuaire vendeurs APPROVED.
 *
 * RSC : on consume `fetchSellers()` côté serveur, on rend les filtres
 * (composant client) en aside, la grille de `SellerCard` au centre, et la
 * pagination en pied. Filtres URL-state — pas de mutation côté serveur.
 */
export default async function SellersPage({ searchParams }: PageProps) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === 'string' && v.length > 0) params.set(k, v);
  }
  if (!params.has('limit')) params.set('limit', '24');

  const res = await fetchSellers(params).catch(() => null);
  const totalLabel = res
    ? `${res.meta.total} producteur${res.meta.total > 1 ? 's' : ''}`
    : 'Chargement…';

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero — dark-premium neon, aligné avec /marketplace */}
      <section className="iox-glass-strong relative overflow-hidden rounded-2xl p-5 text-white sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#00D4FF]/35 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#7B61FF]/30 blur-3xl"
        />
        <div className="relative z-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-[#00D4FF]" aria-hidden />
            Producteurs MCH validés
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Nos <span className="iox-text-gradient-neon">producteurs</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
            Découvrez les entreprises mahoraises engagées dans le programme Mayotte Cluster
            Hub — sourcing direct, savoir-faire local, prêtes à l&apos;export.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-white/85 backdrop-blur-sm">
            <Users className="h-4 w-4 text-[#00F5A0]" aria-hidden />
            {totalLabel} référencés
          </div>
        </div>
      </section>

      {/* Grille : filtres + résultats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr] md:gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden md:block">
          <div className="sticky top-24">
            <SellersFilters />
          </div>
        </aside>

        <section>
          {!res ? (
            <div
              data-testid="sellers-error"
              className="iox-glass rounded-xl border border-[#ff4757]/40 bg-[#ff4757]/10 p-4 text-sm text-[#ffb4bb]"
            >
              L&apos;annuaire des producteurs n&apos;a pas pu être chargé. Rafraîchissez la
              page dans un instant ; nos équipes sont déjà alertées.
            </div>
          ) : res.data.length === 0 ? (
            <div
              data-testid="sellers-empty"
              className="iox-glass rounded-2xl p-12 text-center"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                <Users className="h-6 w-6 text-white/40" aria-hidden />
              </div>
              <h2 className="text-sm font-semibold text-white">Aucun producteur trouvé</h2>
              <p className="mt-1 text-sm text-white/50">
                Essayez d&apos;élargir vos filtres pour découvrir plus de profils.
              </p>
            </div>
          ) : (
            <>
              <div
                data-testid="sellers-grid"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {res.data.map((seller) => (
                  <SellerCard key={seller.id} seller={seller} />
                ))}
              </div>
              {res.meta.totalPages > 1 ? (
                <Pagination
                  currentPage={res.meta.page}
                  totalPages={res.meta.totalPages}
                  basePath="/marketplace/sellers"
                  searchParams={searchParams}
                />
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
