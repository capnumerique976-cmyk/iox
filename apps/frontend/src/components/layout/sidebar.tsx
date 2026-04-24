'use client';

/**
 * IOX — Sidebar contextuelle
 *
 * Affiche uniquement les items de la section active (voir `nav-config.ts`).
 * Composition à 3 niveaux :
 *   1. TopNav (horizontale)  → choix de section
 *   2. Sidebar (verticale)   → items de la section active
 *   3. Page                  → contenu
 *
 * Sur `/profile` ou hors section identifiée, la sidebar tombe sur HOME_SECTION.
 * Le pied de barre (avatar + déconnexion) est conservé.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { hasPermission, ROLE_LABELS } from '@/lib/auth';
import { UserRole } from '@iox/shared';
import { cn } from '@/lib/utils';
import { getActiveSection, type NavItem } from './nav-config';

/* ------------------------------------------------------------------ */
/*  SidebarContent — partagé desktop (aside) + mobile (drawer)          */
/* ------------------------------------------------------------------ */

/**
 * `onNavigate` permet au parent (drawer mobile) de fermer la Sheet
 * automatiquement après un clic sur un lien. Optionnel côté desktop.
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const section = getActiveSection(pathname);
  const SectionIcon = section.icon;

  const EXACT_MATCH_ROUTES = new Set(['/dashboard', '/admin', '/profile']);
  const isActive = (href: string) =>
    EXACT_MATCH_ROUTES.has(href) ? pathname === href : pathname.startsWith(href);

  const canSee = (item: NavItem) =>
    item.permission === '*' ||
    user.role === UserRole.ADMIN ||
    hasPermission(user.role, item.permission);

  const visibleItems = section.items.filter(canSee);

  return (
    <div className="flex h-full flex-col">
      {/* Eyebrow contextuel — rappelle la section active */}
      <div className="border-b border-white/5 px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#00D4FF]/20 to-[#7B61FF]/15 ring-1 ring-inset ring-[#00D4FF]/25"
          >
            <SectionIcon className="h-3.5 w-3.5 text-[#00D4FF]" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#00D4FF]/70">
              Section
            </p>
            <p className="truncate text-sm font-semibold text-white">{section.label}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        <nav aria-label={`Navigation ${section.label}`}>
          <div className="px-2.5 space-y-0.5">
            {visibleItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </nav>
      </div>

      {/* Pied de barre — utilisateur connecté */}
      <div className="p-4 border-t border-white/10 flex-shrink-0 bg-gradient-to-b from-transparent to-white/[0.03]">
        <Link
          href="/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-white/5"
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
        </Link>
        <button
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-white/55 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          Déconnexion
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar — wrapper desktop (aside fixe)                              */
/* ------------------------------------------------------------------ */

export function Sidebar() {
  // Masquée sous `lg` (<1024px) — sur mobile/tablette le drawer prend le relais.
  return (
    <aside className="hidden lg:flex w-64 min-h-[calc(100vh-3.5rem)] bg-[#0A0E1A]/85 backdrop-blur-xl border-r border-white/10 flex-col overflow-hidden">
      <SidebarContent />
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  NavLink                                                             */
/* ------------------------------------------------------------------ */

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-2.5 overflow-hidden rounded-lg px-3 py-2 text-sm transition-all duration-fast ease-premium',
        active
          ? 'bg-gradient-to-r from-[#00D4FF]/18 via-[#7B61FF]/10 to-transparent font-semibold text-white ring-1 ring-inset ring-[#00D4FF]/20'
          : 'text-white/65 hover:bg-white/5 hover:text-white',
      )}
    >
      {/* Indicateur actif : filet vertical gradient cyan→violet + glow */}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#00D4FF] to-[#7B61FF] shadow-[0_0_10px_rgba(0,212,255,0.7)]"
        />
      )}
      <Icon
        className={cn(
          'h-4 w-4 flex-shrink-0 transition-colors',
          active ? 'text-[#00D4FF]' : 'text-white/40 group-hover:text-white/80',
        )}
        aria-hidden
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
