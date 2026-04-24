'use client';

/**
 * IOX — MobileSidebar
 *
 * Déclencheur hamburger + Sheet drawer latéral gauche. Sur mobile/tablette
 * (<md) le menu principal horizontal est masqué : ce drawer expose les
 * 5 sections + leurs items dans une liste accordéon-like (toutes ouvertes,
 * navigation rapide).
 */
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '@/components/brand/logo';
import { useAuth } from '@/contexts/auth.context';
import { hasPermission, ROLE_LABELS } from '@/lib/auth';
import { UserRole } from '@iox/shared';
import { cn } from '@/lib/utils';
import {
  HOME_SECTION,
  SECTIONS,
  getActiveSection,
  type NavSection,
  type NavItem,
} from './nav-config';

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const close = () => setOpen(false);
  const active = getActiveSection(pathname);

  const canSeeSection = (section: NavSection) =>
    section.permission === '*' ||
    user.role === UserRole.ADMIN ||
    hasPermission(user.role, section.permission);

  const canSeeItem = (item: NavItem) =>
    item.permission === '*' ||
    user.role === UserRole.ADMIN ||
    hasPermission(user.role, item.permission);

  const EXACT_MATCH_ROUTES = new Set(['/dashboard', '/admin', '/profile']);
  const isItemActive = (href: string) =>
    EXACT_MATCH_ROUTES.has(href) ? pathname === href : pathname.startsWith(href);

  const visibleSections = [HOME_SECTION, ...SECTIONS].filter(canSeeSection);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Ouvrir le menu de navigation"
          className="inline-flex items-center justify-center rounded-lg p-2 text-white/70 transition-colors hover:bg-white/5 hover:text-white md:hidden"
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

        <div className="flex h-[calc(100%-3.5rem)] flex-col">
          <div className="flex-1 overflow-y-auto py-2">
            {visibleSections.map((section) => {
              const SectionIcon = section.icon;
              const isActiveSection = active.id === section.id;
              const items = section.items.filter(canSeeItem);
              if (items.length === 0) return null;
              return (
                <div key={section.id} className="mb-2">
                  <Link
                    href={section.href}
                    onClick={close}
                    className={cn(
                      'mx-2.5 flex items-center gap-2 rounded-md px-2.5 py-1.5 transition-colors',
                      isActiveSection ? 'bg-white/5' : 'hover:bg-white/[0.03]',
                    )}
                  >
                    <SectionIcon
                      className={cn(
                        'h-3.5 w-3.5',
                        isActiveSection ? 'text-[#00D4FF]' : 'text-white/40',
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-[0.14em]',
                        isActiveSection ? 'text-[#00D4FF]' : 'text-white/55',
                      )}
                    >
                      {section.label}
                    </span>
                  </Link>
                  <div className="mt-1 px-2.5 space-y-0.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const itemActive = isItemActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={close}
                          aria-current={itemActive ? 'page' : undefined}
                          className={cn(
                            'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-fast ease-premium',
                            itemActive
                              ? 'bg-gradient-to-r from-[#00D4FF]/18 via-[#7B61FF]/10 to-transparent font-semibold text-white ring-1 ring-inset ring-[#00D4FF]/20'
                              : 'text-white/65 hover:bg-white/5 hover:text-white',
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-4 w-4 flex-shrink-0',
                              itemActive
                                ? 'text-[#00D4FF]'
                                : 'text-white/40 group-hover:text-white/80',
                            )}
                            aria-hidden
                          />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pied de drawer — user + logout */}
          <div className="border-t border-white/10 bg-gradient-to-b from-transparent to-white/[0.03] p-4">
            <Link
              href="/profile"
              onClick={close}
              className="-mx-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/5"
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
                close();
                logout();
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-white/55 transition-colors hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Déconnexion
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
