// MP-OFFER-EDIT-1 (LOT 2) — Création seller offer.
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

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const createMock = vi.fn();
vi.mock('@/lib/marketplace-offers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace-offers')>(
    '@/lib/marketplace-offers',
  );
  return {
    ...actual,
    marketplaceOffersApi: {
      ...actual.marketplaceOffersApi,
      create: (...args: unknown[]) => createMock(...args),
    },
  };
});

const listMineProductsMock = vi.fn();
vi.mock('@/lib/marketplace-products', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace-products')>(
    '@/lib/marketplace-products',
  );
  return {
    ...actual,
    marketplaceProductsApi: {
      ...actual.marketplaceProductsApi,
      listMine: (...args: unknown[]) => listMineProductsMock(...args),
    },
  };
});

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

import SellerMarketplaceOfferNewPage from './page';

const PRODUCTS = [
  { id: 'mp1', commercialName: 'Vanille Bourbon', slug: 'vanille' },
  { id: 'mp2', commercialName: 'Thon Jaune', slug: 'thon' },
];

describe('SellerMarketplaceOfferNewPage (MP-OFFER-EDIT-1)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    createMock.mockReset();
    listMineProductsMock.mockReset();
    getMineMock.mockReset();
    getMineMock.mockResolvedValue({ id: 'sp1' });
    listMineProductsMock.mockResolvedValue({
      data: PRODUCTS,
      meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
    });
  });
  afterEach(() => vi.clearAllMocks());

  it('rend le formulaire avec les produits seller dans le select', async () => {
    render(<SellerMarketplaceOfferNewPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-marketplaceProductId')).toBeInTheDocument(),
    );
    const select = screen.getByTestId('field-marketplaceProductId') as HTMLSelectElement;
    // 1 placeholder + 2 produits
    expect(select.options.length).toBe(3);
    expect(select.options[1].value).toBe('mp1');
    expect(select.options[2].value).toBe('mp2');
  });

  it('refuse le submit avec un titre < 2 caractères et affiche validation-error', async () => {
    render(<SellerMarketplaceOfferNewPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-marketplaceProductId')).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByTestId('field-marketplaceProductId'), {
      target: { value: 'mp1' },
    });
    fireEvent.change(screen.getByTestId('field-title'), { target: { value: 'X' } });
    fireEvent.click(screen.getByTestId('submit-create-offer'));
    await waitFor(() => expect(screen.getByTestId('validation-error')).toBeInTheDocument());
    expect(createMock).not.toHaveBeenCalled();
  });

  it('submit OK → POST avec payload valide + redirect vers /[id]', async () => {
    createMock.mockResolvedValue({ id: 'newoffer1' });
    render(<SellerMarketplaceOfferNewPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-marketplaceProductId')).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByTestId('field-marketplaceProductId'), {
      target: { value: 'mp1' },
    });
    fireEvent.change(screen.getByTestId('field-title'), {
      target: { value: 'Mon offre vanille' },
    });
    fireEvent.change(screen.getByTestId('field-priceMode'), { target: { value: 'FIXED' } });
    fireEvent.change(screen.getByTestId('field-unitPrice'), { target: { value: '420' } });
    fireEvent.click(screen.getByTestId('submit-create-offer'));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    const [payload, token] = createMock.mock.calls[0];
    expect(payload).toMatchObject({
      marketplaceProductId: 'mp1',
      sellerProfileId: 'sp1',
      title: 'Mon offre vanille',
      priceMode: 'FIXED',
      unitPrice: 420,
      currency: 'EUR',
    });
    expect(token).toBe('tok');
    expect(pushMock).toHaveBeenCalledWith('/seller/marketplace-offers/newoffer1');
  });

  it('hint conflit — affiche submit-error si le backend retourne une erreur', async () => {
    const { ApiError } = await import('@/lib/api');
    createMock.mockRejectedValue(new ApiError('CONFLICT', 'Conflit', undefined, 'rid', 409));
    render(<SellerMarketplaceOfferNewPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-marketplaceProductId')).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByTestId('field-marketplaceProductId'), {
      target: { value: 'mp1' },
    });
    fireEvent.change(screen.getByTestId('field-title'), { target: { value: 'Offre A' } });
    fireEvent.click(screen.getByTestId('submit-create-offer'));
    expect(await screen.findByTestId('submit-error')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
