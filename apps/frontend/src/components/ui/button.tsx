'use client';

/**
 * IOX UI — Button (DS-1)
 *
 * Bouton premium full-Tailwind, basé sur les tokens DS-0.
 * Supporte Slot (asChild), loading, icônes gauche/droite.
 *
 * Exemples :
 *   <Button>Continuer</Button>
 *   <Button variant="primary" size="lg" leftIcon={<Plus className="h-4 w-4" />}>Nouveau produit</Button>
 *   <Button variant="glass" loading>Chargement…</Button>
 *   <Button asChild><Link href="/x">Lien</Link></Button>
 */
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium ' +
    'ring-offset-background transition-all duration-base ease-premium ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    'active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-premium-sm',
        primary:
          'bg-gradient-iox-primary text-white shadow-premium-md shadow-glow-primary hover:shadow-premium-lg',
        accent:
          'bg-gradient-iox-accent text-white shadow-premium-md shadow-glow-accent hover:shadow-premium-lg',
        glass: 'surface-glass text-foreground hover:bg-white/20 shadow-premium-sm',
        outline: 'border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-premium-sm',
        link: 'text-premium-accent underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10 p-0',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    // asChild = l'enfant gère son propre rendu : on n'injecte pas d'icônes/loader.
    if (asChild) {
      return (
        <Comp
          ref={ref}
          className={cn(buttonVariants({ variant, size, fullWidth }), className)}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
