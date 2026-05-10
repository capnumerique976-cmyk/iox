'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderTree, Heart, HelpCircle, LogIn, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LangSwitcher } from './LangSwitcher';
import { Logo } from '@/components/brand/logo';

/**
 * Header client du marketplace public — dark-premium (DS Neon).
 * I18N-8 — migré de useLang vers useTranslations uniquement.
 */
export function PublicMarketplaceHeader() {
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const isSellers = pathname?.startsWith('/marketplace/sellers') ?? false;
  const isCategories = pathname?.startsWith('/marketplace/categories') ?? false;
  const isHowItWorks = pathname?.startsWith('/marketplace/how-it-works') ?? false;
  const isCatalog = pathname === '/marketplace';
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0E1A]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link
          href="/marketplace"
          className="group flex items-center gap-3 transition-opacity hover:opacity-90"
          aria-label={tNav('homeAlt')}
        >
          <Logo variant="horizontal" height={38} className="hidden sm:block" />
          <Logo variant="emblem" height={34} className="sm:hidden" />
          <span className="hidden rounded-full border border-[#00D4FF]/30 bg-[#00D4FF]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#00D4FF] md:inline-block">
            {tNav('marketplaceBadge')}
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
            {tNav('catalog')}
          </Link>
          <Link
            href="/marketplace/categories"
            aria-current={isCategories ? 'page' : undefined}
            data-testid="nav-categories"
            className={`hidden items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors hover:bg-white/5 hover:text-white sm:flex ${
              isCategories ? 'bg-white/10 text-white' : 'text-white/70'
            }`}
          >
            <FolderTree className="h-3.5 w-3.5" aria-hidden />
            <span>{tNav('categories')}</span>
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
            <span className="hidden sm:inline">{tNav('sellers')}</span>
          </Link>
          <Link
            href="/marketplace/favorites"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Heart className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{tNav('favorites')}</span>
          </Link>
          <Link
            href="/marketplace/how-it-works"
            aria-current={isHowItWorks ? 'page' : undefined}
            className={`hidden items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors hover:bg-white/5 hover:text-white lg:flex ${
              isHowItWorks ? 'bg-white/10 text-white' : 'text-white/70'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden />
            <span>{tNav('howItWorks')}</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-lg bg-gradient-iox-neon px-3 py-1.5 font-medium text-white shadow-glow-cyan-sm transition-all duration-base ease-premium hover:brightness-110 hover:shadow-glow-cyan active:scale-[0.98]"
          >
            <LogIn className="h-3.5 w-3.5" aria-hidden />
            <span>{tNav('proArea')}</span>
          </Link>
          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" aria-hidden />
          <LangSwitcher />
        </nav>
      </div>
    </header>
  );
}

export function PublicMarketplaceFooter() {
  const tFooter = useTranslations('footer');
  const tNav = useTranslations('nav');
  return (
    <footer className="relative z-10 mt-12 border-t border-white/10 bg-[#0A0E1A]/60 py-10 text-xs text-white/50">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Logo variant="horizontal" height={30} />
          <p className="max-w-xs text-center sm:text-left">{tFooter('tagline')}</p>
        </div>
        <div className="flex flex-col items-center gap-4 sm:items-end">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 sm:justify-end">
            <Link href="/marketplace" className="transition-colors hover:text-white">
              {tNav('catalog')}
            </Link>
            <Link href="/marketplace/sellers" className="transition-colors hover:text-white">
              {tNav('sellers')}
            </Link>
            <Link href="/marketplace/categories" className="transition-colors hover:text-white">
              {tNav('categories')}
            </Link>
            <Link href="/marketplace/how-it-works" className="transition-colors hover:text-white">
              {tNav('howItWorks')}
            </Link>
            <Link href="/login" className="transition-colors hover:text-white">
              {tNav('proArea')}
            </Link>
          </nav>
          {/* Liens légaux */}
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 sm:justify-end" aria-label="Liens légaux">
            <Link href="/legal/terms" className="transition-colors hover:text-white/80">
              CGU
            </Link>
            <Link href="/legal/privacy" className="transition-colors hover:text-white/80">
              Confidentialité
            </Link>
            <Link href="/legal/mentions-legales" className="transition-colors hover:text-white/80">
              Mentions légales
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
