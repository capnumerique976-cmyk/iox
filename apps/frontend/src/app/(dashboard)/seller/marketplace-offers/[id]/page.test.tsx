// MP-OFFER-VIEW (LOT 1) + MP-OFFER-EDIT-1 (LOT 2 mandat 14) — Détail seller.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

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
const updateMock = vi.fn();
const submitMock = vi.fn();
vi.mock('@/lib/marketplace-offers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace-offers')>(
    '@/lib/marketplace-offers',
  );
  return {
    ...actual,
    marketplaceOffersApi: {
      ...actual.marketplaceOffersApi,
      getById: (...args: unknown[]) => getByIdMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      submit: (...args: unknown[]) => submitMock(...args),
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
  beforeEach(() => {
    getByIdMock.mockReset();
    updateMock.mockReset();
    submitMock.mockReset();
  });
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

  // ─── MP-OFFER-EDIT-1 (LOT 2) ──────────────────────────────────────────

  it('édit — bouton Éditer affiche les inputs des champs sûrs', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('offer-section-identity')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('btn-edit-offer'));
    expect(screen.getByTestId('field-title')).toBeInTheDocument();
    expect(screen.getByTestId('field-priceMode')).toBeInTheDocument();
    expect(screen.getByTestId('field-incoterm')).toBeInTheDocument();
  });

  it('édit — Save désactivé tant que non dirty puis activé après modif', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('offer-section-identity')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('btn-edit-offer'));
    const saveBtn = screen.getByTestId('btn-save-offer') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('field-title'), {
      target: { value: 'Nouveau titre' },
    });
    expect((screen.getByTestId('btn-save-offer') as HTMLButtonElement).disabled).toBe(false);
  });

  it('édit — Save envoie un PATCH avec uniquement le diff', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    updateMock.mockResolvedValue({ ...FULL_OFFER, title: 'Nouveau titre' });
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('offer-section-identity')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('btn-edit-offer'));
    fireEvent.change(screen.getByTestId('field-title'), {
      target: { value: 'Nouveau titre' },
    });
    fireEvent.click(screen.getByTestId('btn-save-offer'));
    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const [id, payload] = updateMock.mock.calls[0];
    expect(id).toBe('o1');
    expect(payload).toEqual({ title: 'Nouveau titre' });
  });

  it('submit — bouton "Soumettre à validation" présent si DRAFT et appelle submit()', async () => {
    const draftOffer = { ...FULL_OFFER, publicationStatus: 'DRAFT' as const };
    getByIdMock.mockResolvedValue(draftOffer);
    submitMock.mockResolvedValue({ ...draftOffer, publicationStatus: 'IN_REVIEW' as const });
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('btn-submit-review')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('btn-submit-review'));
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));
    expect(submitMock.mock.calls[0][0]).toBe('o1');
  });

  it('édit — banner re-revue affiché si APPROVED + dirty', async () => {
    const approved = { ...FULL_OFFER, publicationStatus: 'APPROVED' as const };
    getByIdMock.mockResolvedValue(approved);
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('offer-section-identity')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('btn-edit-offer'));
    expect(screen.queryByTestId('review-warning')).toBeNull();
    fireEvent.change(screen.getByTestId('field-title'), {
      target: { value: 'Patché' },
    });
    expect(screen.getByTestId('review-warning')).toBeInTheDocument();
  });
});
