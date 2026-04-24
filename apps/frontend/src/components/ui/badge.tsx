'use client';

/**
 * IOX UI — Badge (DS-1)
 *
 * Badge générique (tag, filtre, catégorie). Pour un badge sémantique
 * lié à un statut métier IOX (produit/lot/contrat/…), voir `status-badge.tsx`.
 *
 * Exemples :
 *   <Badge>Default</Badge>
 *   <Badge variant="success" tone="premium">Conforme</Badge>
 *   <Badge variant="outline" size="sm">12</Badge>
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-xl font-medium ' +
    'transition-colors duration-base ease-premium ' +
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        success: 'bg-[rgba(39,174,96,0.1)] text-[#1a7a3f] dark:text-[#3dd47f]',
        warning: 'bg-[rgba(242,153,74,0.1)] text-[#b06a20] dark:text-[#f5b072]',
        danger: 'bg-[rgba(235,87,87,0.1)] text-[#a82626] dark:text-[#f58c8c]',
        info: 'bg-[rgba(45,156,219,0.1)] text-[#1668a3] dark:text-[#5AB7E8]',
        neutral: 'bg-muted text-muted-foreground',
        outline: 'border border-border text-foreground',
      },
      tone: {
        flat: '',
        // Tone premium — gradient + ombre. Les gradient bg écrasent la bg variant.
        premium: 'text-white shadow-premium-sm',
      },
      size: {
        sm: 'px-2 py-0.5 text-[11px]',
        md: 'px-3 py-1 text-xs',
      },
    },
    compoundVariants: [
      // Mapping variant → gradient quand tone="premium"
      { tone: 'premium', variant: 'default', class: 'bg-gradient-iox-primary' },
      { tone: 'premium', variant: 'info', class: 'bg-gradient-iox-accent' },
      { tone: 'premium', variant: 'success', class: 'bg-gradient-iox-success' },
      { tone: 'premium', variant: 'warning', class: 'bg-gradient-iox-warning' },
      { tone: 'premium', variant: 'danger', class: 'bg-premium-danger' },
      { tone: 'premium', variant: 'neutral', class: 'bg-muted-foreground/80' },
      { tone: 'premium', variant: 'outline', class: 'bg-background border-2' },
    ],
    defaultVariants: {
      variant: 'default',
      tone: 'flat',
      size: 'md',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, tone, size }), className)} {...props} />;
}
