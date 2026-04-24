import { cn } from '@/lib/utils';
import type { ReadinessStatus } from '@/lib/marketplace/types';

/**
 * Badge "prêt à l'export" — palette dark-premium neon.
 *
 * - Utilise des teintes translucides compatibles avec les surfaces glass sombres
 *   de la marketplace tout en restant lisibles sur fond clair (border + bg low alpha).
 */
const MAP: Record<ReadinessStatus, { label: string; cls: string }> = {
  NOT_ELIGIBLE: {
    label: 'Non éligible export',
    cls: 'border border-white/10 bg-white/5 text-white/60',
  },
  INTERNAL_ONLY: {
    label: 'Marché local',
    cls: 'border border-[#7B61FF]/30 bg-[#7B61FF]/15 text-[#b9a8ff]',
  },
  PENDING_DOCUMENTS: {
    label: 'Docs attendus',
    cls: 'border border-[#FFB800]/30 bg-[#FFB800]/10 text-[#ffd56a]',
  },
  PENDING_QUALITY_REVIEW: {
    label: 'Revue qualité',
    cls: 'border border-[#FFB800]/30 bg-[#FFB800]/10 text-[#ffd56a]',
  },
  EXPORT_READY: {
    label: 'Export prêt',
    cls: 'border border-[#00F5A0]/30 bg-[#00F5A0]/15 text-[#6ff2c0]',
  },
  EXPORT_READY_WITH_CONDITIONS: {
    label: 'Export sous conditions',
    cls: 'border border-[#00D4FF]/30 bg-[#00D4FF]/10 text-[#6fe5ff]',
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
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm',
        cfg.cls,
        className,
      )}
    >
      {cfg.label}
    </span>
  );
}
