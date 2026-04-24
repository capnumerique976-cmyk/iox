/**
 * IOX UI — Barrel export (DS-1)
 *
 * Point d'entrée unique du design system.
 *
 * Usage :
 *   import { Button, Card, CardHeader, CardTitle, MetricCard } from '@/components/ui';
 *
 * Composants livrés (DS-1) :
 *   Primitives  — Button, Input, Label, Separator
 *   Containers  — Card (+ sous-parties), Dialog, Sheet, Tabs
 *   Feedback    — Badge, StatusBadge, Skeleton, EmptyState
 *   Data viz    — MetricCard
 *   Display     — Avatar
 */

// ─── Primitives ────────────────────────────────────────────────────────────
export { Button, buttonVariants, type ButtonProps } from './button';
export { Input, inputVariants, type InputProps } from './input';
export { Label } from './label';
export { Separator } from './separator';

// ─── Containers ────────────────────────────────────────────────────────────
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
  type CardProps,
} from './card';

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from './dialog';

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
  SheetPortal,
  type SheetContentProps,
} from './sheet';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

// ─── Feedback ──────────────────────────────────────────────────────────────
export { Badge, badgeVariants, type BadgeProps } from './badge';
export {
  StatusBadge,
  type ColorVariant,
  type StatusConfig,
  type StatusBadgeTone,
  BENEFICIARY_STATUS_CONFIG,
  PRODUCT_STATUS_CONFIG,
  BATCH_STATUS_CONFIG,
  MARKET_DECISION_CONFIG,
  ACTION_STATUS_CONFIG,
  INBOUND_BATCH_STATUS_CONFIG,
  SUPPLY_CONTRACT_STATUS_CONFIG,
} from './status-badge';
export { Skeleton, skeletonVariants, type SkeletonProps } from './skeleton';
export { EmptyState, type EmptyStateProps } from './empty-state';
export { ErrorState, type ErrorStateProps } from './error-state';
export { ErrorBoundary } from './error-boundary';

// ─── Data viz ──────────────────────────────────────────────────────────────
export { MetricCard, type MetricCardProps } from './metric-card';

// ─── Display ───────────────────────────────────────────────────────────────
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
