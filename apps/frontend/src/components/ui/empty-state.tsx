'use client';

/**
 * IOX UI — EmptyState (DS-1)
 *
 * État vide standard (pas de données, pas de résultats de recherche, …)
 * avec icône, titre, description optionnelle, et action optionnelle.
 *
 * Exemples :
 *   <EmptyState
 *     icon={<Package className="h-8 w-8" />}
 *     title="Aucun produit"
 *     description="Commencez par créer votre premier produit."
 *     action={<Button variant="primary">Nouveau produit</Button>}
 *   />
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'py-12 px-6 gap-3',
        className,
      )}
      {...props}
    >
      {icon ? (
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-2xl mb-1',
            'bg-gradient-to-br from-[rgba(45,156,219,0.1)] to-[rgba(45,156,219,0.2)]',
            'text-premium-accent shadow-premium-sm',
          )}
          aria-hidden
        >
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
