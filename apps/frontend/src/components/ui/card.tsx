'use client';

/**
 * IOX UI — Card (DS-1)
 *
 * Carte premium avec variants DS-0 (premium/glass/metric) + sous-parties shadcn.
 *
 * Exemples :
 *   <Card variant="premium" interactive>
 *     <CardHeader>
 *       <CardTitle>Titre</CardTitle>
 *       <CardDescription>Sous-titre</CardDescription>
 *     </CardHeader>
 *     <CardContent>…</CardContent>
 *     <CardFooter>…</CardFooter>
 *   </Card>
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const cardVariants = cva('rounded-2xl border transition-all duration-base ease-premium', {
  variants: {
    variant: {
      // shadcn par défaut — compatibilité avec l'existant si besoin
      default: 'bg-card text-card-foreground border-border shadow-sm',
      // Carte premium principale (fond blanc, shadow navy, barre accent au top au hover)
      premium:
        'bg-card text-card-foreground border-[rgba(10,31,77,0.06)] shadow-premium-md ' +
        'dark:bg-white/5 dark:border-white/10',
      // Carte glass (backdrop-blur)
      glass: 'surface-glass text-foreground rounded-2xl shadow-premium-lg',
      // Carte métrique : fond subtil gradient + halo accent en top-right
      metric:
        'relative overflow-hidden bg-gradient-to-br from-white/95 to-white ' +
        'border-[rgba(10,31,77,0.08)] shadow-premium-lg ' +
        'dark:from-white/[0.05] dark:to-white/[0.08] dark:border-white/10',
    },
    interactive: {
      true: 'cursor-pointer hover-lift',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'premium',
    interactive: false,
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(cardVariants({ variant, interactive }), className)} {...props}>
        {/* Halo accent sur variant metric (cf. Figma metric-card-premium::after) */}
        {variant === 'metric' ? (
          <span
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 h-[120px] w-[120px] translate-x-[30%] -translate-y-[30%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(45, 156, 219, 0.1) 0%, transparent 70%)',
            }}
          />
        ) : null}
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-foreground', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('relative z-[1] p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';
