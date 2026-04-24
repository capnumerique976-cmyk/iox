import {
  PublicMarketplaceFooter,
  PublicMarketplaceHeader,
} from '@/components/marketplace/PublicMarketplaceHeader';

/**
 * Layout du marketplace public — dark-premium (DS Neon).
 *
 * Surfaces dark (#0A0E1A), halos cyan/violet, glass cards. Isolé via
 * `iox-neon-root` → aucune contamination des sous-routes authentifiées.
 */
export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="iox-neon-root relative min-h-screen overflow-hidden">
      {/* Halos ambient — très flous, non-interactifs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="iox-halo -top-40 left-1/3 h-[520px] w-[520px] bg-[#00D4FF] opacity-20" />
        <span className="iox-halo top-1/2 -right-40 h-[420px] w-[420px] bg-[#7B61FF] opacity-25" />
      </div>
      <PublicMarketplaceHeader />
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      <PublicMarketplaceFooter />
    </div>
  );
}
