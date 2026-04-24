'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  Building2,
  FileSignature,
  Inbox,
  GitBranch,
  Boxes,
  Tag,
  CheckCircle2,
  Search,
  Store,
  MessageSquareQuote,
  FolderLock,
  Truck,
  AlertTriangle,
  FileArchive,
  ShieldCheck,
  UserCog,
  Network,
  ClipboardList,
  Activity,
  ScrollText,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { hasPermission, ROLE_LABELS } from '@/lib/auth';
import { UserRole } from '@iox/shared';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string;
  href: string;
  permission: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/* ------------------------------------------------------------------ */
/*  Navigation structure                                                */
/* ------------------------------------------------------------------ */

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Vue d'ensemble",
    items: [
      { label: 'Tableau de bord', href: '/dashboard', permission: '*', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Référentiel',
    items: [
      { label: 'Bénéficiaires', href: '/beneficiaries', permission: '*', icon: Users },
      { label: 'Produits', href: '/products', permission: '*', icon: Package },
      { label: 'Entreprises', href: '/companies', permission: '*', icon: Building2 },
      { label: 'Contrats appro.', href: '/supply-contracts', permission: '*', icon: FileSignature },
    ],
  },
  {
    title: 'Chaîne de production',
    items: [
      { label: 'Lots entrants', href: '/inbound-batches', permission: '*', icon: Inbox },
      {
        label: 'Transformations',
        href: '/transformation-operations',
        permission: '*',
        icon: GitBranch,
      },
      { label: 'Lots finis', href: '/product-batches', permission: '*', icon: Boxes },
      { label: 'Étiquetage', href: '/label-validations', permission: '*', icon: Tag },
      {
        label: 'Mise en marché',
        href: '/market-release-decisions',
        permission: '*',
        icon: CheckCircle2,
      },
      { label: 'Traçabilité', href: '/traceability', permission: '*', icon: Search },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { label: 'Cockpit vendeur', href: '/seller/dashboard', permission: '*', icon: Store },
      {
        label: 'Demandes de devis',
        href: '/quote-requests',
        permission: '*',
        icon: MessageSquareQuote,
      },
      {
        label: 'Documents marketplace',
        href: '/seller/documents',
        permission: '*',
        icon: FolderLock,
      },
    ],
  },
  {
    title: 'Distribution & Suivi',
    items: [
      { label: 'Distributions', href: '/distributions', permission: '*', icon: Truck },
      { label: 'Incidents', href: '/incidents', permission: '*', icon: AlertTriangle },
      { label: 'Documents', href: '/documents', permission: '*', icon: FileArchive },
    ],
  },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Tableau admin', href: '/admin', permission: 'users:read', icon: ShieldCheck },
  { label: 'Utilisateurs', href: '/admin/users', permission: 'users:read', icon: UserCog },
  { label: 'Rattachements', href: '/admin/memberships', permission: 'users:read', icon: Network },
  { label: 'Vendeurs', href: '/admin/sellers', permission: 'marketplace:review', icon: Store },
  {
    label: 'File de revue',
    href: '/admin/review-queue',
    permission: 'marketplace:review',
    icon: ClipboardList,
  },
  {
    label: 'Demandes de devis',
    href: '/admin/rfq',
    permission: 'marketplace:review',
    icon: MessageSquareQuote,
  },
  { label: 'Diagnostics', href: '/admin/diagnostics', permission: 'users:read', icon: Activity },
  { label: "Journal d'audit", href: '/audit-logs', permission: 'audit', icon: ScrollText },
];

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

  const EXACT_MATCH_ROUTES = new Set(['/dashboard', '/admin']);
  const isActive = (href: string) =>
    EXACT_MATCH_ROUTES.has(href) ? pathname === href : pathname.startsWith(href);

  const canSee = (item: NavItem) =>
    item.permission === '*' ||
    user.role === UserRole.ADMIN ||
    hasPermission(user.role, item.permission);

  const visibleAdmin = ADMIN_ITEMS.filter(canSee);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto py-4">
        <nav>
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(canSee);
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title} className="mb-2">
                <div className="px-5 pt-3 pb-1.5">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em]">
                    {section.title}
                  </span>
                </div>
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
              </div>
            );
          })}

          {visibleAdmin.length > 0 && (
            <div className="mb-2">
              <div className="px-5 pt-3 pb-1.5">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.12em]">
                  Administration
                </span>
              </div>
              <div className="px-2.5 space-y-0.5">
                {visibleAdmin.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={isActive(item.href)}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* Pied de barre — utilisateur connecté */}
      <div className="p-4 border-t border-gray-200/70 flex-shrink-0 bg-gradient-to-b from-transparent to-gray-50/50">
        <Link
          href="/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-gray-100/80 transition-colors"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-iox-primary text-sm font-semibold text-white shadow-premium-sm">
            {(user.firstName?.[0] ?? '').toUpperCase()}
            {(user.lastName?.[0] ?? '').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-gray-500">{ROLE_LABELS[user.role]}</p>
          </div>
        </Link>
        <button
          onClick={() => {
            onNavigate?.();
            logout();
          }}
          className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
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
    <aside className="hidden lg:flex w-64 min-h-screen bg-white border-r border-gray-200/70 flex-col overflow-hidden">
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
        'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-fast ease-premium',
        active
          ? 'bg-premium-accent/10 text-premium-primary font-medium shadow-premium-sm'
          : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900',
      )}
    >
      {/* Indicateur actif : filet vertical gradient */}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-iox-accent"
        />
      )}
      <Icon
        className={cn(
          'h-4 w-4 flex-shrink-0 transition-colors',
          active ? 'text-premium-accent' : 'text-gray-400 group-hover:text-gray-600',
        )}
        aria-hidden
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
