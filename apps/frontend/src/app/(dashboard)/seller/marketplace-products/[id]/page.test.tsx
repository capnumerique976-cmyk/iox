// MP-EDIT-PRODUCT.1 — Couverture page détail/édition seller produit marketplace.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'mp1' }),
}));

const getByIdMock = vi.fn();
const updateMock = vi.fn();
vi.mock('@/lib/marketplace-products', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace-products')>(
    '@/lib/marketplace-products',
  );
  return {
    ...actual,
    marketplaceProductsApi: {
      ...actual.marketplaceProductsApi,
      getById: (...args: unknown[]) => getByIdMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
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

import SellerMarketplaceProductDetailPage from './page';

const baseProduct = {
  id: 'mp1',
  slug: 'demo-vanille-bourbon-grade-a',
  commercialName: 'Vanille Bourbon Grade A',
  publicationStatus: 'DRAFT' as const,
  regulatoryName: null,
  subtitle: null,
  originCountry: 'YT',
  originRegion: 'Grande-Terre',
  originLocality: 'Combani',
  altitudeMeters: 350,
  gpsLat: '-12.8275',
  gpsLng: '45.166',
  varietySpecies: 'Vanilla planifolia',
  productionMethod: null,
  descriptionShort: 'Vanille Bourbon de Mayotte',
  descriptionLong: '',
  usageTips: '',
  packagingDescription: '',
  storageConditions: '',
  shelfLifeInfo: '',
  allergenInfo: '',
  harvestMonths: ['JUL', 'AUG'] as const,
  availabilityMonths: ['SEP', 'OCT'] as const,
  isYearRound: false,
  defaultUnit: 'kg',
  minimumOrderQuantity: 5,
  updatedAt: '2026-04-26T08:00:00Z',
};

describe('SellerMarketplaceProductDetailPage (MP-EDIT-PRODUCT.1)', () => {
  beforeEach(() => {
    getByIdMock.mockReset();
    updateMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hydrate les champs depuis GET /:id et garde Enregistrer désactivé tant que !dirty', async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct });
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-commercialName')).toHaveValue(
        'Vanille Bourbon Grade A',
      ),
    );
    expect(screen.getByTestId('field-originCountry')).toHaveValue('YT');
    expect(screen.getByTestId('field-originLocality')).toHaveValue('Combani');
    expect(screen.getByTestId('field-altitudeMeters')).toHaveValue(350);
    expect(screen.getByTestId('field-descriptionShort')).toHaveValue(
      'Vanille Bourbon de Mayotte',
    );
    const submit = screen.getByTestId('submit-product') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('DRAFT');
  });

  it('envoie un PATCH diff minimal — uniquement les champs modifiés', async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct });
    updateMock.mockResolvedValue({
      ...baseProduct,
      descriptionShort: 'Nouvelle description',
    });
    const user = userEvent.setup();
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-descriptionShort')).toBeInTheDocument(),
    );

    const ds = screen.getByTestId('field-descriptionShort');
    await user.clear(ds);
    await user.type(ds, 'Nouvelle description');

    const submit = screen.getByTestId('submit-product') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    await user.click(submit);

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const [idArg, payload, token] = updateMock.mock.calls[0];
    expect(idArg).toBe('mp1');
    expect(token).toBe('tok');
    expect(payload).toEqual({ descriptionShort: 'Nouvelle description' });
    expect(
      await screen.findByText(/Produit mis à jour avec succès/i),
    ).toBeInTheDocument();
  });

  it('refuse de soumettre si gpsLat sans gpsLng (validation client pair GPS)', async () => {
    getByIdMock.mockResolvedValue({
      ...baseProduct,
      gpsLat: null,
      gpsLng: null,
    });
    const user = userEvent.setup();
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() => expect(screen.getByTestId('field-gpsLat')).toBeInTheDocument());

    await user.type(screen.getByTestId('field-gpsLat'), '-12.8');
    await user.click(screen.getByTestId('submit-product'));

    expect(screen.getByTestId('validation-error')).toHaveTextContent(
      /Latitude et longitude GPS doivent être fournies ensemble/i,
    );
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("affiche le banner re-revue si statut PUBLISHED ET dirty", async () => {
    getByIdMock.mockResolvedValue({
      ...baseProduct,
      publicationStatus: 'PUBLISHED' as const,
    });
    const user = userEvent.setup();
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-commercialName')).toBeInTheDocument(),
    );
    // pas de banner avant modification
    expect(screen.queryByTestId('review-warning')).toBeNull();
    await user.type(screen.getByTestId('field-subtitle'), 'X');
    expect(screen.getByTestId('review-warning')).toBeInTheDocument();
    expect(screen.getByTestId('review-warning')).toHaveTextContent(/revue qualité/i);
  });

  it('ne montre PAS le banner re-revue si statut DRAFT (même dirty)', async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct, publicationStatus: 'DRAFT' as const });
    const user = userEvent.setup();
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-commercialName')).toBeInTheDocument(),
    );
    await user.type(screen.getByTestId('field-subtitle'), 'X');
    expect(screen.queryByTestId('review-warning')).toBeNull();
  });

  it('hint 404 — produit introuvable', async () => {
    const { ApiError } = await import('@/lib/api');
    getByIdMock.mockRejectedValue(
      new ApiError('NOT_FOUND', 'Produit introuvable', undefined, 'rid', 404),
    );
    render(<SellerMarketplaceProductDetailPage />);
    expect(await screen.findByText('Produit introuvable')).toBeInTheDocument();
    expect(screen.getByTestId('hint-404')).toBeInTheDocument();
  });

  it('hint 403 — produit hors périmètre seller', async () => {
    const { ApiError } = await import('@/lib/api');
    getByIdMock.mockRejectedValue(
      new ApiError('FORBIDDEN', 'Accès refusé', undefined, 'rid', 403),
    );
    render(<SellerMarketplaceProductDetailPage />);
    expect(await screen.findByText('Accès refusé')).toBeInTheDocument();
    expect(screen.getByTestId('hint-403')).toBeInTheDocument();
  });

  it('relaie l’erreur backend 400 (ex. cohérence GPS) dans submit-error', async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct });
    const { ApiError } = await import('@/lib/api');
    updateMock.mockRejectedValue(
      new ApiError(
        'BAD_REQUEST',
        'gpsLat et gpsLng doivent être fournis ensemble',
        undefined,
        'rid',
        400,
      ),
    );
    const user = userEvent.setup();
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-commercialName')).toBeInTheDocument(),
    );
    await user.type(screen.getByTestId('field-subtitle'), 'X');
    await user.click(screen.getByTestId('submit-product'));
    expect(await screen.findByTestId('submit-error')).toHaveTextContent(
      /gpsLat et gpsLng/i,
    );
  });
});
