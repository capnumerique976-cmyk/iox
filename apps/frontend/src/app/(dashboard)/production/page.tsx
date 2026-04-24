'use client';

/**
 * IOX — Tableau Production
 *
 * Landing page de la rubrique Production. Aggrège les accès rapides à la
 * chaîne de production (entrants → transformation → lots finis → étiquetage
 * → traçabilité → mise en marché).
 */
import { SectionDashboard } from '@/components/layout/section-dashboard';
import { SECTIONS } from '@/components/layout/nav-config';

export default function ProductionPage() {
  const section = SECTIONS.find((s) => s.id === 'production');
  if (!section) return null;
  return <SectionDashboard section={section} />;
}
