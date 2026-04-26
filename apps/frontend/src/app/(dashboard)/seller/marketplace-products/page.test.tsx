// FP-4 — Index seller marketplace-products.
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
vi.mock('@/lib/marketplace-products', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace-products')>(
    '@/lib/marketplace-products',
  );
  return {
    ...actual,
    marketplaceProductsApi: {
      ...actual.marketplaceProductsApi,
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

import SellerMarketplaceProductsPage from './page';

describe('SellerMarketplaceProductsPage (FP-4)', () => {
  beforeEach(() => listMineMock.mockReset());
  afterEach(() => vi.clearAllMocks());

  it('rend la liste avec un lien Saisonnalité par ligne', async () => {
    listMineMock.mockResolvedValue({
      data: [
        {
          id: 'mp1',
          slug: 'vanille-mayotte',
          commercialName: 'Vanille de Mayotte',
          publicationStatus: 'PUBLISHED',
          originCountry: 'YT',
          originRegion: 'Mayotte',
          harvestMonths: ['JUL'],
          availabilityMonths: ['SEP'],
          isYearRound: false,
          updatedAt: '2026-04-01T00:00:00Z',
        },
      ],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    render(<SellerMarketplaceProductsPage />);
    await waitFor(() => expect(screen.getByTestId('seller-mp-list')).toBeInTheDocument());
    expect(screen.getByText('Vanille de Mayotte')).toBeInTheDocument();
    const link = screen.getByTestId('seller-mp-seasonality-mp1') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/seller/marketplace-products/mp1/seasonality');
  });

  it('affiche un état vide quand aucune ligne', async () => {
    listMineMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });
    render(<SellerMarketplaceProductsPage />);
    expect(await screen.findByText(/Aucun produit marketplace/i)).toBeInTheDocument();
  });
});
