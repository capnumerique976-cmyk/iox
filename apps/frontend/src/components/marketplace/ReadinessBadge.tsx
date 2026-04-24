import { cn } from '@/lib/utils';
import type { ReadinessStatus } from '@/lib/marketplace/types';

const MAP: Record<ReadinessStatus, { label: string; cls: string }> = {
  NOT_ELIGIBLE: { label: 'Non éligible export', cls: 'bg-gray-100 text-gray-600' },
  INTERNAL_ONLY: { label: 'Marché local', cls: 'bg-blue-100 text-blue-800' },
  PENDING_DOCUMENTS: { label: 'Docs attendus', cls: 'bg-amber-100 text-amber-800' },
  PENDING_QUALITY_REVIEW: { label: 'Revue qualité', cls: 'bg-amber-100 text-amber-800' },
  EXPORT_READY: { label: 'Export prêt', cls: 'bg-green-100 text-green-800' },
  EXPORT_READY_WITH_CONDITIONS: {
    label: 'Export sous conditions',
    cls: 'bg-emerald-100 text-emerald-800',
  },
};

export function ReadinessBadge({
  status,
  className,
}: {
  status: ReadinessStatus;
  className?: string;
}) {
  const cfg = MAP[status] ?? MAP.PENDING_QUALITY_REVIEW;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        cfg.cls,
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
