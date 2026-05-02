import Link from 'next/link';
import { Search, ArrowLeft, ShoppingBag } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="space-y-3">
          <p className="text-8xl font-black text-gray-200 select-none">404</p>
          <h1 className="text-2xl font-bold text-gray-900">Page introuvable</h1>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            La page que vous cherchez n&apos;existe pas ou a été déplacée. Vérifiez l&apos;URL ou
            explorez nos espaces ci-dessous.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <ShoppingBag className="h-4 w-4" />
            Marketplace
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Search className="h-4 w-4" />
            Tableau de bord
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
