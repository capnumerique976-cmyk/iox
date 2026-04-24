'use client';

/**
 * IOX — Tableau Marketplace
 *
 * Landing page de la rubrique Marketplace. Note : la route `/marketplace`
 * existe déjà côté public (boutique) — cette landing interne est exposée à
 * `/marketplace-hub` pour éviter le conflit Next.js.
 */
import { SectionDashboard } from '@/components/layout/section-dashboard';
import { SECTIONS } from '@/components/layout/nav-config';

export default function MarketplaceHubPage() {
  const section = SECTIONS.find((s) => s.id === 'marketplace');
  if (!section) return null;
  return <SectionDashboard section={section} />;
}
