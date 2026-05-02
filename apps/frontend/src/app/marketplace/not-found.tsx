import Link from 'next/link';
import { Search, ArrowLeft } from 'lucide-react';

/**
 * ERROR-PAGES — 404 custom pour le segment /marketplace.
 *
 * S'affiche quand `notFound()` est appelé dans une page marketplace
 * (ex. produit ou vendeur introuvable). Respecte le DS Neon (dark theme).
 */
export default function MarketplaceNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-8xl font-black text-white/10 select-none">404</p>
      <h1 className="mt-4 text-2xl font-bold text-white">Produit ou page introuvable</h1>
      <p className="mt-2 text-sm text-gray-400 max-w-md">
        Ce contenu n&apos;existe pas ou n&apos;est plus disponible sur la marketplace.
        Il a peut-être été retiré par le producteur.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-cyan-400 transition-colors"
        >
          <Search className="h-4 w-4" />
          Explorer le catalogue
        </Link>
        <Link
          href="/marketplace/sellers"
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Producteurs
        </Link>
      </div>
    </div>
  );
}
