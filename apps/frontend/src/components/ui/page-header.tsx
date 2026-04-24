/**
 * IOX — PageHeader
 *
 * En-tête standardisé pour toutes les pages internes (listes, détails, admin,
 * seller). Garantit :
 *  - une typographie H1 cohérente et responsive (`text-xl sm:text-2xl`)
 *  - un sous-titre optionnel court
 *  - un slot `actions` qui passe en dessous du titre sous `sm`, avec wrap
 *  - un slot `icon` décoratif optionnel (lucide icon)
 *
 * Usage :
 *
 *   <PageHeader
 *     title="Bénéficiaires"
 *     subtitle="Personnes habilitées à recevoir une aide"
 *     actions={<Button>+ Nouveau</Button>}
 *   />
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** Icône décorative (lucide) affichée dans un halo accent. */
  icon?: React.ReactNode;
  /** Breadcrumb / retour — rendu au-dessus du titre. */
  eyebrow?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'relative flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        // Fine ligne basse premium (gradient cyan→violet très discret)
        "after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-premium-accent/30 after:via-premium-accent/10 after:to-transparent after:content-['']",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">
            {eyebrow}
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          {icon ? (
            <div
              aria-hidden
              className={cn(
                'hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:inline-flex',
                'bg-gradient-to-br from-premium-accent/20 via-premium-accent/10 to-indigo-500/15',
                'text-premium-accent ring-1 ring-inset ring-premium-accent/20 shadow-premium-sm',
              )}
            >
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export default PageHeader;
