'use client';

/**
 * IOX Marketplace — MobileSellersFiltersTrigger
 *
 * Same pattern as MobileFiltersTrigger but for the sellers directory.
 * Visible under `md` breakpoint, renders SellersFilters in a sheet drawer.
 */
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SellersFilters } from './SellersFilters';

export function MobileSellersFiltersTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 backdrop-blur-sm transition-all duration-base ease-premium hover:border-[#00D4FF]/50 hover:bg-[#00D4FF]/10 hover:text-white active:scale-[0.98] md:hidden"
          aria-label="Ouvrir les filtres producteurs"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filtrer les producteurs
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle>Filtrer les producteurs</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <SellersFilters />
        </div>
      </SheetContent>
    </Sheet>
  );
}
