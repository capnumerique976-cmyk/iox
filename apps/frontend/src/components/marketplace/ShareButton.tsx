'use client';

import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Bouton partage — copie l'URL du produit dans le presse-papier.
 *
 * Fallback navigator.share sur mobile si disponible. Feedback visuel
 * 2 secondes (icône check + texte). Pas de dépendance backend.
 */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title,
          url,
        });
        return;
      } catch {
        /* user cancelled — fallback clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indispo — no-op */
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-emerald-600" />
          Lien copié
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          Partager
        </>
      )}
    </button>
  );
}
