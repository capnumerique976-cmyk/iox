// MP-EDIT-PRODUCT.1 — Couverture page détail/édition seller produit marketplace.
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
  useParams: () => ({ id: 'mp1' }),
  useRouter: () => ({ push: pushMock }),
}));

const confirmMock = vi.fn();
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => confirmMock,
}));

const getByIdMock = vi.fn();
const updateMock = vi.fn();
const submitWorkflowMock = vi.fn();
const archiveMock = vi.fn();
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
      submit: (...args: unknown[]) => submitWorkflowMock(...args),
      archive: (...args: unknown[]) => archiveMock(...args),
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
    submitWorkflowMock.mockReset();
    archiveMock.mockReset();
    pushMock.mockReset();
    confirmMock.mockReset();
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

  // ── FP-8 — Logistique structurée ──────────────────────────────────────

  it('FP-8 — hydrate les champs logistiques (CSV pour packagingFormats, kg pour grossWeight/netWeight)', async () => {
    getByIdMock.mockResolvedValue({
      ...baseProduct,
      packagingFormats: ['1kg', '5kg', 'carton 10kg'],
      temperatureRequirements: 'Cool 4-8°C',
      grossWeight: '1.05',
      netWeight: 1.0,
      palletization: '120 cartons / palette EUR-EPAL',
    });
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-packagingFormats')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('field-packagingFormats')).toHaveValue(
      '1kg, 5kg, carton 10kg',
    );
    expect(screen.getByTestId('field-temperatureRequirements')).toHaveValue('Cool 4-8°C');
    expect(screen.getByTestId('field-grossWeight')).toHaveValue(1.05);
    expect(screen.getByTestId('field-netWeight')).toHaveValue(1);
    expect(screen.getByTestId('field-palletization')).toHaveValue(
      '120 cartons / palette EUR-EPAL',
    );
  });

  it('FP-8 — PATCH diff envoie packagingFormats parsé + grossWeight numérique', async () => {
    getByIdMock.mockResolvedValue({
      ...baseProduct,
      packagingFormats: [],
    });
    updateMock.mockResolvedValue({
      ...baseProduct,
      packagingFormats: ['1kg', '5kg'],
      grossWeight: '1.2',
    });
    const user = userEvent.setup();
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-packagingFormats')).toBeInTheDocument(),
    );

    await user.type(screen.getByTestId('field-packagingFormats'), '1kg, 5kg, 1kg');
    await user.type(screen.getByTestId('field-grossWeight'), '1.2');
    await user.click(screen.getByTestId('submit-product'));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    const [, payload] = updateMock.mock.calls[0];
    // Dédoublonnage CSV : "1kg, 5kg, 1kg" → ["1kg", "5kg"]
    expect(payload.packagingFormats).toEqual(['1kg', '5kg']);
    expect(payload.grossWeight).toBe(1.2);
  });

  it('FP-8 — refuse > 12 formats de conditionnement (validation client)', async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct, packagingFormats: [] });
    const user = userEvent.setup();
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('field-packagingFormats')).toBeInTheDocument(),
    );
    const csv = Array.from({ length: 13 }, (_, i) => `f${i}`).join(', ');
    await user.type(screen.getByTestId('field-packagingFormats'), csv);
    await user.click(screen.getByTestId('submit-product'));
    expect(screen.getByTestId('validation-error')).toHaveTextContent(/12 formats/i);
    expect(updateMock).not.toHaveBeenCalled();
  });

  // ── MP-EDIT-PRODUCT.2 — workflow submit/archive ────────────────────────

  it('MP-EDIT-PRODUCT.2 — action Soumettre visible si DRAFT, masquée si IN_REVIEW', async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct, publicationStatus: 'DRAFT' as const });
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() => expect(screen.getByTestId('action-submit')).toBeInTheDocument());
    expect(screen.getByTestId('action-archive')).toBeInTheDocument();
  });

  it('MP-EDIT-PRODUCT.2 — action Soumettre masquée si IN_REVIEW', async () => {
    getByIdMock.mockResolvedValue({
      ...baseProduct,
      publicationStatus: 'IN_REVIEW' as const,
    });
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() => expect(screen.getByTestId('action-archive')).toBeInTheDocument());
    expect(screen.queryByTestId('action-submit')).toBeNull();
  });

  it('MP-EDIT-PRODUCT.2 — action Archiver masquée si déjà ARCHIVED', async () => {
    getByIdMock.mockResolvedValue({
      ...baseProduct,
      publicationStatus: 'ARCHIVED' as const,
    });
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() => expect(screen.getByTestId('status-badge')).toBeInTheDocument());
    expect(screen.queryByTestId('action-archive')).toBeNull();
    expect(screen.queryByTestId('action-submit')).toBeNull();
  });

  it('MP-EDIT-PRODUCT.2 — Soumettre appelle POST /:id/submit après confirmation', async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct, publicationStatus: 'DRAFT' as const });
    submitWorkflowMock.mockResolvedValue({
      ...baseProduct,
      publicationStatus: 'IN_REVIEW' as const,
    });
    confirmMock.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() => expect(screen.getByTestId('action-submit')).toBeInTheDocument());

    await user.click(screen.getByTestId('action-submit'));

    await waitFor(() => expect(submitWorkflowMock).toHaveBeenCalledTimes(1));
    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(confirmMock.mock.calls[0][0]).toMatchObject({ tone: 'warning' });
    const [idArg, token] = submitWorkflowMock.mock.calls[0];
    expect(idArg).toBe('mp1');
    expect(token).toBe('tok');
    await waitFor(() =>
      expect(screen.getByTestId('status-badge')).toHaveTextContent('IN_REVIEW'),
    );
    expect(screen.getByTestId('workflow-success')).toHaveTextContent(/soumis/i);
  });

  it("MP-EDIT-PRODUCT.2 — Soumettre n'appelle rien si confirm annulé", async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct, publicationStatus: 'DRAFT' as const });
    confirmMock.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() => expect(screen.getByTestId('action-submit')).toBeInTheDocument());

    await user.click(screen.getByTestId('action-submit'));

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(submitWorkflowMock).not.toHaveBeenCalled();
  });

  it('MP-EDIT-PRODUCT.2 — Archiver appelle POST /:id/archive (tone=danger) puis redirige', async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct });
    archiveMock.mockResolvedValue({
      ...baseProduct,
      publicationStatus: 'ARCHIVED' as const,
    });
    confirmMock.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() => expect(screen.getByTestId('action-archive')).toBeInTheDocument());

    await user.click(screen.getByTestId('action-archive'));

    await waitFor(() => expect(archiveMock).toHaveBeenCalledTimes(1));
    expect(confirmMock.mock.calls[0][0]).toMatchObject({ tone: 'danger' });
    expect(archiveMock.mock.calls[0]).toEqual(['mp1', 'tok']);
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith('/seller/marketplace-products'),
    );
  });

  it('MP-EDIT-PRODUCT.2 — relaie un 409 backend (transition interdite) dans workflow-error', async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct, publicationStatus: 'DRAFT' as const });
    const { ApiError } = await import('@/lib/api');
    submitWorkflowMock.mockRejectedValue(
      new ApiError('CONFLICT', 'Transition interdite', undefined, 'rid', 409),
    );
    confirmMock.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<SellerMarketplaceProductDetailPage />);
    await waitFor(() => expect(screen.getByTestId('action-submit')).toBeInTheDocument());

    await user.click(screen.getByTestId('action-submit'));

    expect(await screen.findByTestId('workflow-error')).toHaveTextContent(
      /transition interdite/i,
    );
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
