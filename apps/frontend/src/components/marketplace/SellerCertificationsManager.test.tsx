// FP-2.1 — Tests SellerCertificationsManager.
//
// On mocke `useConfirm` (sortie du ConfirmDialog L9-2) avec une fonction
// dont le retour est piloté par test : ça évite de monter le provider Radix
// + jsdom dialog overlay et garde ces tests focalisés sur la logique métier
// du manager.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CertificationType,
  MarketplaceRelatedEntityType,
  MarketplaceVerificationStatus,
} from '@iox/shared';

const listMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const removeMock = vi.fn();
vi.mock('@/lib/marketplace-certifications', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/marketplace-certifications')
  >('@/lib/marketplace-certifications');
  return {
    ...actual,
    marketplaceCertificationsApi: {
      list: (...args: unknown[]) => listMock(...args),
      create: (...args: unknown[]) => createMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
      remove: (...args: unknown[]) => removeMock(...args),
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

const confirmMock = vi.fn();
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => confirmMock,
}));

import { SellerCertificationsManager } from './SellerCertificationsManager';

const baseRow = {
  id: 'cert-1',
  relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
  relatedId: 'sp-1',
  type: CertificationType.BIO_EU,
  code: 'FR-BIO-01-2026-001',
  issuingBody: 'Ecocert',
  issuedAt: '2026-01-01T00:00:00Z',
  validFrom: '2026-01-01T00:00:00Z',
  validUntil: '2027-01-01T00:00:00Z',
  documentMediaId: null,
  verificationStatus: MarketplaceVerificationStatus.PENDING,
  rejectionReason: null,
  verifiedByUserId: null,
  verifiedAt: null,
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
};

function renderManager(props?: Partial<React.ComponentProps<typeof SellerCertificationsManager>>) {
  return render(
    <SellerCertificationsManager
      relatedType={MarketplaceRelatedEntityType.SELLER_PROFILE}
      relatedId="sp-1"
      {...props}
    />,
  );
}

describe('SellerCertificationsManager (FP-2.1)', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    removeMock.mockReset();
    confirmMock.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('rend l’état vide quand aucune certification', async () => {
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });
    renderManager();
    expect(await screen.findByTestId('cert-empty')).toBeInTheDocument();
  });

  it('rend la liste avec badges de statut et boutons Modifier/Supprimer', async () => {
    listMock.mockResolvedValue({
      data: [baseRow],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    renderManager();
    await waitFor(() => expect(screen.getByTestId('cert-list')).toBeInTheDocument());
    expect(screen.getByText('Bio EU')).toBeInTheDocument();
    expect(screen.getByText('Ecocert')).toBeInTheDocument();
    expect(screen.getByTestId('cert-edit-cert-1')).toBeInTheDocument();
    expect(screen.getByTestId('cert-delete-cert-1')).toBeInTheDocument();
  });

  it('ouvre le formulaire en création via le bouton Ajouter', async () => {
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });
    const user = userEvent.setup();
    renderManager();
    await screen.findByTestId('cert-empty');
    await user.click(screen.getByTestId('cert-add-btn'));
    expect(screen.getByTestId('cert-form')).toBeInTheDocument();
    expect(screen.getByTestId('cert-field-type')).toBeInTheDocument();
  });

  it('valide côté client : type OTHER sans code ni organisme', async () => {
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });
    const user = userEvent.setup();
    renderManager();
    await screen.findByTestId('cert-empty');
    await user.click(screen.getByTestId('cert-add-btn'));
    await user.selectOptions(screen.getByTestId('cert-field-type'), CertificationType.OTHER);
    await user.click(screen.getByTestId('cert-submit'));
    expect(await screen.findByTestId('cert-validation-error')).toHaveTextContent(/Autre/i);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('valide côté client : validFrom > validUntil', async () => {
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });
    const user = userEvent.setup();
    renderManager();
    await screen.findByTestId('cert-empty');
    await user.click(screen.getByTestId('cert-add-btn'));
    await user.type(screen.getByTestId('cert-field-validFrom'), '2027-12-01');
    await user.type(screen.getByTestId('cert-field-validUntil'), '2026-01-01');
    await user.click(screen.getByTestId('cert-submit'));
    expect(await screen.findByTestId('cert-validation-error')).toHaveTextContent(
      /antérieure ou égale/i,
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('soumet une création réussie et recharge la liste', async () => {
    listMock.mockResolvedValueOnce({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });
    listMock.mockResolvedValueOnce({
      data: [baseRow],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    createMock.mockResolvedValue(baseRow);
    const user = userEvent.setup();
    renderManager();
    await screen.findByTestId('cert-empty');
    await user.click(screen.getByTestId('cert-add-btn'));
    await user.type(screen.getByTestId('cert-field-issuingBody'), 'Ecocert');
    await user.type(screen.getByTestId('cert-field-code'), 'FR-BIO-01');
    await user.click(screen.getByTestId('cert-submit'));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    const payload = createMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
      relatedId: 'sp-1',
      type: CertificationType.BIO_EU,
      issuingBody: 'Ecocert',
      code: 'FR-BIO-01',
    });
    await waitFor(() => expect(screen.getByTestId('cert-list')).toBeInTheDocument());
  });

  it('mappe une erreur 4xx du serveur dans submit-error', async () => {
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });
    const { ApiError } = await import('@/lib/api');
    createMock.mockRejectedValue(new ApiError('BAD_REQUEST', 'Conflit unique', undefined, 'rid', 400));
    const user = userEvent.setup();
    renderManager();
    await screen.findByTestId('cert-empty');
    await user.click(screen.getByTestId('cert-add-btn'));
    await user.click(screen.getByTestId('cert-submit'));
    expect(await screen.findByTestId('cert-submit-error')).toHaveTextContent(/Conflit unique/);
  });

  it('annule la suppression si confirm renvoie false', async () => {
    listMock.mockResolvedValue({
      data: [baseRow],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    confirmMock.mockResolvedValue(false);
    const user = userEvent.setup();
    renderManager();
    await waitFor(() => expect(screen.getByTestId('cert-list')).toBeInTheDocument());
    await user.click(screen.getByTestId('cert-delete-cert-1'));
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('supprime quand confirm renvoie true et recharge', async () => {
    listMock.mockResolvedValueOnce({
      data: [baseRow],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    listMock.mockResolvedValueOnce({
      data: [],
      meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
    });
    confirmMock.mockResolvedValue(true);
    removeMock.mockResolvedValue({ id: 'cert-1', deleted: true });
    const user = userEvent.setup();
    renderManager();
    await waitFor(() => expect(screen.getByTestId('cert-list')).toBeInTheDocument());
    await user.click(screen.getByTestId('cert-delete-cert-1'));
    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('cert-1', 'tok'));
    await waitFor(() => expect(screen.getByTestId('cert-empty')).toBeInTheDocument());
  });
});
