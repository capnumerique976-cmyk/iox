import Link from 'next/link';
import { Package, ArrowLeft, Store } from 'lucide-react';

/**
 * ERROR-PAGES — 404 custom pour le segment /marketplace/products.
 *
 * S'affiche quand `notFound()` est appelé dans une page produit
 * (slug inexistant, produit dépublié, etc.). Respecte le DS Neon (dark theme).
 */
export default function ProductsNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
        <Package className="h-8 w-8 text-[#00D4FF]" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-white">Produit introuvable</h1>
      <p className="mt-2 max-w-md text-sm text-gray-400">
        Ce produit n&apos;existe pas ou n&apos;est plus disponible sur la marketplace.
        Il a peut-être été retiré par le producteur.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-cyan-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au catalogue
        </Link>
        <Link
          href="/marketplace/sellers"
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5 transition-colors"
        >
          <Store className="h-4 w-4" />
          Producteurs
        </Link>
      </div>
    </div>
  );
}
