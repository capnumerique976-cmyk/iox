import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ChevronRight, RotateCcw, Sparkles, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { fetchSellers } from '@/lib/marketplace/api';
import { SellerCard } from '@/components/marketplace/SellerCard';
import { SellersFilters } from '@/components/marketplace/SellersFilters';
import { MobileSellersFiltersTrigger } from '@/components/marketplace/MobileSellersFiltersTrigger';
import { Pagination } from '@/components/marketplace/Pagination';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Producteurs certifiés — IOX Marketplace',
  description:
    'Annuaire des producteurs et exportateurs certifiés de l\'océan Indien. Sourcing direct, profils vérifiés.',
  openGraph: {
    title: 'Producteurs certifiés — IOX Marketplace',
    description: 'Annuaire producteurs vérifiés — sourcing direct océan Indien.',
    type: 'website',
    siteName: 'IOX Marketplace',
  },
  twitter: {
    card: 'summary',
    title: 'Producteurs certifiés — IOX Marketplace',
    description: 'Annuaire producteurs vérifiés — sourcing direct océan Indien.',
  },
};

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

  const t = await getTranslations('marketplace.sellers');
  const res = await fetchSellers(params).catch(() => null);
  const totalLabel = res
    ? t('totalCount', { count: res.meta.total })
    : t('loading');

  const tNav = await getTranslations('nav');
  const tCommon = await getTranslations('common');

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Breadcrumb */}
      <nav aria-label={tCommon('breadcrumb.label')} className="flex items-center gap-1.5 text-xs text-white/50">
        <Link href="/marketplace" className="transition-colors hover:text-[#00D4FF]">
          {tNav('catalog')}
        </Link>
        <ChevronRight className="h-3 w-3 text-white/20" aria-hidden />
        <span className="font-medium text-white/80">{tNav('sellers')}</span>
      </nav>

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
            {t('heroBadge')}
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {t('titlePrefix')} <span className="iox-text-gradient-neon">{t('titleHighlight')}</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
            {t('heroDescription')}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-white/85 backdrop-blur-sm">
            <Users className="h-4 w-4 text-[#00F5A0]" aria-hidden />
            {totalLabel} {t('totalCountSuffix')}
          </div>
        </div>
      </section>

      {/* Mobile filters trigger — visible < md */}
      <MobileSellersFiltersTrigger />

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
              {t('unavailable')}
            </div>
          ) : res.data.length === 0 ? (
            <div
              data-testid="sellers-empty"
              className="iox-glass rounded-2xl p-12 text-center"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7B61FF]/10 to-[#00D4FF]/10 ring-1 ring-white/10">
                <Users className="h-7 w-7 text-[#7B61FF]/60" aria-hidden />
              </div>
              <h2 className="text-base font-semibold text-white">{t('emptyTitle')}</h2>
              <p className="mx-auto mt-2 max-w-xs text-sm text-white/50">
                {t('emptyHint')}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/marketplace/sellers"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/80 transition-all hover:border-[#7B61FF]/40 hover:bg-[#7B61FF]/10 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  {t('emptyClearFilters')}
                </Link>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#00D4FF]/20 to-[#7B61FF]/20 px-3.5 py-2 text-xs font-medium text-white transition-all hover:from-[#00D4FF]/30 hover:to-[#7B61FF]/30"
                >
                  {t('emptyBrowseCatalog')}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
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
