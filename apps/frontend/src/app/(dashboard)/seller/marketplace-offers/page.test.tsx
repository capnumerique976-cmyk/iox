// MP-OFFER-VIEW (LOT 1 mandat 14) — Index seller marketplace-offers.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const listMineMock = vi.fn();
vi.mock('@/lib/marketplace-offers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace-offers')>(
    '@/lib/marketplace-offers',
  );
  return {
    ...actual,
    marketplaceOffersApi: {
      ...actual.marketplaceOffersApi,
      listMine: (...args: unknown[]) => listMineMock(...args),
    },
  };
});

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'tok' },
  };
});

import SellerMarketplaceOffersPage from './page';

describe('SellerMarketplaceOffersPage (MP-OFFER-VIEW)', () => {
  beforeEach(() => listMineMock.mockReset());
  afterEach(() => vi.clearAllMocks());

  it('rend la liste avec un lien Détails par ligne et bouton Nouvelle offre actif (LOT 2)', async () => {
    listMineMock.mockResolvedValue({
      data: [
        {
          id: 'o1',
          marketplaceProductId: 'mp1',
          sellerProfileId: 'sp1',
          title: 'Vanille Bourbon — offre principale',
          shortDescription: 'Gousses A',
          priceMode: 'FIXED',
          unitPrice: '420.00',
          currency: 'EUR',
          publicationStatus: 'PUBLISHED',
          exportReadinessStatus: 'EXPORT_READY',
          visibilityScope: 'PUBLIC',
          updatedAt: '2026-04-15T00:00:00Z',
          marketplaceProduct: {
            id: 'mp1',
            slug: 'vanille',
            commercialName: 'Vanille Bourbon',
            publicationStatus: 'PUBLISHED',
            sellerProfileId: 'sp1',
          },
        },
      ],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    render(<SellerMarketplaceOffersPage />);
    await waitFor(() => expect(screen.getByTestId('seller-offers-list')).toBeInTheDocument());
    expect(screen.getByText('Vanille Bourbon — offre principale')).toBeInTheDocument();
    const link = screen.getByTestId('seller-offer-detail-o1') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/seller/marketplace-offers/o1');
    // bouton Nouvelle offre actif dans LOT 2 (était désactivé en LOT 1)
    const newLink = screen.getByTestId('link-new-offer') as HTMLAnchorElement;
    expect(newLink.getAttribute('href')).toBe('/seller/marketplace-offers/new');
  });

  it('affiche un état vide quand aucune offre', async () => {
    listMineMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });
    render(<SellerMarketplaceOffersPage />);
    expect(await screen.findByText(/Aucune offre marketplace/i)).toBeInTheDocument();
  });
});
