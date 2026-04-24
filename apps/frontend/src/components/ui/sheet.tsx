'use client';

/**
 * IOX UI — Sheet (DS-1)
 *
 * Panneau latéral (drawer) basé sur Radix Dialog — même API que `Dialog`
 * mais avec `side` (left/right/top/bottom) et transitions glissantes.
 *
 * Exemples :
 *   <Sheet>
 *     <SheetTrigger asChild><Button>Filtres</Button></SheetTrigger>
 *     <SheetContent side="right">
 *       <SheetHeader>
 *         <SheetTitle>Filtres</SheetTitle>
 *         <SheetDescription>Affinez votre recherche.</SheetDescription>
 *       </SheetHeader>
 *       …
 *       <SheetFooter>
 *         <SheetClose asChild><Button>Valider</Button></SheetClose>
 *       </SheetFooter>
 *     </SheetContent>
 *   </Sheet>
 */
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-[rgba(10,31,77,0.4)] backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out ' +
        'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

const sheetVariants = cva(
  'fixed z-50 gap-4 bg-background shadow-premium-xl transition ease-premium ' +
    'data-[state=open]:animate-in data-[state=closed]:animate-out ' +
    'data-[state=open]:duration-300 data-[state=closed]:duration-200',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left:
          'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r ' +
          'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
        right:
          'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l ' +
          'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
      },
    },
    defaultVariants: { side: 'right' },
  },
);

export interface SheetContentProps
  extends
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), 'p-6', className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className={cn(
          'absolute right-4 top-4 rounded-lg p-1.5 opacity-70 transition-opacity',
          'hover:opacity-100 hover:bg-muted',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:pointer-events-none',
        )}
      >
        <X className="h-4 w-4" aria-hidden />
        <span className="sr-only">Fermer</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = 'SheetContent';

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
  );
}
SheetHeader.displayName = 'SheetHeader';

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2',
        className,
      )}
      {...props}
    />
  );
}
SheetFooter.displayName = 'SheetFooter';

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;
