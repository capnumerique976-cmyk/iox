'use client';

import Link from 'next/link';
import { ArrowRight, Heart, Trash2 } from 'lucide-react';
import { useFavorites } from '@/lib/marketplace/favorites';

/**
 * Favoris marketplace — client-only, basé sur localStorage.
 *
 * Pas de SSR (la clé de stockage est inaccessible côté serveur).
 * Vue minimaliste : titre, lien vers la fiche, date d'ajout, bouton retirer.
 */
export default function FavoritesPage() {
  const { items, remove, hydrated } = useFavorites();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Heart className="h-6 w-6 text-red-500" />
            Mes favoris marketplace
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Vos produits marqués sur cet appareil. Stockage local uniquement.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Retour au catalogue <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      {!hydrated ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          Chargement…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Heart className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-600">Vous n&apos;avez pas encore de favoris.</p>
          <Link
            href="/marketplace"
            className="mt-4 inline-flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Explorer le catalogue
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {items
            .slice()
            .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
            .map((fav) => (
              <li
                key={fav.productSlug}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/marketplace/products/${fav.productSlug}`}
                    className="truncate font-medium text-gray-900 hover:text-blue-600"
                  >
                    {fav.commercialName}
                  </Link>
                  <p className="text-xs text-gray-400">
                    Ajouté le {new Date(fav.addedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/marketplace/products/${fav.productSlug}`}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Ouvrir
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(fav.productSlug)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Retirer
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
