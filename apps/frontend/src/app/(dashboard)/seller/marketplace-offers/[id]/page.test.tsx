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

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'o1' }),
  useRouter: () => ({ push: pushMock }),
}));

// MP-OFFER-DUPLICATE — confirm dialog mock partagé entre les tests.
const confirmMock = vi.fn();
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => confirmMock,
}));

const getByIdMock = vi.fn();
const updateMock = vi.fn();
const submitMock = vi.fn();
const duplicateMock = vi.fn();
const listBatchesMock = vi.fn();
const attachBatchMock = vi.fn();
const updateBatchMock = vi.fn();
const detachBatchMock = vi.fn();
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
      duplicate: (...args: unknown[]) => duplicateMock(...args),
      listBatches: (...args: unknown[]) => listBatchesMock(...args),
      attachBatch: (...args: unknown[]) => attachBatchMock(...args),
      updateBatch: (...args: unknown[]) => updateBatchMock(...args),
      detachBatch: (...args: unknown[]) => detachBatchMock(...args),
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
    duplicateMock.mockReset();
    pushMock.mockReset();
    confirmMock.mockReset();
    listBatchesMock.mockReset();
    listBatchesMock.mockResolvedValue([]);
    attachBatchMock.mockReset();
    updateBatchMock.mockReset();
    detachBatchMock.mockReset();
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

  // ── MP-OFFER-DUPLICATE ──────────────────────────────────────────────

  it('MP-OFFER-DUPLICATE — bouton Dupliquer visible en mode lecture', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('btn-duplicate-offer')).toBeInTheDocument(),
    );
  });

  it('MP-OFFER-DUPLICATE — clic + confirm OK → API call → redirect vers nouvelle URL', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    confirmMock.mockResolvedValue(true);
    duplicateMock.mockResolvedValue({ id: 'copy-1' });
    render(<SellerMarketplaceOfferDetailPage />);
    const btn = await screen.findByTestId('btn-duplicate-offer');
    fireEvent.click(btn);
    await waitFor(() => expect(duplicateMock).toHaveBeenCalledTimes(1));
    expect(duplicateMock.mock.calls[0][0]).toBe('o1');
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith('/seller/marketplace-offers/copy-1'),
    );
  });

  it('MP-OFFER-DUPLICATE — confirm refusé → ni API ni redirect', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    confirmMock.mockResolvedValue(false);
    render(<SellerMarketplaceOfferDetailPage />);
    const btn = await screen.findByTestId('btn-duplicate-offer');
    fireEvent.click(btn);
    // Laisser éventuelles micro-tasks se résoudre.
    await new Promise((r) => setTimeout(r, 10));
    expect(duplicateMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('MP-OFFER-DUPLICATE — erreur API → submit-error affiché, pas de redirect', async () => {
    const { ApiError } = await import('@/lib/api');
    getByIdMock.mockResolvedValue(FULL_OFFER);
    confirmMock.mockResolvedValue(true);
    duplicateMock.mockRejectedValue(
      new ApiError('CONFLICT', 'Offre verrouillée', undefined, 'rid', 409),
    );
    render(<SellerMarketplaceOfferDetailPage />);
    const btn = await screen.findByTestId('btn-duplicate-offer');
    fireEvent.click(btn);
    expect(await screen.findByTestId('submit-error')).toHaveTextContent(/Offre verrouillée/i);
    expect(pushMock).not.toHaveBeenCalled();
  });
});

// MP-OFFER-EDIT-2 — visibilité + batches.
describe('SellerMarketplaceOfferDetailPage (MP-OFFER-EDIT-2)', () => {
  beforeEach(() => {
    getByIdMock.mockReset();
    updateMock.mockReset();
    listBatchesMock.mockReset();
    listBatchesMock.mockResolvedValue([]);
    attachBatchMock.mockReset();
    updateBatchMock.mockReset();
    detachBatchMock.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('édite visibilityScope et envoie via update()', async () => {
    getByIdMock.mockResolvedValue({ ...FULL_OFFER, publicationStatus: 'DRAFT' });
    updateMock.mockResolvedValue({ ...FULL_OFFER, publicationStatus: 'DRAFT', visibilityScope: 'PRIVATE' });
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() => expect(screen.getAllByText(/offre principale/)[0]).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('btn-edit-offer'));
    const select = await screen.findByTestId('field-visibilityScope');
    fireEvent.change(select, { target: { value: 'PRIVATE' } });
    fireEvent.click(screen.getByTestId('btn-save-offer'));
    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    expect(updateMock.mock.calls[0][1]).toEqual({ visibilityScope: 'PRIVATE' });
  });

  it("désactive l'option PRIVATE quand publicationStatus = PUBLISHED", async () => {
    getByIdMock.mockResolvedValue({ ...FULL_OFFER, publicationStatus: 'PUBLISHED' });
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() => expect(screen.getAllByText(/offre principale/)[0]).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('btn-edit-offer'));
    const select = await screen.findByTestId('field-visibilityScope') as HTMLSelectElement;
    const opts = Array.from(select.options);
    const priv = opts.find((o) => o.value === 'PRIVATE');
    expect(priv?.disabled).toBe(true);
  });

  it('section batches : empty state quand aucun lot', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    listBatchesMock.mockResolvedValue([]);
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() => expect(screen.getByTestId('offer-section-batches')).toBeInTheDocument());
    expect(await screen.findByText(/Aucun lot rattaché/)).toBeInTheDocument();
  });

  it('section batches : affiche un lot avec qté + export badge', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    listBatchesMock.mockResolvedValue([
      {
        id: 'l1',
        marketplaceOfferId: 'o1',
        productBatchId: 'b1',
        quantityAvailable: '50',
        quantityReserved: '0',
        exportEligible: true,
        notes: 'Lot premium',
        createdAt: '2026-04-20T00:00:00Z',
        updatedAt: '2026-04-20T00:00:00Z',
        productBatch: {
          id: 'b1',
          code: 'PB-2026-0001',
          quantity: '100',
          unit: 'kg',
          productionDate: '2026-03-01T00:00:00Z',
          expiryDate: null,
          status: 'CREATED',
        },
      },
    ]);
    render(<SellerMarketplaceOfferDetailPage />);
    expect(await screen.findByText('PB-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Lot premium')).toBeInTheDocument();
    expect(screen.getByTestId('batch-row-l1')).toBeInTheDocument();
  });

  it('section batches : rattacher un nouveau lot via le formulaire', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    listBatchesMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    attachBatchMock.mockResolvedValue({ id: 'l-new' });
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() => expect(screen.getAllByText(/offre principale/)[0]).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('btn-edit-offer'));
    fireEvent.click(await screen.findByTestId('btn-show-attach'));
    fireEvent.change(screen.getByTestId('field-attach-productBatchId'), {
      target: { value: 'b2-uuid' },
    });
    fireEvent.change(screen.getByTestId('field-attach-qty'), { target: { value: '25' } });
    fireEvent.click(screen.getByTestId('btn-attach-submit'));
    await waitFor(() => expect(attachBatchMock).toHaveBeenCalled());
    expect(attachBatchMock.mock.calls[0][1]).toMatchObject({
      productBatchId: 'b2-uuid',
      quantityAvailable: 25,
      exportEligible: true,
    });
  });

  it('section batches : détache après confirm', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    listBatchesMock.mockResolvedValueOnce([
      {
        id: 'l1',
        marketplaceOfferId: 'o1',
        productBatchId: 'b1',
        quantityAvailable: '50',
        quantityReserved: '0',
        exportEligible: true,
        notes: null,
        createdAt: '2026-04-20T00:00:00Z',
        updatedAt: '2026-04-20T00:00:00Z',
        productBatch: {
          id: 'b1',
          code: 'PB-2026-0001',
          quantity: '100',
          unit: 'kg',
          productionDate: '2026-03-01T00:00:00Z',
          expiryDate: null,
          status: 'CREATED',
        },
      },
    ]).mockResolvedValueOnce([]);
    detachBatchMock.mockResolvedValue({ ok: true });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() => expect(screen.getAllByText(/offre principale/)[0]).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('btn-edit-offer'));
    fireEvent.click(await screen.findByTestId('btn-detach-l1'));
    await waitFor(() => expect(detachBatchMock).toHaveBeenCalledWith('l1', 'tok'));
    confirmSpy.mockRestore();
  });
});

// MP-OFFER-EDIT-3 — édition inline batch (qty + notes).
describe('SellerMarketplaceOfferDetailPage — inline batch edit (MP-OFFER-EDIT-3)', () => {
  const sampleLink = {
    id: 'l1',
    marketplaceOfferId: 'o1',
    productBatchId: 'b1',
    quantityAvailable: '50',
    quantityReserved: '0',
    exportEligible: true,
    notes: 'Lot premium',
    createdAt: '2026-04-20T00:00:00Z',
    updatedAt: '2026-04-20T00:00:00Z',
    productBatch: {
      id: 'b1',
      code: 'PB-2026-0001',
      quantity: '100',
      unit: 'kg',
      productionDate: '2026-03-01T00:00:00Z',
      expiryDate: null,
      status: 'CREATED',
    },
  };

  beforeEach(() => {
    getByIdMock.mockReset();
    listBatchesMock.mockReset();
    updateBatchMock.mockReset();
    listBatchesMock.mockResolvedValueOnce([sampleLink]).mockResolvedValueOnce([
      { ...sampleLink, quantityAvailable: '75', notes: 'Mise à jour' },
    ]);
  });
  afterEach(() => vi.clearAllMocks());

  it('clic sur Modifier affiche les inputs qty + notes', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() => expect(screen.getAllByText(/offre principale/)[0]).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('btn-edit-offer'));
    fireEvent.click(await screen.findByTestId('btn-edit-l1'));
    expect(screen.getByTestId('field-edit-qty-l1')).toBeInTheDocument();
    expect(screen.getByTestId('field-edit-notes-l1')).toBeInTheDocument();
  });

  it('Enregistrer envoie quantityAvailable + notes via updateBatch', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    updateBatchMock.mockResolvedValue({ ...sampleLink, quantityAvailable: '75' });
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() => expect(screen.getAllByText(/offre principale/)[0]).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('btn-edit-offer'));
    fireEvent.click(await screen.findByTestId('btn-edit-l1'));
    fireEvent.change(screen.getByTestId('field-edit-qty-l1'), { target: { value: '75' } });
    fireEvent.change(screen.getByTestId('field-edit-notes-l1'), {
      target: { value: 'Mise à jour' },
    });
    fireEvent.click(screen.getByTestId('btn-save-edit-l1'));
    await waitFor(() => expect(updateBatchMock).toHaveBeenCalled());
    expect(updateBatchMock.mock.calls[0][1]).toMatchObject({
      quantityAvailable: 75,
      notes: 'Mise à jour',
    });
  });

  it('Annuler restaure le mode lecture sans appeler updateBatch', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() => expect(screen.getAllByText(/offre principale/)[0]).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('btn-edit-offer'));
    fireEvent.click(await screen.findByTestId('btn-edit-l1'));
    fireEvent.change(screen.getByTestId('field-edit-qty-l1'), { target: { value: '999' } });
    fireEvent.click(screen.getByTestId('btn-cancel-edit-l1'));
    expect(updateBatchMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('field-edit-qty-l1')).not.toBeInTheDocument();
  });

  it('quantité négative empêche le save', async () => {
    getByIdMock.mockResolvedValue(FULL_OFFER);
    render(<SellerMarketplaceOfferDetailPage />);
    await waitFor(() => expect(screen.getAllByText(/offre principale/)[0]).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('btn-edit-offer'));
    fireEvent.click(await screen.findByTestId('btn-edit-l1'));
    fireEvent.change(screen.getByTestId('field-edit-qty-l1'), { target: { value: '-5' } });
    fireEvent.click(screen.getByTestId('btn-save-edit-l1'));
    expect(updateBatchMock).not.toHaveBeenCalled();
  });
});
