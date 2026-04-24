'use client';

/**
 * IOX — Tableau Référentiel
 *
 * Landing page de la rubrique Référentiel. Aggrège les accès rapides aux
 * pages métier du référentiel (bénéficiaires, produits, entreprises, contrats
 * d'approvisionnement).
 */
import { SectionDashboard } from '@/components/layout/section-dashboard';
import { SECTIONS } from '@/components/layout/nav-config';

export default function ReferentielPage() {
  const section = SECTIONS.find((s) => s.id === 'referentiel');
  if (!section) return null;
  return <SectionDashboard section={section} />;
}
