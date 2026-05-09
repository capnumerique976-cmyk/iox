'use client';

/**
 * IOX — JourneyProgress
 *
 * Indicateur de progression d'un parcours utilisateur (onboarding, commande…).
 * Affiche une liste de étapes avec des dots reliés par des lignes de connexion.
 *
 * Usage :
 *   const steps = [
 *     { id: 'register', label: 'Inscription', status: 'done' },
 *     { id: 'profile', label: 'Profil', status: 'current' },
 *     { id: 'offer', label: 'Offre', status: 'future' },
 *   ];
 *   <JourneyProgress steps={steps} />
 */

import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepStatus = 'done' | 'current' | 'future';

export interface JourneyStep {
  id: string;
  label: string;
  status: StepStatus;
}

interface JourneyProgressProps {
  steps: JourneyStep[];
  className?: string;
}

export function JourneyProgress({ steps, className }: JourneyProgressProps) {
  return (
    <div className={cn('flex items-start', className)} role="list" aria-label="Étapes du parcours">
      {steps.map((step, index) => (
        <div key={step.id} className="relative flex flex-1 flex-col items-center" role="listitem">
          {/* Connector line between steps */}
          {index < steps.length - 1 && (
            <div
              aria-hidden
              className={cn(
                'absolute top-3 left-[calc(50%+12px)] right-0 h-0.5 -translate-y-0.5',
                step.status === 'done' ? 'bg-blue-500' : 'bg-gray-200',
              )}
            />
          )}

          {/* Dot */}
          <div className="flex flex-col items-center gap-1">
            {step.status === 'done' ? (
              <CheckCircle2 className="h-6 w-6 text-blue-500" aria-hidden />
            ) : step.status === 'current' ? (
              <Circle className="h-6 w-6 fill-blue-500 text-blue-500" aria-hidden />
            ) : (
              <Circle className="h-6 w-6 text-gray-300" aria-hidden />
            )}
            <span
              className={cn(
                'text-xs leading-tight text-center',
                step.status === 'future' ? 'text-gray-400' : 'font-medium text-gray-700',
              )}
            >
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
