'use client';

import Link from 'next/link';
import { ArrowRight, Heart, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFavorites } from '@/lib/marketplace/favorites';

/**
 * Favoris marketplace — dark-premium neon, client-only (localStorage).
 * I18N-7 — toutes les chaînes via useTranslations('marketplace.favorites').
 */
export default function FavoritesPage() {
  const { items, remove, hydrated } = useFavorites();
  const t = useTranslations('marketplace.favorites');
  const tNav = useTranslations('nav');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="iox-glass-strong relative overflow-hidden rounded-2xl p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#FF4757]/20 blur-3xl"
        />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
              <Heart className="h-6 w-6 fill-[#FF4757] text-[#FF4757]" />
              <span className="iox-text-gradient-neon">{t('title')}</span>
            </h1>
            <p className="mt-1 text-sm text-white/60">
              {t('subtitle')}
            </p>
          </div>
          <Link
            href="/marketplace"
            className="group inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm transition-all duration-base ease-premium hover:border-[#00D4FF]/50 hover:bg-[#00D4FF]/10 hover:text-white"
          >
            {t('catalog')}
            <ArrowRight
              className="h-4 w-4 transition-transform duration-base group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </header>

      {!hydrated ? (
        <div className="iox-glass rounded-2xl p-8 text-center text-sm text-white/40">
          {t('loading')}
        </div>
      ) : items.length === 0 ? (
        <div className="iox-glass rounded-2xl p-10 text-center">
          <div
            aria-hidden
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FF4757]/10 ring-1 ring-[#FF4757]/20"
          >
            <Heart className="h-7 w-7 text-[#FF4757]/70" />
          </div>
          <p className="mt-4 text-sm text-white/70">
            {t('empty')}
          </p>
          <Link
            href="/marketplace"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-iox-neon px-5 py-2.5 text-sm font-semibold text-white shadow-glow-cyan-sm transition-all duration-base ease-premium hover:brightness-110 hover:shadow-glow-cyan active:scale-[0.98]"
          >
            {t('exploreCatalog')}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <ul className="iox-glass divide-y divide-white/5 overflow-hidden rounded-2xl">
          {items
            .slice()
            .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
            .map((fav) => (
              <li
                key={fav.productSlug}
                className="group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-white/5 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/marketplace/products/${fav.productSlug}`}
                    className="block truncate text-sm font-semibold text-white transition-colors hover:text-[#00D4FF]"
                  >
                    {fav.commercialName}
                  </Link>
                  <p className="mt-0.5 text-xs text-white/40">
                    {t('addedOn', { date: new Date(fav.addedAt).toLocaleDateString() })}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <Link
                    href={`/marketplace/products/${fav.productSlug}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 transition-colors hover:border-[#00D4FF]/50 hover:bg-[#00D4FF]/10 hover:text-white"
                  >
                    {t('open')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(fav.productSlug)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#FF4757]/30 bg-[#FF4757]/10 px-2.5 py-1 text-xs font-medium text-[#ff8fa3] transition-colors hover:border-[#FF4757]/50 hover:bg-[#FF4757]/20 hover:text-white"
                    aria-label={t('removeAriaLabel', { name: fav.commercialName })}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t('remove')}
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
