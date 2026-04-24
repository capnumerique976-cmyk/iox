'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth.context';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { AlertsBell } from '@/components/layout/alerts-bell';
import { SellerOnboardingBanner } from '@/components/layout/seller-onboarding-banner';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Logo } from '@/components/brand/logo';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-premium-accent" aria-hidden />
          Chargement...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50/60">
      <header className="sticky top-0 z-30 border-b border-gray-200/70 bg-white/85 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Trigger mobile/tablette — visible < lg */}
            <MobileSidebar />
            <Link
              href="/dashboard"
              className="group flex items-center gap-3 transition-opacity hover:opacity-90 min-w-0"
              aria-label="IOX — Tableau de bord"
            >
              {/* Desktop : lockup horizontal */}
              <Logo variant="horizontal" height={34} className="hidden sm:block" />
              {/* Mobile : emblème seul */}
              <Logo variant="emblem" height={30} className="sm:hidden" />
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <AlertsBell />
            <div className="hidden h-8 w-px bg-gray-200 sm:block" aria-hidden />
            <Link
              href="/profile"
              className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 sm:px-2"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-iox-primary text-[11px] font-semibold text-white sm:h-7 sm:w-7"
                aria-hidden
              >
                {(user.firstName?.[0] ?? '').toUpperCase()}
                {(user.lastName?.[0] ?? '').toUpperCase()}
              </div>
              <span className="hidden font-medium md:inline">
                {user.firstName} {user.lastName}
              </span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <SellerOnboardingBanner />
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
