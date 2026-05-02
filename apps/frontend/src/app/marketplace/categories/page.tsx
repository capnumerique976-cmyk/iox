import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChevronRight, FolderTree, Package } from 'lucide-react';
import { fetchCategoriesTree, type PublicCategoryNode } from '@/lib/marketplace/api';

export const dynamic = 'force-dynamic';

/**
 * MP-CATEGORY-2 — page publique arborescence catégories marketplace.
 * Affiche les catégories actives en grid, avec sous-catégories en expand.
 * Chaque catégorie linke vers /marketplace?categorySlug=slug.
 */
export default async function CategoriesPage() {
  const t = await getTranslations('marketplace.categories');
  const tNav = await getTranslations('nav');
  const tCommon = await getTranslations('common');

  const tree = await fetchCategoriesTree().catch(() => null);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav
        aria-label={tCommon('breadcrumb.label')}
        className="flex flex-wrap items-center gap-1.5 text-xs text-white/50"
      >
        <Link href="/marketplace" className="transition-colors hover:text-[#00D4FF]">
          {tNav('catalog')}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-white/20" aria-hidden />
        <span className="font-medium text-white/80">{t('title')}</span>
      </nav>

      {/* Hero */}
      <section className="iox-glass-strong relative overflow-hidden rounded-2xl p-5 text-white sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#7B61FF]/30 blur-3xl"
        />
        <div className="relative z-10 max-w-2xl">
          <h1 className="flex items-center gap-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            <FolderTree className="h-8 w-8 text-[#00D4FF]" aria-hidden />
            <span className="iox-text-gradient-neon">{t('title')}</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/60 sm:text-base">
            {t('heroDescription')}
          </p>
        </div>
      </section>

      {/* Content */}
      {!tree ? (
        <div className="iox-glass rounded-xl border border-[#ff4757]/40 bg-[#ff4757]/10 p-4 text-sm text-[#ffb4bb]">
          {tCommon('states.error')}
        </div>
      ) : tree.length === 0 ? (
        <div
          className="iox-glass rounded-2xl p-12 text-center"
          data-testid="categories-empty"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
            <FolderTree className="h-6 w-6 text-white/40" aria-hidden />
          </div>
          <h2 className="text-sm font-semibold text-white">{t('emptyTitle')}</h2>
          <p className="mt-1 text-sm text-white/50">{t('emptyHint')}</p>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="categories-grid"
        >
          {tree.map((node) => (
            <CategoryCard key={node.id} node={node} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

interface CategoryCardProps {
  node: PublicCategoryNode;
  t: Awaited<ReturnType<typeof getTranslations>>;
}

function CategoryCard({ node, t }: CategoryCardProps) {
  return (
    <div
      className="iox-glass group overflow-hidden rounded-2xl transition-all duration-base ease-premium hover:-translate-y-1 hover:border-[#00D4FF]/40 hover:shadow-glow-cyan-sm"
      data-testid={`category-card-${node.slug}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white group-hover:text-[#00D4FF] transition-colors">
              {node.nameFr}
            </h2>
            {node.nameEn && node.nameEn !== node.nameFr && (
              <p className="mt-0.5 text-xs text-white/40">{node.nameEn}</p>
            )}
          </div>
          <div className="flex-shrink-0 rounded-lg bg-[#00D4FF]/10 px-2.5 py-1 text-xs font-medium text-[#00D4FF]">
            <Package className="mr-1 inline h-3 w-3" aria-hidden />
            {t('productsCount', { count: node.productsCount })}
          </div>
        </div>

        {node.description && (
          <p className="mt-2 line-clamp-2 text-sm text-white/60">{node.description}</p>
        )}

        {node.children.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {node.children.map((child) => (
              <Link
                key={child.id}
                href={`/marketplace?categorySlug=${child.slug}`}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-white/70 transition-colors hover:border-[#00D4FF]/40 hover:bg-[#00D4FF]/10 hover:text-[#00D4FF]"
              >
                {child.nameFr}
                <span className="ml-1 text-white/30">({child.productsCount})</span>
              </Link>
            ))}
          </div>
        )}

        <Link
          href={`/marketplace?categorySlug=${node.slug}`}
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#00D4FF] transition-all duration-base hover:text-white"
        >
          {t('browseCategory')}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
