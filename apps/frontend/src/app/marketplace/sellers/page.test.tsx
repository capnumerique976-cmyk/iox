// MP-S-INDEX — couverture page RSC /marketplace/sellers.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SellersResult, PublicSeller } from '@/lib/marketplace/types';

const fetchSellersMock = vi.fn();
vi.mock('@/lib/marketplace/api', () => ({
  fetchSellers: (...args: unknown[]) => fetchSellersMock(...args),
}));

// SellersFilters est un client component qui utilise next/navigation —
// on le stub pour rester hors-périmètre dans ce test page.
vi.mock('@/components/marketplace/SellersFilters', () => ({
  SellersFilters: () => <div data-testid="sellers-filters" />,
}));

import SellersPage from './page';

function makeSeller(over: Partial<PublicSeller> = {}): PublicSeller {
  return {
    id: 'sel_1',
    slug: 'coop-1',
    publicDisplayName: 'Coop 1',
    country: 'YT',
    region: null,
    cityOrZone: null,
    descriptionShort: null,
    logoMediaId: null,
    bannerMediaId: null,
    averageLeadTimeDays: null,
    destinationsServed: null,
    supportedIncoterms: null,
    isFeatured: false,
    publishedProductsCount: 0,
    ...over,
  };
}

function makeRes(data: PublicSeller[], total = data.length, totalPages = 1): SellersResult {
  return { data, meta: { total, page: 1, limit: 24, totalPages } };
}

describe('SellersPage (MP-S-INDEX)', () => {
  beforeEach(() => fetchSellersMock.mockReset());

  it('rend la grille avec les cartes et le total quand des vendeurs existent', async () => {
    fetchSellersMock.mockResolvedValueOnce(
      makeRes([makeSeller(), makeSeller({ id: 'sel_2', slug: 'coop-2', publicDisplayName: 'Coop 2' })], 2),
    );
    const ui = await SellersPage({ searchParams: {} });
    render(ui);
    expect(screen.getByTestId('sellers-grid')).toBeTruthy();
    expect(screen.getByTestId('seller-card-coop-1')).toBeTruthy();
    expect(screen.getByTestId('seller-card-coop-2')).toBeTruthy();
    expect(screen.getByText(/2 producteurs référencés/)).toBeTruthy();
  });

  it("affiche l'état vide quand aucun vendeur ne correspond aux filtres", async () => {
    fetchSellersMock.mockResolvedValueOnce(makeRes([], 0));
    const ui = await SellersPage({ searchParams: { q: 'introuvable' } });
    render(ui);
    expect(screen.getByTestId('sellers-empty')).toBeTruthy();
  });

  it("affiche un fallback d'erreur quand l'annuaire est indisponible", async () => {
    fetchSellersMock.mockRejectedValueOnce(new Error('boom'));
    const ui = await SellersPage({ searchParams: {} });
    render(ui);
    expect(screen.getByTestId('sellers-error')).toBeTruthy();
  });

  it('rend la pagination uniquement si totalPages > 1', async () => {
    fetchSellersMock.mockResolvedValueOnce(makeRes([makeSeller()], 30, 2));
    const ui = await SellersPage({ searchParams: {} });
    render(ui);
    // Au moins un lien de page existe quand totalPages>1.
    expect(screen.getByText(/Page/i)).toBeTruthy();
  });
});
