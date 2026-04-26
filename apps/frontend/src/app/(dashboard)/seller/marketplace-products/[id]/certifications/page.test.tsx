// FP-2.1 — Tests page /seller/marketplace-products/[id]/certifications.
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
  useParams: () => ({ id: 'mp1' }),
}));

const getByIdMock = vi.fn();
vi.mock('@/lib/marketplace-products', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace-products')>(
    '@/lib/marketplace-products',
  );
  return {
    ...actual,
    marketplaceProductsApi: {
      ...actual.marketplaceProductsApi,
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

const listMock = vi.fn();
vi.mock('@/lib/marketplace-certifications', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/marketplace-certifications')
  >('@/lib/marketplace-certifications');
  return {
    ...actual,
    marketplaceCertificationsApi: {
      ...actual.marketplaceCertificationsApi,
      list: (...args: unknown[]) => listMock(...args),
    },
  };
});

vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(false),
}));

import SellerProductCertificationsPage from './page';

const baseProduct = {
  id: 'mp1',
  slug: 'vanille-mayotte',
  commercialName: 'Vanille de Mayotte',
  publicationStatus: 'APPROVED' as const,
  originCountry: 'YT',
  originRegion: 'Mayotte',
  harvestMonths: [],
  availabilityMonths: [],
  isYearRound: false,
  updatedAt: '2026-04-26T08:00:00Z',
};

describe('SellerProductCertificationsPage (FP-2.1)', () => {
  beforeEach(() => {
    getByIdMock.mockReset();
    listMock.mockReset();
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });
  });
  afterEach(() => vi.clearAllMocks());

  it('rend le banner d’avertissement et le manager quand le produit est résolu', async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct });
    render(<SellerProductCertificationsPage />);
    await waitFor(() => expect(screen.getByTestId('cert-review-warning')).toBeInTheDocument());
    expect(screen.getByTestId('seller-certifications-manager')).toBeInTheDocument();
    expect(screen.getByText(/Vanille de Mayotte/)).toBeInTheDocument();
  });

  it('affiche le hint 403 quand le produit n’appartient pas au seller', async () => {
    const { ApiError } = await import('@/lib/api');
    getByIdMock.mockRejectedValue(
      new ApiError('FORBIDDEN', 'Accès refusé', undefined, 'rid', 403),
    );
    render(<SellerProductCertificationsPage />);
    expect(
      await screen.findByText(/n’est pas rattaché à votre profil vendeur/),
    ).toBeInTheDocument();
  });

  it('affiche le hint 404 quand le produit est introuvable', async () => {
    const { ApiError } = await import('@/lib/api');
    getByIdMock.mockRejectedValue(
      new ApiError('NOT_FOUND', 'Produit introuvable', undefined, 'rid', 404),
    );
    render(<SellerProductCertificationsPage />);
    expect(await screen.findByText(/Produit introuvable ou supprimé/)).toBeInTheDocument();
  });
});
