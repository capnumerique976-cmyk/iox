import {
  PublicMarketplaceFooter,
  PublicMarketplaceHeader,
} from '@/components/marketplace/PublicMarketplaceHeader';

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30">
      <PublicMarketplaceHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      <PublicMarketplaceFooter />
    </div>
  );
}
