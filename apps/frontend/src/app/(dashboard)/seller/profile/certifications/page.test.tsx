// FP-2.1 — Tests page /seller/profile/certifications.
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

const getMineMock = vi.fn();
vi.mock('@/lib/seller-profiles', async () => {
  const actual = await vi.importActual<typeof import('@/lib/seller-profiles')>(
    '@/lib/seller-profiles',
  );
  return {
    ...actual,
    sellerProfilesApi: {
      ...actual.sellerProfilesApi,
      getMine: (...args: unknown[]) => getMineMock(...args),
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

import SellerProfileCertificationsPage from './page';

describe('SellerProfileCertificationsPage (FP-2.1)', () => {
  beforeEach(() => {
    getMineMock.mockReset();
    listMock.mockReset();
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });
  });
  afterEach(() => vi.clearAllMocks());

  it('rend le banner d’avertissement et le manager quand le profil est résolu', async () => {
    getMineMock.mockResolvedValue({
      id: 'sp-1',
      slug: 'mon-vendeur',
      status: 'APPROVED',
      publicDisplayName: 'Mon Vendeur',
      country: 'YT',
      region: null,
      cityOrZone: null,
      descriptionShort: null,
      descriptionLong: null,
      story: null,
      languages: null,
      salesEmail: null,
      salesPhone: null,
      website: null,
      supportedIncoterms: null,
      destinationsServed: null,
      averageLeadTimeDays: null,
      logoMediaId: null,
      bannerMediaId: null,
      rejectionReason: null,
    });
    render(<SellerProfileCertificationsPage />);
    await waitFor(() => expect(screen.getByTestId('cert-review-warning')).toBeInTheDocument());
    expect(screen.getByTestId('seller-certifications-manager')).toBeInTheDocument();
    expect(screen.getByText(/Mon Vendeur/)).toBeInTheDocument();
  });

  it('affiche le hint 404 quand le seller n’a aucun profil', async () => {
    const { ApiError } = await import('@/lib/api');
    getMineMock.mockRejectedValue(
      new ApiError('NOT_FOUND', 'Aucun profil', undefined, 'rid', 404),
    );
    render(<SellerProfileCertificationsPage />);
    expect(await screen.findByText(/Aucun profil vendeur/)).toBeInTheDocument();
  });

  it('affiche le hint 409 quand le seller a plusieurs profils', async () => {
    const { ApiError } = await import('@/lib/api');
    getMineMock.mockRejectedValue(
      new ApiError('CONFLICT', 'Multiples profils', undefined, 'rid', 409),
    );
    render(<SellerProfileCertificationsPage />);
    expect(await screen.findByText(/plusieurs profils vendeurs/)).toBeInTheDocument();
  });
});
