'use client';

/**
 * IOX UI — Skeleton (DS-1)
 *
 * Placeholder de chargement avec shimmer DS-0 (`.skeleton-shimmer`).
 *
 * Exemples :
 *   <Skeleton className="h-4 w-24" />
 *   <Skeleton variant="circle" className="h-10 w-10" />
 *   <Skeleton variant="text" />
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const skeletonVariants = cva('skeleton-shimmer', {
  variants: {
    variant: {
      default: 'rounded-xl',
      text: 'h-4 w-full rounded-md',
      circle: 'rounded-full',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof skeletonVariants> {}

export function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return <div aria-hidden className={cn(skeletonVariants({ variant }), className)} {...props} />;
}
