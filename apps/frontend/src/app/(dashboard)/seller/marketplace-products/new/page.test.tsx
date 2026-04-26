// MP-EDIT-PRODUCT.2 — Tests de la page de création seller produit marketplace.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
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

const createMock = vi.fn();
vi.mock('@/lib/marketplace-products', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace-products')>(
    '@/lib/marketplace-products',
  );
  return {
    ...actual,
    marketplaceProductsApi: {
      ...actual.marketplaceProductsApi,
      create: (...args: unknown[]) => createMock(...args),
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

import SellerMarketplaceProductNewPage, { slugify } from './page';

const myProfile = {
  id: 'sp1',
  slug: 'demo-coop-vanille',
  status: 'APPROVED',
  publicDisplayName: 'Coopérative Vanille',
};

describe('slugify (MP-EDIT-PRODUCT.2)', () => {
  it('normalise les diacritiques et compacte les séparateurs', () => {
    expect(slugify('Vanille Bourbon — Mayotte')).toBe('vanille-bourbon-mayotte');
    expect(slugify('  Café    extra  ')).toBe('cafe-extra');
    expect(slugify('À/B!C')).toBe('a-b-c');
  });
});

describe('SellerMarketplaceProductNewPage (MP-EDIT-PRODUCT.2)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    getMineMock.mockReset();
    createMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('charge le profil seller et auto-génère le slug depuis le nom commercial', async () => {
    getMineMock.mockResolvedValue(myProfile);
    const user = userEvent.setup();
    render(<SellerMarketplaceProductNewPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-commercialName')).toBeInTheDocument(),
    );
    await user.type(screen.getByTestId('field-commercialName'), 'Vanille Bourbon');
    expect(screen.getByTestId('field-slug')).toHaveValue('vanille-bourbon');
  });

  it('refuse de soumettre si productId n’est pas un UUID', async () => {
    getMineMock.mockResolvedValue(myProfile);
    const user = userEvent.setup();
    render(<SellerMarketplaceProductNewPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-commercialName')).toBeInTheDocument(),
    );

    await user.type(screen.getByTestId('field-commercialName'), 'Vanille');
    await user.type(screen.getByTestId('field-originCountry'), 'YT');
    await user.type(screen.getByTestId('field-productId'), 'pas-un-uuid');
    await user.click(screen.getByTestId('submit-create'));

    expect(screen.getByTestId('validation-error')).toHaveTextContent(/UUID valide/i);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('soumet POST /marketplace/products avec sellerProfileId résolu et redirige', async () => {
    getMineMock.mockResolvedValue(myProfile);
    createMock.mockResolvedValue({ id: 'mp-new-id', slug: 'vanille' });
    const user = userEvent.setup();
    render(<SellerMarketplaceProductNewPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-commercialName')).toBeInTheDocument(),
    );

    await user.type(screen.getByTestId('field-commercialName'), 'Vanille');
    await user.type(screen.getByTestId('field-originCountry'), 'YT');
    await user.type(
      screen.getByTestId('field-productId'),
      '11111111-1111-4111-8111-111111111111',
    );
    await user.click(screen.getByTestId('submit-create'));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    const [payload, token] = createMock.mock.calls[0];
    expect(token).toBe('tok');
    expect(payload).toEqual({
      productId: '11111111-1111-4111-8111-111111111111',
      sellerProfileId: 'sp1',
      commercialName: 'Vanille',
      slug: 'vanille',
      originCountry: 'YT',
    });
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith('/seller/marketplace-products/mp-new-id'),
    );
  });

  it('relaie un 409 backend (slug déjà utilisé) dans submit-error', async () => {
    getMineMock.mockResolvedValue(myProfile);
    const { ApiError } = await import('@/lib/api');
    createMock.mockRejectedValue(
      new ApiError('CONFLICT', 'Ce slug marketplace est déjà utilisé', undefined, 'rid', 409),
    );
    const user = userEvent.setup();
    render(<SellerMarketplaceProductNewPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-commercialName')).toBeInTheDocument(),
    );

    await user.type(screen.getByTestId('field-commercialName'), 'Vanille');
    await user.type(screen.getByTestId('field-originCountry'), 'YT');
    await user.type(
      screen.getByTestId('field-productId'),
      '11111111-1111-4111-8111-111111111111',
    );
    await user.click(screen.getByTestId('submit-create'));

    expect(await screen.findByTestId('submit-error')).toHaveTextContent(/déjà utilisé/i);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('affiche un hint dédié si pas de profil vendeur (404)', async () => {
    const { ApiError } = await import('@/lib/api');
    getMineMock.mockRejectedValue(
      new ApiError('NOT_FOUND', 'Profil vendeur introuvable', undefined, 'rid', 404),
    );
    render(<SellerMarketplaceProductNewPage />);
    expect(await screen.findByTestId('no-profile-error')).toBeInTheDocument();
    expect(screen.queryByTestId('field-commercialName')).toBeNull();
  });
});
