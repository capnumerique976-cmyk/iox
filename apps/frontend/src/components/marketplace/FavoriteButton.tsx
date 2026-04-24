'use client';

import { Heart } from 'lucide-react';
import { MouseEvent } from 'react';
import { useFavorites } from '@/lib/marketplace/favorites';

/**
 * Bouton favori — bascule local (localStorage) avec icône cœur.
 *
 * - `variant="card"`  → petit badge flottant pour ProductCard (ne suit pas le Link parent).
 * - `variant="inline"` → bouton plus gros pour la fiche produit.
 */
interface Props {
  productSlug: string;
  commercialName: string;
  variant?: 'card' | 'inline';
}

export function FavoriteButton({ productSlug, commercialName, variant = 'card' }: Props) {
  const { has, toggle, hydrated } = useFavorites();
  const active = hydrated && has(productSlug);

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggle({ productSlug, commercialName });
  };

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Heart className={`h-4 w-4 ${active ? 'fill-current' : ''}`} />
        {active ? 'Favori' : 'Ajouter aux favoris'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`rounded-full p-1.5 shadow-sm backdrop-blur transition-colors ${
        active
          ? 'bg-red-500/90 text-white hover:bg-red-600'
          : 'bg-white/90 text-gray-600 hover:bg-white hover:text-red-500'
      }`}
    >
      <Heart className={`h-4 w-4 ${active ? 'fill-current' : ''}`} />
    </button>
  );
}
