'use client';

/**
 * GuidedDashboardHeader — journey-aware header for marketplace dashboards.
 *
 * Shows:
 *   - A welcome message with the user's first name
 *   - The JourneyProgress stepper
 *   - A NextActionCard pointing to the next step
 *
 * When journey is 100%, shows a congratulations message instead.
 */

import { useAuth } from '@/contexts/auth.context';
import { useUserJourney } from '@/hooks/use-user-journey';
import { JourneyProgress } from './journey-progress';
import { NextActionCard } from './next-action-card';
import { Skeleton } from '@/components/ui/skeleton';

/** Subtitles per step — plain language for farmers. */
const STEP_SUBTITLES: Record<string, string> = {
  profile: 'Les acheteurs pourront voir votre exploitation et vos spécialités.',
  documents: 'Ajoutez vos certifications pour rassurer les acheteurs.',
  products: 'Décrivez ce que vous vendez pour apparaître dans le catalogue.',
  publish: 'Soumettez vos produits pour les rendre visibles aux acheteurs.',
  rfq: 'Répondez aux demandes pour concrétiser vos premières ventes.',
  invoices: 'Suivez vos paiements et téléchargez vos factures.',
  browse: 'Découvrez les produits disponibles dans le catalogue.',
  orders: 'Consultez l\'état de vos commandes en cours.',
};

export function GuidedDashboardHeader() {
  const { user } = useAuth();
  const { journey, loading, error } = useUserJourney();

  if (!user) return null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !journey) return null;

  const isComplete = journey.completionPercentage === 100;
  const firstName = user.firstName || 'vous';

  return (
    <div className="space-y-4">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {isComplete
            ? `Bravo ${firstName} !`
            : `Bonjour ${firstName}`}
        </h1>
        <p className="mt-1 text-sm text-white/60">
          {isComplete
            ? 'Votre espace est complet. Gérez vos ventes depuis ce tableau de bord.'
            : 'Suivez les étapes ci-dessous pour démarrer vos ventes.'}
        </p>
      </div>

      {/* Progress stepper */}
      {!isComplete && (
        <JourneyProgress
          steps={journey.steps}
          completionPercentage={journey.completionPercentage}
        />
      )}

      {/* Next action CTA */}
      {journey.nextAction && (
        <NextActionCard
          label={journey.nextAction.label}
          href={journey.nextAction.href}
          subtitle={STEP_SUBTITLES[journey.steps.find((s) => s.current)?.id ?? ''] ?? undefined}
        />
      )}
    </div>
  );
}
