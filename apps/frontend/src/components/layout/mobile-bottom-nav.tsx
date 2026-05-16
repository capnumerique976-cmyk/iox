'use client';

/**
 * IOX — MobileBottomNav (M115)
 *
 * Structure :
 *   ┌──────────────────────────────────────────────┐
 *   │  [Action contextuelle flottante]             │  ← selon la route
 *   ├──────────────────────────────────────────────┤
 *   │ Onglet1 │ Onglet2 │ Onglet3 │ Onglet4 │ Menu │  ← toujours visible
 *   └──────────────────────────────────────────────┘
 *
 * Menu ouvre un drawer bottom sheet avec sections accordéon :
 *   Section 1 (ouverte par défaut)
 *     └ Item A / Item B / ...
 *   Section 2 (fermée)
 *   ...
 *
 * Règles :
 *   - primaryTabs : inchangés (4 max, tests existants verts)
 *   - "Menu" remplace "Plus" — même Sheet, contenu restructuré
 *   - Accordéon custom (pas de dep externe)
 *   - Visible uniquement sur mobile (<md)
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, UserCog, ChevronDown, ChevronRight } from 'lucide-react';
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
  type MobileMenuSection,
} from './mobile-menu-config';

/* ------------------------------------------------------------------ */
/*  Composant interne — Section accordéon                               */
/* ------------------------------------------------------------------ */

interface SectionProps {
  section: MobileMenuSection;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  onItemClick: () => void;
}

function MenuSection({ section, isOpen, onToggle, pathname, onItemClick }: SectionProps) {
  const Icon = section.icon;
  const hasActive = section.items.some(
    (item) => !item.disabled && isPathActive(pathname, item.href),
  );

  return (
    <div className="rounded-xl overflow-hidden">
      {/* En-tête section */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors',
          isOpen ? 'bg-white/5' : 'hover:bg-white/5',
          hasActive && 'text-[#00D4FF]',
        )}
        aria-expanded={isOpen}
      >
        <Icon
          className={cn(
            'h-5 w-5 flex-shrink-0',
            hasActive ? 'text-[#00D4FF]' : 'text-white/50',
          )}
          aria-hidden
        />
        <span className={cn('flex-1 text-sm font-semibold', !hasActive && 'text-white/85')}>
          {section.label}
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-white/30" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 text-white/30" aria-hidden />
        )}
      </button>

      {/* Items de la section */}
      {isOpen && (
        <div className="px-2 pb-2">
          {section.items.map((item) => {
            const ItemIcon = item.icon;
            const active = !item.disabled && isPathActive(pathname, item.href);

            if (item.disabled) {
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-white/25 cursor-not-allowed"
                  title={item.disabledNote}
                >
                  <ItemIcon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{item.label}</p>
                    {item.disabledNote && (
                      <p className="text-xs text-white/20 leading-snug mt-0.5">{item.disabledNote}</p>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
                  active
                    ? 'bg-[#00D4FF]/10 text-[#00D4FF] ring-1 ring-inset ring-[#00D4FF]/20'
                    : 'text-white/75 hover:bg-white/5 hover:text-white',
                )}
              >
                <ItemIcon
                  className={cn(
                    'mt-0.5 h-4 w-4 flex-shrink-0',
                    active ? 'text-[#00D4FF]' : 'text-white/40',
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{item.label}</p>
                  {item.description && (
                    <p className="text-xs text-white/35 leading-snug mt-0.5">{item.description}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Composant principal                                                 */
/* ------------------------------------------------------------------ */

export function MobileBottomNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Get sections for current user role (may be null for staff)
  const sections = user ? getMobileMenuSections(user.role) : null;

  // MUST be before any early return — React rules of hooks
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set((sections ?? []).filter((s) => !s.defaultCollapsed).map((s) => s.id)),
  );

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

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

          {/* Bouton Menu (remplace Plus) */}
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

      {/* ── Drawer Menu Principal ─────────────────────────────────────── */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#0A0E1A]/98 p-0 text-white backdrop-blur-xl"
        >
          {/* Poignée visuelle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-white/20" aria-hidden />
          </div>

          {/* En-tête utilisateur */}
          <div className="px-5 py-3 border-b border-white/10">
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
            <p className="mt-2 text-xs text-white/40">Choisissez ce que vous voulez faire.</p>
          </div>

          {/* Sections accordéon */}
          {sections && (
            <div className="px-2 py-2 space-y-0.5">
              {sections.map((section) => (
                <MenuSection
                  key={section.id}
                  section={section}
                  isOpen={openSections.has(section.id)}
                  onToggle={() => toggleSection(section.id)}
                  pathname={pathname}
                  onItemClick={() => setMenuOpen(false)}
                />
              ))}
            </div>
          )}

          {/* Pied — profil + déconnexion */}
          <div className="border-t border-white/10 px-3 py-3">
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
