'use client';

// MP-MEDIA-1 LOT 1 — Galerie publique avec lightbox sur fiche produit.
//
// Composant léger client : grille thumbnails + clic ouvre un overlay
// natif (state useState<number | null>) avec navigation prev/next +
// fermeture par Escape ou clic backdrop. Aucune lib externe.

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface GalleryImage {
  id: string;
  publicUrl: string | null;
  altTextFr: string | null;
}

interface Props {
  images: GalleryImage[];
  productName: string;
  testId?: string;
}

export function PublicGalleryLightbox({ images, productName, testId = 'public-gallery' }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const valid = images.filter((m): m is GalleryImage & { publicUrl: string } => !!m.publicUrl);

  const close = useCallback(() => setOpenIdx(null), []);
  const next = useCallback(() => {
    setOpenIdx((idx) => (idx === null ? null : (idx + 1) % valid.length));
  }, [valid.length]);
  const prev = useCallback(() => {
    setOpenIdx((idx) => (idx === null ? null : (idx - 1 + valid.length) % valid.length));
  }, [valid.length]);

  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIdx, close, next, prev]);

  if (valid.length === 0) return null;

  const currentImage = openIdx !== null ? valid[openIdx] : null;

  return (
    <>
      <div data-testid={`${testId}-grid`} className="mt-3 grid grid-cols-4 gap-2">
        {valid.slice(0, 8).map((m, idx) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setOpenIdx(idx)}
            data-testid={`${testId}-thumb-${idx}`}
            aria-label={`Voir image ${idx + 1} en plein écran`}
            className="overflow-hidden rounded-lg ring-1 ring-white/10 transition-all duration-base ease-premium hover:-translate-y-0.5 hover:ring-[#00D4FF]/50 focus:outline-none focus:ring-2 focus:ring-[#00D4FF]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={m.publicUrl}
              alt={m.altTextFr ?? `${productName} — photo ${idx + 1}`}
              className="aspect-square w-full object-cover"
            />
          </button>
        ))}
      </div>

      {openIdx !== null && currentImage && (
        <div
          data-testid={`${testId}-lightbox`}
          role="dialog"
          aria-modal="true"
          aria-label={`Image ${openIdx + 1} de ${valid.length} — ${productName}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            data-testid={`${testId}-close`}
            aria-label="Fermer"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {valid.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                data-testid={`${testId}-prev`}
                aria-label="Image précédente"
                className="absolute left-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                data-testid={`${testId}-next`}
                aria-label="Image suivante"
                className="absolute right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                style={{ right: '1rem', top: '50%', transform: 'translateY(-50%)' }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <div
            className="max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage.publicUrl}
              alt={currentImage.altTextFr ?? `${productName} — photo ${openIdx + 1}`}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
          </div>
          <div className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
            {openIdx + 1} / {valid.length}
          </div>
        </div>
      )}
    </>
  );
}
