import Link from 'next/link';
import { LayoutDashboard, ArrowLeft, Search } from 'lucide-react';

/**
 * ERROR-PAGES — 404 for the (dashboard) route group.
 *
 * Catches navigation to non-existent dashboard routes.
 * Dark neon theme consistent with the dashboard layout.
 */
export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-7xl font-black text-white/10 select-none">404</p>
      <h1 className="mt-4 text-xl font-bold text-white">Page introuvable</h1>
      <p className="mt-2 max-w-md text-sm text-white/60">
        Cette page du tableau de bord n&apos;existe pas ou a été déplacée.
        Vérifiez l&apos;URL ou revenez au tableau de bord.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
          Tableau de bord
        </Link>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 transition-colors"
        >
          <Search className="h-4 w-4" />
          Marketplace
        </Link>
      </div>
    </div>
  );
}
