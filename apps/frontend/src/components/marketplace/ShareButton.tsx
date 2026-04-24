'use client';

import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Bouton partage — dark-premium neon.
 *
 * Copie l'URL via navigator.share (mobile) sinon clipboard. Feedback 2s.
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
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
        copied
          ? 'border-[#00F5A0]/40 bg-[#00F5A0]/15 text-[#6ff2c0]'
          : 'border-white/15 bg-white/5 text-white/80 hover:border-white/30 hover:bg-white/10 hover:text-white'
      }`}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
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
