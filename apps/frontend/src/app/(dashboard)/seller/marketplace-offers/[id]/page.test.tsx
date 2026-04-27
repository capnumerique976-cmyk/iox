// MP-OFFER-VIEW (LOT 1 mandat 14) — Détail seller marketplace-offer (lecture).
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

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'o1' }),
}));

const getByIdMock = vi.fn();
vi.mock('@/lib/marketplace-offers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace-offers')>(
    '@/lib/marketplace-offers',
  );
  return {
    ...actual,
    marketplaceOffersApi: {
      ...actual.marketplaceOffersApi,
      getById: (...args: unknown[]) => getByIdMock(...args),
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

import SellerMarketplaceOfferDetailPage from './page';

const FULL_OFFER = {
  id: 'o1',
  marketplaceProductId: 'mp1',
  sellerProfileId: 'sp1',
  title: 'Vanille Bourbon — offre principale',
  shortDescription: 'Gousses A 16-18cm',
  priceMode: 'FIXED' as const,
  unitPrice: '420.00',
  currency: 'EUR',
  moq: '1',
  availableQuantity: '120',
  availabilityStart: null,
  availabilityEnd: null,
  leadTimeDays: 14,
  incoterm: 'FOB',
  departureLocation: 'Mamoudzou',
  destinationMarketsJson: ['FR', 'BE', 'CH'],
  visibilityScope: 'PUBLIC' as const,
  publicationStatus: 'PUBLISHED' as const,
  exportReadinessStatus: 'EXPORT_READY' as const,
  featuredRank: null,
  rejectionReason: null,
  submittedAt: '2026-04-10T00:00:00Z',
  approvedAt: '2026-04-12T00:00:00Z',
  publishedAt: '2026-04-15T00:00:00Z',
  suspendedAt: null,
  updatedAt: '2026-04-15T00:00:00Z',
  marketplaceProduct: {
    id: 'mp1',
    slug: 'vanille',
    commercialName: 'Vanille Bourbon',
    publicationStatus: 'PUBLISHED' as const,
    sellerProfileId: 'sp1',
  },
  sellerProfile: {
    id: 'sp1',
    slug: 'demo-coop-vanille',
    publicDisplayName: 'Coop Vanille',
    status: 'APPROVED',
  },
};

describe('SellerMarketplaceOfferDetailPage (MP-OFFER-VIEW)', () => {
  beforeEach(() => getByIdMock.mockReset());
  afterEach(() => vi.clearAllMocks());

  it('hydrate les sections depuis getById', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('offer-section-identity')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('offer-section-identity')).toHaveTextContent(
      'Vanille Bourbon — offre principale',
    );
    expect(screen.getByTestId('offer-section-price')).toHaveTextContent('FIXED');
    expect(screen.getByTestId('offer-section-price')).toHaveTextContent('420 EUR');
  });

  it('affiche toutes les sections attendues', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('offer-section-identity')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('offer-section-product')).toBeInTheDocument();
    expect(screen.getByTestId('offer-section-price')).toBeInTheDocument();
    expect(screen.getByTestId('offer-section-availability')).toBeInTheDocument();
    expect(screen.getByTestId('offer-section-logistics')).toBeInTheDocument();
    expect(screen.getByTestId('offer-section-visibility')).toBeInTheDocument();
    expect(screen.getByTestId('offer-section-workflow')).toBeInTheDocument();
    // lien produit parent
    const productLink = screen.getByTestId('offer-link-product') as HTMLAnchorElement;
    expect(productLink.getAttribute('href')).toBe('/seller/marketplace-products/mp1');
  });

  it('rend le banner publicationStatus avec libellé FR', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('offer-status-banner')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('offer-status-banner')).toHaveTextContent(/PUBLI/i);
  });

  it('hint erreur générique — affiche le banner sur échec backend', async () => {
    // On rejette avec un objet non-Error (suffisant pour basculer la page en
    // état 'error'). Évite l'instance Error native qui remonte comme
    // unhandled rejection dans certains harnais vitest/jsdom.
    getByIdMock.mockResolvedValue(undefined as unknown as never);
    getByIdMock.mockImplementationOnce(() =>
      Promise.reject({ name: 'ApiError', message: 'Indisponible', status: 500 }),
    );
    render(<SellerMarketplaceOfferDetailPage />);
    expect(await screen.findByTestId('offer-error-banner')).toBeInTheDocument();
  });
});
