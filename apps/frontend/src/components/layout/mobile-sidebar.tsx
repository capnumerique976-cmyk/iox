'use client';

/**
 * IOX — MobileSidebar
 *
 * Déclencheur hamburger + Sheet drawer latéral gauche contenant la navigation
 * complète (SidebarContent). Visible uniquement sous `lg` (<1024px). La Sheet
 * se ferme automatiquement lors d'un clic sur un lien de navigation, via le
 * callback `onNavigate`.
 */
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarContent } from './sidebar';
import { Logo } from '@/components/brand/logo';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Ouvrir le menu de navigation"
          className="inline-flex items-center justify-center rounded-lg p-2 text-white/70 transition-colors hover:bg-white/5 hover:text-white lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[86vw] max-w-xs border-r border-white/10 bg-[#0A0E1A]/95 p-0 text-white backdrop-blur-xl"
      >
        <div className="flex h-14 items-center border-b border-white/10 px-5">
          <Logo variant="horizontal" height={32} />
        </div>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
