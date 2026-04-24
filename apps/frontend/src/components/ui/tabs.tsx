'use client';

/**
 * IOX UI — Tabs (DS-1)
 *
 * Wrap Radix Tabs avec indicateur animé (`layoutId="iox-tab-indicator"`) —
 * port du pattern Figma `activeTab`.
 *
 * Exemples :
 *   <Tabs defaultValue="overview">
 *     <TabsList>
 *       <TabsTrigger value="overview">Aperçu</TabsTrigger>
 *       <TabsTrigger value="details">Détails</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="overview">…</TabsContent>
 *     <TabsContent value="details">…</TabsContent>
 *   </Tabs>
 */
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-11 items-center justify-start gap-1 rounded-xl p-1',
      'bg-muted/50 text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-1.5 text-sm font-medium',
      'ring-offset-background transition-colors duration-base ease-premium',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=active]:text-premium-primary dark:data-[state=active]:text-white',
      'data-[state=inactive]:hover:text-foreground',
      className,
    )}
    {...props}
  >
    {/* Indicateur animé : présent uniquement quand l'onglet est actif */}
    <span className="relative z-10">{children}</span>
    <TabActiveIndicator />
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

/**
 * Indicateur animé du TabsTrigger actif.
 * On le rend seulement quand le trigger est en data-state="active" (Radix).
 * On utilise un hook CSS via selector : le motion.span lui-même vérifie son
 * parent via un sentinel rendu conditionnellement.
 */
function TabActiveIndicator() {
  return (
    <motion.span
      layoutId="iox-tab-indicator"
      className={cn(
        'absolute inset-0 rounded-lg bg-background shadow-premium-sm',
        // Ne s'affiche que quand le trigger parent est actif.
        'hidden [[data-state=active]>&]:block',
      )}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    />
  );
}

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
