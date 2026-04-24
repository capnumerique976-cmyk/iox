'use client';

import Link from 'next/link';
import { Heart, LogIn } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { LangSwitcher } from './LangSwitcher';
import { Logo } from '@/components/brand/logo';

/**
 * Header client du marketplace public — consomme `useLang` pour traduire
 * les libellés de navigation. Le layout parent reste un Server Component.
 */
export function PublicMarketplaceHeader() {
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link
          href="/marketplace"
          className="group flex items-center gap-3 transition-opacity hover:opacity-90"
          aria-label="IOX Marketplace — Accueil"
        >
          <Logo variant="horizontal" height={38} className="hidden sm:block" />
          <Logo variant="emblem" height={34} className="sm:hidden" />
          <span className="hidden rounded-full border border-premium-accent/20 bg-premium-accent/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-premium-accent md:inline-block">
            Marketplace B2B
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <Link
            href="/marketplace"
            className="hidden rounded-lg px-3 py-1.5 font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-premium-primary sm:inline-block"
          >
            {t('nav.catalog')}
          </Link>
          <Link
            href="/marketplace/favorites"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-premium-primary"
          >
            <Heart className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{t('nav.favorites')}</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-lg bg-gradient-iox-primary px-3 py-1.5 font-medium text-white shadow-premium-sm transition-all duration-base ease-premium hover:shadow-premium-md active:scale-[0.98]"
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden />
            <span>{t('nav.proArea')}</span>
          </Link>
          <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" aria-hidden />
          <LangSwitcher />
        </nav>
      </div>
    </header>
  );
}

export function PublicMarketplaceFooter() {
  const { t } = useLang();
  return (
    <footer className="mt-12 border-t border-gray-200/70 bg-white/60 py-8 text-center text-xs text-gray-500">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4">
        <Logo variant="horizontal" height={30} />
        <p>{t('footer.tagline')}</p>
      </div>
    </footer>
  );
}
