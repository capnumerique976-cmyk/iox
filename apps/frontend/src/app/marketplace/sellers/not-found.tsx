import Link from 'next/link';
import { Store, ArrowLeft, Search } from 'lucide-react';

/**
 * ERROR-PAGES — 404 custom pour le segment /marketplace/sellers.
 *
 * S'affiche quand `notFound()` est appelé dans une page vendeur
 * (slug inexistant, profil désactivé, etc.). Respecte le DS Neon (dark theme).
 */
export default function SellersNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
        <Store className="h-8 w-8 text-[#00F5A0]" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-white">Producteur introuvable</h1>
      <p className="mt-2 max-w-md text-sm text-gray-400">
        Ce profil vendeur n&apos;existe pas ou n&apos;est plus actif sur la marketplace.
        Il a peut-être été suspendu ou supprimé par son propriétaire.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/marketplace/sellers"
          className="inline-flex items-center gap-2 rounded-lg bg-[#00F5A0] px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-[#00D48A] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Tous les producteurs
        </Link>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5 transition-colors"
        >
          <Search className="h-4 w-4" />
          Explorer le catalogue
        </Link>
      </div>
    </div>
  );
}
