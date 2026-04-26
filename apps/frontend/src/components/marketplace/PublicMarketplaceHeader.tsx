'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, LogIn, Users } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { LangSwitcher } from './LangSwitcher';
import { Logo } from '@/components/brand/logo';

/**
 * Header client du marketplace public — dark-premium (DS Neon).
 * Consomme `useLang` pour traduire les libellés ; layout parent reste RSC.
 */
export function PublicMarketplaceHeader() {
  const { t } = useLang();
  const pathname = usePathname();
  const isSellers = pathname?.startsWith('/marketplace/sellers') ?? false;
  const isCatalog = pathname === '/marketplace';
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0E1A]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link
          href="/marketplace"
          className="group flex items-center gap-3 transition-opacity hover:opacity-90"
          aria-label="IOX Marketplace — Accueil"
        >
          <Logo variant="horizontal" height={38} className="hidden sm:block" />
          <Logo variant="emblem" height={34} className="sm:hidden" />
          <span className="hidden rounded-full border border-[#00D4FF]/30 bg-[#00D4FF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#00D4FF] md:inline-block">
            Marketplace B2B
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <Link
            href="/marketplace"
            aria-current={isCatalog ? 'page' : undefined}
            className={`hidden rounded-lg px-3 py-1.5 font-medium transition-colors hover:bg-white/5 hover:text-white sm:inline-block ${
              isCatalog ? 'bg-white/10 text-white' : 'text-white/70'
            }`}
          >
            {t('nav.catalog')}
          </Link>
          <Link
            href="/marketplace/sellers"
            aria-current={isSellers ? 'page' : undefined}
            data-testid="nav-sellers"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors hover:bg-white/5 hover:text-white ${
              isSellers ? 'bg-white/10 text-white' : 'text-white/70'
            }`}
          >
            <Users className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{t('nav.sellers', 'Producteurs')}</span>
          </Link>
          <Link
            href="/marketplace/favorites"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Heart className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{t('nav.favorites')}</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-lg bg-gradient-iox-neon px-3 py-1.5 font-medium text-white shadow-glow-cyan-sm transition-all duration-base ease-premium hover:brightness-110 hover:shadow-glow-cyan active:scale-[0.98]"
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden />
            <span>{t('nav.proArea')}</span>
          </Link>
          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" aria-hidden />
          <LangSwitcher />
        </nav>
      </div>
    </header>
  );
}

export function PublicMarketplaceFooter() {
  const { t } = useLang();
  return (
    <footer className="relative z-10 mt-12 border-t border-white/10 bg-[#0A0E1A]/60 py-8 text-center text-xs text-white/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4">
        <Logo variant="horizontal" height={30} />
        <p>{t('footer.tagline')}</p>
      </div>
    </footer>
  );
}
