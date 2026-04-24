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
            ? 'border-[#ff4757]/50 bg-[#ff4757]/15 text-[#ff6b9d] hover:bg-[#ff4757]/25'
            : 'border-white/15 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10 hover:text-white'
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
      className={`rounded-full p-1.5 shadow-lg shadow-black/30 backdrop-blur transition-colors ${
        active
          ? 'bg-[#ff4757] text-white hover:bg-[#ff6b9d]'
          : 'bg-black/40 text-white/80 ring-1 ring-white/15 hover:bg-black/60 hover:text-[#ff6b9d]'
      }`}
    >
      <Heart className={`h-4 w-4 ${active ? 'fill-current' : ''}`} />
    </button>
  );
}
