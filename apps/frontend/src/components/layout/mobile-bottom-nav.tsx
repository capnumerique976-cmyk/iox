'use client';

/**
 * IOX — MobileBottomNav (M117)
 *
 * Structure :
 *   ┌──────────────────────────────────────────────┐
 *   │  [Action contextuelle flottante]             │  ← selon la route
 *   ├──────────────────────────────────────────────┤
 *   │ Onglet1 │ Onglet2 │ Onglet3 │ Onglet4 │ Menu │  ← toujours visible
 *   └──────────────────────────────────────────────┘
 *
 * Menu ouvre un drawer bottom sheet avec navigation progressive (M117) :
 *   Niveau 1 : liste des modules métier (cartes avec description + compteur)
 *   Niveau 2 : sous-menus du module sélectionné (retour + items)
 *   Auto-détection du module actif via pathname à l'ouverture.
 *
 * Règles :
 *   - primaryTabs : inchangés (4 max, tests existants verts)
 *   - Navigation progressive : pas d'accordéons plats simultanés
 *   - Auto-ouverture du bon module selon la route courante
 *   - Visible uniquement sur mobile (<lg)
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, UserCog } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/auth.context';
import { ROLE_LABELS } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  getMobileNavConfig,
  isPathActive,
  type MobileTab,
} from './mobile-nav-config';
import {
  getMobileMenuSections,
  getBusinessModuleForPath,
  type MobileMenuSection,
} from './mobile-menu-config';
import { MobileProgressiveMenu } from './mobile-progressive-menu';

/* ------------------------------------------------------------------ */
/*  Composant principal                                                 */
/* ------------------------------------------------------------------ */

export function MobileBottomNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Sections du menu métier pour le rôle courant (null si rôle non couvert)
  const sections: MobileMenuSection[] | null = user
    ? getMobileMenuSections(user.role)
    : null;

  // Module sélectionné dans la navigation progressive
  // MUST be before any early return — React rules of hooks
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Re-sync le module sélectionné à chaque ouverture du drawer
  useEffect(() => {
    if (menuOpen) {
      setSelectedModule(getBusinessModuleForPath(pathname, sections ?? []));
    }
  }, [menuOpen, pathname, sections]);

  if (!user) return null;

  const config = getMobileNavConfig(user.role);
  if (!config) return null;

  const isTabActive = (tab: MobileTab) => isPathActive(pathname, tab.pathPrefix, tab.exactMatch);

  const contextualEntry = config.contextualActions.find((c) =>
    isPathActive(pathname, c.pathPrefix, c.exactMatch),
  );
  const contextualActions = contextualEntry?.actions ?? [];

  const isAnyMenuActive = sections
    ? sections.some((s) => s.items.some((i) => !i.disabled && isPathActive(pathname, i.href)))
    : false;

  function handleMenuOpenChange(open: boolean) {
    if (!open) {
      setSelectedModule(null);
    }
    setMenuOpen(open);
  }

  return (
    <>
      {/* ── Action contextuelle flottante ────────────────────────────── */}
      {contextualActions.length > 0 && (
        <div
          className="lg:hidden fixed left-0 right-0 z-20 flex justify-center px-6"
          style={{ bottom: 'calc(4.25rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#0A0E1A]/90 px-2 py-1.5 backdrop-blur-xl shadow-lg shadow-black/40">
            {contextualActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className="flex items-center gap-1.5 rounded-full bg-[#00D4FF]/15 px-4 py-1.5 text-sm font-semibold text-[#00D4FF] ring-1 ring-[#00D4FF]/30 transition-colors hover:bg-[#00D4FF]/25 active:scale-95"
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Barre de navigation principale ───────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#0A0E1A]/95 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navigation principale"
      >
        <div className="flex h-[4rem] items-stretch">
          {/* Onglets primaires (inchangés) */}
          {config.primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab);

            if (tab.disabled) {
              return (
                <span
                  key={tab.id}
                  aria-disabled="true"
                  title="Bientôt disponible"
                  className="flex flex-1 flex-col items-center justify-center gap-1 px-1 text-white/25 cursor-not-allowed select-none"
                >
                  <Icon className="h-[1.25rem] w-[1.25rem]" aria-hidden />
                  <span className="text-[11px] font-medium leading-none tracking-[0.01em]">
                    {tab.label}
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors duration-fast',
                  active ? 'text-[#00D4FF]' : 'text-white/55 hover:text-white/75',
                )}
              >
                <Icon
                  className={cn(
                    'h-[1.25rem] w-[1.25rem] transition-[filter] duration-fast',
                    active && 'drop-shadow-[0_0_8px_rgba(0,212,255,0.75)]',
                  )}
                  aria-hidden
                />
                <span className="text-[11px] font-medium leading-none tracking-[0.01em]">
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* Bouton Menu */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Menu principal"
            aria-expanded={menuOpen}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors duration-fast',
              isAnyMenuActive || menuOpen ? 'text-[#00D4FF]' : 'text-white/55 hover:text-white/75',
            )}
          >
            <Menu
              className={cn(
                'h-[1.25rem] w-[1.25rem] transition-[filter] duration-fast',
                (isAnyMenuActive || menuOpen) && 'drop-shadow-[0_0_8px_rgba(0,212,255,0.75)]',
              )}
              aria-hidden
            />
            <span className="text-[11px] font-medium leading-none tracking-[0.01em]">Menu</span>
          </button>
        </div>
      </nav>

      {/* ── Drawer Menu Principal — Navigation Progressive ────────────── */}
      <Sheet open={menuOpen} onOpenChange={handleMenuOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] flex flex-col rounded-t-2xl border-t border-white/10 bg-[#0A0E1A]/98 p-0 text-white backdrop-blur-xl"
        >
          {/* Poignée visuelle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="h-1 w-10 rounded-full bg-white/20" aria-hidden />
          </div>

          {/* En-tête utilisateur */}
          <div className="px-5 py-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-iox-neon text-sm font-semibold text-white shadow-glow-cyan-sm ring-1 ring-[#00D4FF]/30">
                {(user.firstName?.[0] ?? '').toUpperCase()}
                {(user.lastName?.[0] ?? '').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-white/50">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
            {selectedModule === null && (
              <p className="mt-2 text-xs text-white/40">Choisissez une rubrique.</p>
            )}
          </div>

          {/* Navigation progressive */}
          {sections && (
            <div className="flex-1 overflow-y-auto">
              <MobileProgressiveMenu
                sections={sections}
                pathname={pathname}
                selectedModule={selectedModule}
                onSelectModule={setSelectedModule}
                onClose={() => setMenuOpen(false)}
              />
            </div>
          )}

          {/* Pied — profil + déconnexion (séparé des modules métier) */}
          <div className="border-t border-white/20 px-3 py-3 flex-shrink-0">
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/5"
            >
              <UserCog className="h-5 w-5 flex-shrink-0 text-white/40" aria-hidden />
              <span className="text-sm font-medium text-white/75">Mon profil</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="mt-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-5 w-5 flex-shrink-0 text-white/40" aria-hidden />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>

          {/* Safe area iOS */}
          <div style={{ height: 'env(safe-area-inset-bottom)' }} />
        </SheetContent>
      </Sheet>
    </>
  );
}
