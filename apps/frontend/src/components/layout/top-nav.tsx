'use client';

/**
 * IOX — TopNav
 *
 * Menu principal horizontal (sections) inspiré de Basecamp. Visible ≥ md.
 * Sous md, le drawer mobile (MobileSidebar) prend le relais avec un sélecteur
 * de section intégré.
 *
 * Active state : la section dont l'un des `pathPrefixes` matche le pathname
 * courant (voir `getActiveSection`).
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth.context';
import { hasPermission } from '@/lib/auth';
import { UserRole } from '@iox/shared';
import { cn } from '@/lib/utils';
import { HOME_SECTION, SECTIONS, getActiveSection, type NavSection } from './nav-config';

export function TopNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const active = getActiveSection(pathname);

  const canSee = (section: NavSection) =>
    section.permission === '*' ||
    user.role === UserRole.ADMIN ||
    hasPermission(user.role, section.permission);

  const visible = [HOME_SECTION, ...SECTIONS].filter(canSee);

  return (
    <nav
      aria-label="Navigation principale"
      className="hidden items-center gap-1 md:flex"
    >
      {visible.map((section) => {
        const Icon = section.icon;
        const isActive = active.id === section.id;
        return (
          <Link
            key={section.id}
            href={section.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group relative inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all duration-fast ease-premium',
              isActive
                ? 'bg-gradient-to-r from-[#00D4FF]/18 via-[#7B61FF]/12 to-transparent font-semibold text-white ring-1 ring-inset ring-[#00D4FF]/25 shadow-[0_0_18px_rgba(0,212,255,0.18)]'
                : 'text-white/70 hover:bg-white/5 hover:text-white',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 transition-colors',
                isActive ? 'text-[#00D4FF]' : 'text-white/50 group-hover:text-white/80',
              )}
              aria-hidden
            />
            <span>{section.label}</span>
            {isActive && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-2 -bottom-[7px] h-[2px] rounded-full bg-gradient-to-r from-[#00D4FF] to-[#7B61FF] shadow-[0_0_10px_rgba(0,212,255,0.7)]"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
