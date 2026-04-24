'use client';

/**
 * IOX — Tableau Distribution
 *
 * Landing page de la rubrique Distribution. Aggrège distributions, incidents,
 * documents associés.
 */
import { SectionDashboard } from '@/components/layout/section-dashboard';
import { SECTIONS } from '@/components/layout/nav-config';

export default function DistributionPage() {
  const section = SECTIONS.find((s) => s.id === 'distribution');
  if (!section) return null;
  return <SectionDashboard section={section} />;
}
