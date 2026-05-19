'use client';

/**
 * IOX — DailyActionsPanel (M103)
 *
 * Panneau "travail du jour" affiché en haut de chaque dashboard.
 * Montre la 1ère action comme bloc principal, les suivantes en liste.
 * État vide : message positif si aucune action à faire.
 *
 * Design : light cards cohérentes avec les dashboards IOX existants.
 * Mobile-first, responsive.
 *
 * Usage :
 *   <DailyActionsPanel
 *     actions={sellerActions}
 *     isLoading={dataNotReady}
 *     title="À faire aujourd'hui"
 *     emptyMessage="Tout est à jour"
 *     emptyDescription="Aucune action urgente pour aujourd'hui."
 *   />
 */
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type DailyAction, type ActionPriority } from '@/lib/daily-actions';

/* ------------------------------------------------------------------ */
/*  DailyActionsPanel                                                   */
/* ------------------------------------------------------------------ */

interface DailyActionsPanelProps {
  actions: DailyAction[];
  isLoading?: boolean;
  /** Titre du panneau. Défaut : "À faire aujourd'hui" */
  title?: string;
  /** Message état vide. Défaut : "Tout est à jour" */
  emptyMessage?: string;
  /** Description état vide. */
  emptyDescription?: string;
}

export function DailyActionsPanel({
  actions,
  isLoading = false,
  title = 'À faire aujourd\'hui',
  emptyMessage = 'Tout est à jour',
  emptyDescription = 'Aucune action urgente pour aujourd\'hui.',
}: DailyActionsPanelProps) {
  if (isLoading) {
    return (
      <div
        aria-busy="true"
        aria-label="Chargement des actions du jour"
        className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div className="mb-3 h-4 w-40 animate-pulse rounded bg-gray-100" />
        <div className="h-16 animate-pulse rounded-lg bg-gray-50" />
      </div>
    );
  }

  return (
    <section
      aria-label={title}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>

      {actions.length === 0 ? (
        /* ── État vide ── */
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600"
            aria-hidden
          />
          <div>
            <p className="font-semibold text-emerald-900">{emptyMessage}</p>
            <p className="mt-0.5 text-sm text-emerald-700">{emptyDescription}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* ── Action principale ── */}
          <PrimaryActionCard action={actions[0]} />

          {/* ── Actions secondaires (2 à 4) ── */}
          {actions.length > 1 && (
            <ul className="space-y-2" aria-label="Autres actions">
              {actions.slice(1, 5).map((action) => (
                <li key={action.id}>
                  <SecondaryActionRow action={action} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PrimaryActionCard — action principale mise en avant                 */
/* ------------------------------------------------------------------ */

function PrimaryActionCard({ action }: { action: DailyAction }) {
  const Icon = action.icon;
  const style = priorityStyle(action.priority);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between',
        style.container,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
            style.iconBox,
          )}
          aria-hidden
        >
          <Icon className={cn('h-5 w-5', style.iconColor)} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn('font-semibold', style.titleColor)}>{action.title}</p>
            {action.badge && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  style.badge,
                )}
              >
                {action.badge}
              </span>
            )}
          </div>
          <p className={cn('mt-0.5 text-sm', style.descColor)}>{action.description}</p>
        </div>
      </div>

      <Link
        href={action.href}
        className={cn(
          'inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
          style.cta,
        )}
      >
        {ctaLabel(action.priority)}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SecondaryActionRow — action secondaire compacte                     */
/* ------------------------------------------------------------------ */

function SecondaryActionRow({ action }: { action: DailyAction }) {
  const Icon = action.icon;
  const style = priorityStyle(action.priority);

  return (
    <Link
      href={action.href}
      className={cn(
        'group flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:shadow-sm',
        style.secondary,
      )}
    >
      <Icon
        className={cn('h-4 w-4 flex-shrink-0', style.iconColor)}
        aria-hidden
      />
      <span className={cn('flex-1 truncate text-sm font-medium', style.titleColor)}>
        {action.title}
      </span>
      {action.badge && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
            style.badge,
          )}
        >
          {action.badge}
        </span>
      )}
      <ArrowRight
        className={cn('h-3.5 w-3.5 flex-shrink-0 opacity-50 transition-transform group-hover:translate-x-0.5', style.iconColor)}
        aria-hidden
      />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Style helpers                                                        */
/* ------------------------------------------------------------------ */

interface PriorityStyle {
  container: string;
  iconBox: string;
  iconColor: string;
  titleColor: string;
  descColor: string;
  badge: string;
  cta: string;
  secondary: string;
}

function priorityStyle(priority: ActionPriority): PriorityStyle {
  switch (priority) {
    case 'urgent':
      return {
        container: 'border-orange-200 bg-orange-50',
        iconBox: 'bg-orange-100',
        iconColor: 'text-orange-600',
        titleColor: 'text-orange-900',
        descColor: 'text-orange-700',
        badge: 'bg-orange-200 text-orange-800',
        cta: 'bg-orange-600 text-white hover:bg-orange-700',
        secondary: 'border-orange-200 bg-orange-50 hover:bg-orange-100',
      };
    case 'action':
      return {
        container: 'border-blue-200 bg-blue-50',
        iconBox: 'bg-blue-100',
        iconColor: 'text-blue-600',
        titleColor: 'text-blue-900',
        descColor: 'text-blue-700',
        badge: 'bg-blue-200 text-blue-800',
        cta: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'border-blue-100 bg-white hover:border-blue-200 hover:bg-blue-50',
      };
    case 'info':
    default:
      return {
        container: 'border-gray-200 bg-gray-50',
        iconBox: 'bg-gray-100',
        iconColor: 'text-gray-500',
        titleColor: 'text-gray-900',
        descColor: 'text-gray-600',
        badge: 'bg-gray-200 text-gray-700',
        cta: 'bg-gray-800 text-white hover:bg-gray-900',
        secondary: 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
      };
  }
}

function ctaLabel(priority: ActionPriority): string {
  switch (priority) {
    case 'urgent': return 'Corriger maintenant';
    case 'action': return 'Voir';
    case 'info':  return 'Accéder';
    default: return 'Voir';
  }
}
