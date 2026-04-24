'use client';

/**
 * IOX UI — Input (DS-1)
 *
 * Input premium avec icône optionnelle gauche/droite.
 *
 * Exemples :
 *   <Input placeholder="Email" />
 *   <Input variant="premium" leftIcon={<Search className="h-4 w-4" />} />
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const inputVariants = cva(
  'flex w-full rounded-xl bg-background text-foreground transition-all duration-base ease-premium ' +
    'file:border-0 file:bg-transparent file:text-sm file:font-medium ' +
    'placeholder:text-muted-foreground ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
    'disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border border-input shadow-sm focus-visible:border-ring',
        premium:
          'border-2 border-[rgba(10,31,77,0.1)] shadow-premium-sm ' +
          'focus-visible:border-premium-accent focus-visible:shadow-premium-md focus-visible:-translate-y-[1px] ' +
          'focus-visible:ring-0 focus-visible:ring-offset-0 ' +
          'focus-visible:[box-shadow:0_0_0_4px_rgba(45,156,219,0.1),var(--shadow-premium-md)] ' +
          'dark:bg-white/5 dark:border-white/10',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-4 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, leftIcon, rightIcon, type = 'text', ...props }, ref) => {
    if (!leftIcon && !rightIcon) {
      return (
        <input
          ref={ref}
          type={type}
          className={cn(inputVariants({ variant, size }), className)}
          {...props}
        />
      );
    }

    // Wrap avec icônes
    return (
      <div className="relative w-full">
        {leftIcon ? (
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          >
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          type={type}
          className={cn(
            inputVariants({ variant, size }),
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className,
          )}
          {...props}
        />
        {rightIcon ? (
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          >
            {rightIcon}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';
