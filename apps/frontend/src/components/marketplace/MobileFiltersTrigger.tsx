'use client';

/**
 * IOX Marketplace — MobileFiltersTrigger
 *
 * Bouton "Filtres" visible sous `md` (<768px) qui ouvre un drawer latéral
 * contenant `CatalogFilters`. Sur desktop, les filtres restent affichés
 * dans l'aside classique du layout ; ce composant n'est pas rendu.
 */
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CatalogFilters } from './CatalogFilters';

export function MobileFiltersTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 backdrop-blur-sm transition-all duration-base ease-premium hover:border-[#00D4FF]/50 hover:bg-[#00D4FF]/10 hover:text-white active:scale-[0.98] md:hidden"
          aria-label="Ouvrir les filtres"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filtrer & trier
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle>Filtrer le catalogue</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <CatalogFilters />
        </div>
      </SheetContent>
    </Sheet>
  );
}
