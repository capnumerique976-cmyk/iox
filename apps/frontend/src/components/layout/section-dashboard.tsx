'use client';

/**
 * IOX — SectionDashboard
 *
 * Landing page réutilisable d'une rubrique principale (Référentiel, Production,
 * Marketplace, Distribution, Administration).
 *
 * Composition :
 *  - PageHeader avec icône de section
 *  - Description courte du domaine
 *  - Grille de cards d'accès rapide vers les pages métier (filtrées par
 *    permissions, items `hideOnDashboard` exclus)
 *
 * Volontairement sans KPI live à cette itération : le but du Lot 7 est la
 * réorganisation de la navigation. Les KPIs par rubrique seront ajoutés dans
 * un lot ultérieur en s'appuyant sur les endpoints existants.
 */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { hasPermission } from '@/lib/auth';
import { UserRole } from '@iox/shared';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { NavSection, NavItem } from './nav-config';

export function SectionDashboard({ section }: { section: NavSection }) {
  const { user } = useAuth();
  const SectionIcon = section.icon;

  if (!user) return null;

  const canSee = (item: NavItem) =>
    item.permission === '*' ||
    user.role === UserRole.ADMIN ||
    hasPermission(user.role, item.permission);

  const cards = section.items.filter((it) => !it.hideOnDashboard).filter(canSee);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<SectionIcon className="h-5 w-5" aria-hidden />}
        eyebrow="Tableau de rubrique"
        title={section.label}
        subtitle={section.description}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((item) => (
          <QuickAccessCard key={item.href} item={item} />
        ))}
      </div>
    </div>
  );
}

function QuickAccessCard({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="group block focus:outline-none">
      <Card
        variant="glass"
        className={cn(
          'relative h-full overflow-hidden p-5 transition-all duration-base ease-premium',
          'hover:-translate-y-0.5 hover:border-[#00D4FF]/40 hover:shadow-[0_8px_28px_rgba(0,212,255,0.12)]',
          'group-focus-visible:ring-2 group-focus-visible:ring-[#00D4FF]/60',
        )}
      >
        {/* Filet top révélé au hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00D4FF]/50 to-transparent opacity-0 transition-opacity duration-base ease-premium group-hover:opacity-100"
        />
        <div className="flex items-start gap-3">
          <div
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#7B61FF]/15 ring-1 ring-inset ring-[#00D4FF]/25 shadow-[0_4px_14px_rgba(0,212,255,0.18)]"
          >
            <Icon className="h-5 w-5 text-[#00D4FF]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-semibold text-white">{item.label}</h3>
              <ArrowRight
                className="h-4 w-4 flex-shrink-0 text-white/30 transition-all group-hover:translate-x-0.5 group-hover:text-[#00D4FF]"
                aria-hidden
              />
            </div>
            {item.description ? (
              <p className="mt-1 text-xs leading-relaxed text-white/55">{item.description}</p>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
