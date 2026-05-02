import Link from 'next/link';
import { Sparkles, Package, Users, Globe, RotateCcw, ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { fetchCatalog, fetchStats } from '@/lib/marketplace/api';
import { ProductCard } from '@/components/marketplace/ProductCard';
import { CatalogFilters } from '@/components/marketplace/CatalogFilters';
import { MobileFiltersTrigger } from '@/components/marketplace/MobileFiltersTrigger';
import { Pagination } from '@/components/marketplace/Pagination';
import { SearchSuggest } from '@/components/marketplace/SearchSuggest';

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

  // I18N-1 phase 1 — traductions UI catalogue (FR/EN).
  const t = await getTranslations('marketplace.catalog');
  const tCommon = await getTranslations('common.states');

  const [res, stats] = await Promise.all([
    fetchCatalog(params).catch(() => null),
    fetchStats().catch(() => null),
  ]);
  const totalLabel = res ? t('subtitle', { count: res.meta.total }) : tCommon('loading');

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Hero du catalogue — dark-premium neon */}
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
            {t('heroBadge')}
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
            {t('heroDescription')}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-white/85 backdrop-blur-sm">
              <Package className="h-4 w-4 text-[#00F5A0]" aria-hidden />
              {totalLabel}
            </div>
            {stats && (
              <>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-white/85 backdrop-blur-sm">
                  <Users className="h-4 w-4 text-[#00D4FF]" aria-hidden />
                  {stats.sellers} producteurs
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-white/85 backdrop-blur-sm">
                  <Globe className="h-4 w-4 text-[#7B61FF]" aria-hidden />
                  {stats.countries} pays
                </div>
              </>
            )}
          </div>
          {/* SEARCH-FULLTEXT — barre de recherche avec suggestions */}
          <SearchSuggest className="mt-5 max-w-md" />
        </div>
      </section>

      {/* Trigger filtres mobile — visible < md */}
      <MobileFiltersTrigger />

      {/* Grille : filtres + résultats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr] md:gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden md:block">
          <div className="sticky top-24">
            <CatalogFilters />
          </div>
        </aside>

        <section>
          {!res ? (
            <div className="iox-glass rounded-xl border border-[#ff4757]/40 bg-[#ff4757]/10 p-4 text-sm text-[#ffb4bb]">
              {t('unavailable')}
            </div>
          ) : res.data.length === 0 ? (
            <div className="iox-glass rounded-2xl p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00D4FF]/10 to-[#7B61FF]/10 ring-1 ring-white/10">
                <Package className="h-7 w-7 text-[#00D4FF]/60" aria-hidden />
              </div>
              <h2 className="text-base font-semibold text-white">{t('empty')}</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm text-white/50">
                {t('emptyHint')}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/80 transition-all hover:border-[#00D4FF]/40 hover:bg-[#00D4FF]/10 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  {t('emptyClearFilters')}
                </Link>
                <Link
                  href="/marketplace/sellers"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#00D4FF]/20 to-[#7B61FF]/20 px-3.5 py-2 text-xs font-medium text-white transition-all hover:from-[#00D4FF]/30 hover:to-[#7B61FF]/30"
                >
                  {t('emptyBrowseSellers')}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
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
