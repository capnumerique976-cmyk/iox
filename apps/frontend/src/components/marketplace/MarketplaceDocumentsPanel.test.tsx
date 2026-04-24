import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MarketplaceDocumentVisibility,
  MarketplaceRelatedEntityType,
  MarketplaceVerificationStatus,
  UserRole,
} from '@iox/shared';

// Mock auth context : on injecte un seller marketplace
vi.mock('@/contexts/auth.context', () => ({
  useAuth: () => ({
    user: { id: 'u-1', role: UserRole.MARKETPLACE_SELLER, email: 's@ex.com' },
  }),
}));

import { MarketplaceDocumentsPanel } from './MarketplaceDocumentsPanel';

const PRODUCT_ID = '11111111-1111-1111-1111-111111111111';

function docRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'md-1',
    relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
    relatedId: PRODUCT_ID,
    documentId: 'src-1',
    documentType: 'CERT_BIO',
    title: 'Certificat Ecocert',
    visibility: MarketplaceDocumentVisibility.PUBLIC,
    verificationStatus: MarketplaceVerificationStatus.VERIFIED,
    validFrom: null,
    validUntil: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    document: {
      id: 'src-1',
      name: 'Ecocert 2026',
      originalFilename: 'ecocert.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      storageKey: 'k',
      status: 'ACTIVE',
      expiresAt: null,
    },
    ...overrides,
  };
}

function envelope(data: unknown, meta: unknown = { total: 0, page: 1, limit: 50, totalPages: 1 }) {
  return new Response(
    JSON.stringify({ success: true, data: { data, meta }, timestamp: '2026-01-01' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
function envelopeRaw(data: unknown) {
  return new Response(JSON.stringify({ success: true, data, timestamp: '2026-01-01' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('MarketplaceDocumentsPanel', () => {
  beforeEach(() => {
    localStorage.setItem('iox_access_token', 'tok');
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('open', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('affiche les badges visibilité PUBLIC + statut VERIFIED', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    // list
    fetchMock.mockResolvedValueOnce(envelope([docRow()]));
    // review items
    fetchMock.mockResolvedValueOnce(envelope([]));

    render(
      <MarketplaceDocumentsPanel
        relatedType={MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT}
        relatedId={PRODUCT_ID}
        sourceEntityType="MARKETPLACE_PRODUCT"
      />,
    );

    expect(await screen.findByText('Certificat Ecocert')).toBeInTheDocument();
    expect(screen.getByTestId('visibility-badge-PUBLIC')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-VERIFIED')).toBeInTheDocument();
  });

  it('affiche le badge Expiré si validUntil est dans le passé', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(envelope([docRow({ validUntil: '2000-01-01T00:00:00Z' })]));
    fetchMock.mockResolvedValueOnce(envelope([]));

    render(
      <MarketplaceDocumentsPanel
        relatedType={MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT}
        relatedId={PRODUCT_ID}
        sourceEntityType="MARKETPLACE_PRODUCT"
      />,
    );

    expect(await screen.findByTestId('status-badge-EXPIRED')).toBeInTheDocument();
  });

  it('affiche le motif de rejet quand la queue a rejeté un document', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      envelope([
        docRow({
          verificationStatus: MarketplaceVerificationStatus.REJECTED,
        }),
      ]),
    );
    fetchMock.mockResolvedValueOnce(
      envelope([
        {
          id: 'rq-1',
          entityType: 'MARKETPLACE_PRODUCT',
          entityId: 'md-1',
          reviewType: 'DOCUMENT',
          status: 'REJECTED',
          reviewReason: 'Document illisible, page 2 manquante',
          reviewedByUserId: 'qm-1',
          createdAt: '',
          updatedAt: '',
        },
      ]),
    );

    render(
      <MarketplaceDocumentsPanel
        relatedType={MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT}
        relatedId={PRODUCT_ID}
        sourceEntityType="MARKETPLACE_PRODUCT"
      />,
    );

    expect(await screen.findByTestId('reject-reason-md-1')).toHaveTextContent(
      'Document illisible, page 2 manquante',
    );
  });

  it('indique « en attente de revue » quand le queue item est PENDING', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      envelope([
        docRow({
          verificationStatus: MarketplaceVerificationStatus.PENDING,
        }),
      ]),
    );
    fetchMock.mockResolvedValueOnce(
      envelope([
        {
          id: 'rq-1',
          entityType: 'MARKETPLACE_PRODUCT',
          entityId: 'md-1',
          reviewType: 'DOCUMENT',
          status: 'PENDING',
          reviewReason: null,
          reviewedByUserId: null,
          createdAt: '',
          updatedAt: '',
        },
      ]),
    );

    render(
      <MarketplaceDocumentsPanel
        relatedType={MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT}
        relatedId={PRODUCT_ID}
        sourceEntityType="MARKETPLACE_PRODUCT"
      />,
    );

    expect(await screen.findByText(/en attente de revue/i)).toBeInTheDocument();
  });

  it('POST /marketplace/documents quand on soumet le formulaire de création', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    // initial list
    fetchMock.mockResolvedValueOnce(envelope([]));
    // ouverture form → list sources
    fetchMock.mockResolvedValueOnce(
      envelope([
        {
          id: 'src-1',
          name: 'Ecocert 2026',
          originalFilename: 'e.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 10,
          createdAt: '',
        },
      ]),
    );
    // POST create
    fetchMock.mockResolvedValueOnce(envelopeRaw(docRow()));
    // refresh list
    fetchMock.mockResolvedValueOnce(envelope([docRow()]));
    fetchMock.mockResolvedValueOnce(envelope([]));

    render(
      <MarketplaceDocumentsPanel
        relatedType={MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT}
        relatedId={PRODUCT_ID}
        sourceEntityType="MARKETPLACE_PRODUCT"
      />,
    );

    await userEvent.click(await screen.findByTestId('btn-create-marketplace-document'));
    const form = await screen.findByTestId('md-create-form');
    const select = within(form).getByLabelText(/Document source/i);
    await waitFor(() =>
      expect(
        within(select as HTMLSelectElement).queryByRole('option', { name: /Ecocert 2026/ }),
      ).toBeInTheDocument(),
    );
    await userEvent.selectOptions(select, 'src-1');
    await userEvent.type(within(form).getByLabelText(/Titre/i), 'Ecocert');
    // DocumentType prérempli à CERT_BIO ; on soumet
    await userEvent.click(within(form).getByTestId('md-create-submit'));

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(
        (c) =>
          typeof c[0] === 'string' &&
          c[0] === '/api/v1/marketplace/documents' &&
          (c[1] as RequestInit | undefined)?.method === 'POST',
      );
      expect(createCall).toBeDefined();
      const body = JSON.parse((createCall![1] as RequestInit).body as string);
      expect(body).toMatchObject({
        relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
        relatedId: PRODUCT_ID,
        documentId: 'src-1',
        title: 'Ecocert',
        documentType: 'CERT_BIO',
        visibility: MarketplaceDocumentVisibility.PRIVATE,
      });
    });
  });

  it("PATCH la visibilité et les dates via le formulaire d'édition", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(envelope([docRow()]));
    fetchMock.mockResolvedValueOnce(envelope([]));
    // PATCH
    fetchMock.mockResolvedValueOnce(envelopeRaw(docRow()));
    // refresh
    fetchMock.mockResolvedValueOnce(envelope([docRow()]));
    fetchMock.mockResolvedValueOnce(envelope([]));

    render(
      <MarketplaceDocumentsPanel
        relatedType={MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT}
        relatedId={PRODUCT_ID}
        sourceEntityType="MARKETPLACE_PRODUCT"
      />,
    );

    await userEvent.click(await screen.findByTestId('md-edit-md-1'));
    const form = await screen.findByTestId('md-edit-form-md-1');
    await userEvent.selectOptions(
      within(form).getByLabelText(/Visibilité/i),
      MarketplaceDocumentVisibility.BUYER_ON_REQUEST,
    );
    await userEvent.type(within(form).getByLabelText(/Expire le/i), '2099-01-01');
    await userEvent.click(within(form).getByTestId('md-edit-submit-md-1'));

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        (c) =>
          typeof c[0] === 'string' &&
          c[0] === '/api/v1/marketplace/documents/md-1' &&
          (c[1] as RequestInit | undefined)?.method === 'PATCH',
      );
      expect(patch).toBeDefined();
      const body = JSON.parse((patch![1] as RequestInit).body as string);
      expect(body).toMatchObject({
        visibility: MarketplaceDocumentVisibility.BUYER_ON_REQUEST,
        validUntil: '2099-01-01',
      });
    });
  });

  it('DELETE /marketplace/documents/:id sur action "détacher" avec confirmation', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(envelope([docRow()]));
    fetchMock.mockResolvedValueOnce(envelope([]));
    fetchMock.mockResolvedValueOnce(envelopeRaw({ id: 'md-1', deleted: true }));
    fetchMock.mockResolvedValueOnce(envelope([]));

    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );

    render(
      <MarketplaceDocumentsPanel
        relatedType={MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT}
        relatedId={PRODUCT_ID}
        sourceEntityType="MARKETPLACE_PRODUCT"
      />,
    );

    await userEvent.click(await screen.findByTestId('md-delete-md-1'));

    await waitFor(() => {
      const del = fetchMock.mock.calls.find(
        (c) =>
          typeof c[0] === 'string' &&
          c[0] === '/api/v1/marketplace/documents/md-1' &&
          (c[1] as RequestInit | undefined)?.method === 'DELETE',
      );
      expect(del).toBeDefined();
    });
  });
});

// ─── Permissions côté UI ────────────────────────────────────────────────

describe('MarketplaceDocumentsPanel — permissions buyer', () => {
  beforeEach(() => {
    localStorage.setItem('iox_access_token', 'tok');
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    localStorage.clear();
  });

  it("ne propose PAS les actions d'édition/suppression à un buyer", async () => {
    vi.resetModules();
    vi.doMock('@/contexts/auth.context', () => ({
      useAuth: () => ({ user: { id: 'b-1', role: UserRole.MARKETPLACE_BUYER, email: 'b@ex.com' } }),
    }));
    const { MarketplaceDocumentsPanel: Panel } = await import('./MarketplaceDocumentsPanel');

    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(envelope([docRow()]));
    fetchMock.mockResolvedValueOnce(envelope([]));

    render(
      <Panel
        relatedType={MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT}
        relatedId={PRODUCT_ID}
        sourceEntityType="MARKETPLACE_PRODUCT"
      />,
    );

    await screen.findByText('Certificat Ecocert');
    expect(screen.queryByTestId('btn-create-marketplace-document')).not.toBeInTheDocument();
    expect(screen.queryByTestId('md-edit-md-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('md-delete-md-1')).not.toBeInTheDocument();
  });
});
