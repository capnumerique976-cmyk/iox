'use client';

/**
 * JourneyProgress — visual stepper showing the user's progression.
 *
 * Shows each step as a dot+label with completed/current/upcoming states.
 * On mobile: vertical list. On desktop: horizontal bar.
 * Used in the GuidedDashboard header area.
 */

import Link from 'next/link';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JourneyStep } from '@/hooks/use-user-journey';

interface JourneyProgressProps {
  steps: JourneyStep[];
  completionPercentage: number;
}

export function JourneyProgress({ steps, completionPercentage }: JourneyProgressProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      {/* Progress bar */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-white/80">
          Votre progression
        </span>
        <span className="text-sm font-semibold text-[#00D4FF]">
          {completionPercentage} %
        </span>
      </div>
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#00D4FF] to-[#7B61FF] transition-all duration-700 ease-out"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Steps — vertical on mobile, horizontal on lg+ */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-0">
        {steps.map((step, i) => (
          <div key={step.id} className="relative flex items-start gap-3 lg:flex-1 lg:flex-col lg:items-center lg:text-center">
            {/* Connector line between dots (horizontal, lg only) */}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'hidden lg:block absolute top-3 left-[calc(50%+12px)] right-0 h-0.5 -translate-y-0.5',
                  step.completed ? 'bg-emerald-400/40' : 'bg-white/10',
                )}
                aria-hidden
              />
            )}

            {/* Icon */}
            <div className="flex-shrink-0">
              {step.completed ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" aria-hidden />
              ) : step.current ? (
                <div className="relative">
                  <Circle className="h-6 w-6 text-[#00D4FF]" aria-hidden />
                  <span className="absolute inset-0 animate-ping rounded-full bg-[#00D4FF]/30" />
                </div>
              ) : (
                <Circle className="h-6 w-6 text-white/20" aria-hidden />
              )}
            </div>

            {/* Label + action */}
            <div className="min-w-0 flex-1 lg:flex-none">
              {step.current ? (
                <Link
                  href={step.href}
                  className="group flex items-center gap-1 text-sm font-medium text-[#00D4FF] hover:underline"
                >
                  {step.label}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              ) : (
                <span
                  className={cn(
                    'text-sm',
                    step.completed
                      ? 'text-white/60 line-through decoration-white/20'
                      : 'text-white/30',
                  )}
                >
                  {step.label}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
