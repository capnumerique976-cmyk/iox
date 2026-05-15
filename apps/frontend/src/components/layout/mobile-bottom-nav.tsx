'use client';

/**
 * IOX — MobileBottomNav
 *
 * Barre de navigation fixe en bas d'écran pour les rôles marketplace
 * (MARKETPLACE_SELLER et MARKETPLACE_BUYER). Remplace le drawer hamburger
 * comme point d'entrée principal sur mobile.
 *
 * Structure :
 *   ┌──────────────────────────────────────────┐
 *   │  [Action contextuelle flottante]         │  ← apparaît selon la route
 *   ├──────────────────────────────────────────┤
 *   │  Onglet 1  │  Onglet 2  │  Onglet 3  │ Plus │  ← toujours visible
 *   └──────────────────────────────────────────┘
 *
 * Progressive disclosure :
 *   - Onglets primaires : 3 destinations clés, toujours visibles
 *   - "Plus" : ouvre un sheet avec les destinations secondaires
 *   - Action contextuelle : chip flottant spécifique à la route courante
 *
 * Visible uniquement sur mobile (<md). Staff : hamburger existant inchangé.
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal, LogOut, UserCog } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/auth.context';
import { ROLE_LABELS } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  getMobileNavConfig,
  isPathActive,
  type MobileTab,
} from './mobile-nav-config';

/* ------------------------------------------------------------------ */
/*  Composant principal                                                 */
/* ------------------------------------------------------------------ */

export function MobileBottomNav() {
  const [plusOpen, setPlusOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const config = getMobileNavConfig(user.role);
  if (!config) return null; // staff → pas de bottom nav

  /* ── Détection de l'état actif ────────────────────────────────── */

  const isTabActive = (tab: MobileTab) =>
    isPathActive(pathname, tab.pathPrefix, tab.exactMatch);

  const isAnySecondaryActive = config.secondaryItems.some((item) =>
    isPathActive(pathname, item.pathPrefix),
  );

  /* ── Actions contextuelles pour la route courante ─────────────── */

  const contextualEntry = config.contextualActions.find((c) =>
    isPathActive(pathname, c.pathPrefix, c.exactMatch),
  );
  const contextualActions = contextualEntry?.actions ?? [];

  /* ── Rendu ─────────────────────────────────────────────────────── */

  return (
    <>
      {/* ── Action contextuelle flottante ──────────────────────────── */}
      {contextualActions.length > 0 && (
        <div
          className="md:hidden fixed left-0 right-0 z-20 flex justify-center px-6"
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

      {/* ── Barre de navigation principale ─────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#0A0E1A]/95 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navigation principale"
      >
        <div className="flex h-[4rem] items-stretch">
          {/* Onglets primaires */}
          {config.primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab);

            // Onglet désactivé (feature future) — non cliquable, visuellement grisé
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

          {/* Bouton Plus */}
          <button
            type="button"
            onClick={() => setPlusOpen(true)}
            aria-label="Menu secondaire"
            aria-expanded={plusOpen}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors duration-fast',
              isAnySecondaryActive ? 'text-[#00D4FF]' : 'text-white/55 hover:text-white/75',
            )}
          >
            <MoreHorizontal
              className={cn(
                'h-[1.25rem] w-[1.25rem] transition-[filter] duration-fast',
                isAnySecondaryActive && 'drop-shadow-[0_0_8px_rgba(0,212,255,0.75)]',
              )}
              aria-hidden
            />
            <span className="text-[11px] font-medium leading-none tracking-[0.01em]">
              Plus
            </span>
          </button>
        </div>
      </nav>

      {/* ── Sheet "Plus" ────────────────────────────────────────────── */}
      <Sheet open={plusOpen} onOpenChange={setPlusOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#0A0E1A]/98 p-0 text-white backdrop-blur-xl"
        >
          {/* Poignée visuelle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-white/20" aria-hidden />
          </div>

          {/* Items secondaires */}
          <div className="px-3 py-2">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
              Navigation
            </p>
            <div className="space-y-0.5">
              {config.secondaryItems.map((item) => {
                const Icon = item.icon;
                const active = isPathActive(pathname, item.pathPrefix);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setPlusOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-3 transition-colors',
                      active
                        ? 'bg-[#00D4FF]/10 text-[#00D4FF] ring-1 ring-inset ring-[#00D4FF]/20'
                        : 'text-white/75 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0',
                        active ? 'text-[#00D4FF]' : 'text-white/40',
                      )}
                      aria-hidden
                    />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Profil + déconnexion */}
          <div className="border-t border-white/10 px-3 py-3">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
              Compte
            </p>
            <Link
              href="/profile"
              onClick={() => setPlusOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/5"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-iox-neon text-sm font-semibold text-white shadow-glow-cyan-sm ring-1 ring-[#00D4FF]/30">
                {(user.firstName?.[0] ?? '').toUpperCase()}
                {(user.lastName?.[0] ?? '').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-white/50">{ROLE_LABELS[user.role]}</p>
              </div>
              <UserCog className="h-4 w-4 flex-shrink-0 text-white/30" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => {
                setPlusOpen(false);
                logout();
              }}
              className="mt-0.5 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-5 w-5 flex-shrink-0 text-white/40" aria-hidden />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>

          {/* Espace safe-area iOS */}
          <div style={{ height: 'env(safe-area-inset-bottom)' }} />
        </SheetContent>
      </Sheet>
    </>
  );
}
