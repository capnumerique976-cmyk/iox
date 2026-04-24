import { test, expect, Page } from '@playwright/test';
import {
  ADMIN_USER,
  SELLER_USER,
  loginAsRole,
  mockAuthAs,
  warmupRoutes,
} from './helpers/marketplace';
import {
  DocumentsState,
  makeDocumentsState,
  makeSourceDocument,
  mockMarketplaceDocumentsRoutes,
  projectBuyerView,
  projectPublic,
} from './helpers/marketplace-documents';

test.describe.configure({ timeout: 180_000 });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await warmupRoutes(p, [
    '/login',
    '/dashboard',
    '/seller/documents',
    '/seller/documents/SELLER_PROFILE/seller-profile-1',
    '/admin/review-queue',
  ]);
  await ctx.close();
});

/**
 * Scénarios P12 — cycle de vie documentaire marketplace.
 *
 * Entités communes :
 *  - seller : MARKETPLACE_SELLER avec un SellerProfile `seller-profile-1`
 *  - admin  : ADMIN / QUALITY_MANAGER
 *  - 1 Document source attaché à SELLER_PROFILE / seller-profile-1
 *
 * La page dédiée ciblée : `/seller/documents/SELLER_PROFILE/seller-profile-1`
 * (route P11 pour `MarketplaceDocumentsPanel`).
 */
const RELATED_TYPE = 'SELLER_PROFILE' as const;
const RELATED_ID = 'seller-profile-1';
const SELLER_DOC_PATH = `/seller/documents/${RELATED_TYPE}/${RELATED_ID}`;

async function seedSellerProfile(state: DocumentsState) {
  // Document source disponible côté /documents?linkedEntityType=SELLER_PROFILE
  const source = makeSourceDocument({
    id: 'doc-src-1',
    name: 'Certificat Ecocert 2026',
    originalFilename: 'ecocert-2026.pdf',
    linkedEntityType: 'SELLER_PROFILE',
    linkedEntityId: RELATED_ID,
  });
  state.sources[source.id] = source;
  return source;
}

async function fillCreateForm(
  page: Page,
  opts: {
    visibility: 'PRIVATE' | 'BUYER_ON_REQUEST' | 'PUBLIC';
    title?: string;
    documentType?: string;
    validUntil?: string;
  },
) {
  await page.getByTestId('btn-create-marketplace-document').click();
  const form = page.getByTestId('md-create-form');
  await expect(form).toBeVisible();
  await form.locator('#md-source').selectOption({ index: 1 });
  if (opts.title !== undefined) {
    await form.locator('#md-title').fill(opts.title);
  } else {
    await form.locator('#md-title').fill('Certificat Ecocert 2026');
  }
  if (opts.documentType !== undefined) {
    await form.locator('#md-type').fill(opts.documentType);
  }
  await form.locator('#md-visibility').selectOption(opts.visibility);
  if (opts.validUntil) {
    await form.locator('#md-valid-until').fill(opts.validUntil);
  }
}

/* =====================================================================
 * 1. Seller crée un document PUBLIC → PENDING + item review
 * ===================================================================== */
test.describe('P12-A — Seller crée un document PUBLIC sur son profil', () => {
  test('le document apparaît en PENDING et un item de revue est enfilé', async ({ page }) => {
    const state = makeDocumentsState();
    await seedSellerProfile(state);
    await mockAuthAs(page, SELLER_USER);
    await mockMarketplaceDocumentsRoutes(page, state);

    await loginAsRole(page, SELLER_USER);
    await page.goto(SELLER_DOC_PATH, { timeout: 60_000 });

    // Panel vide au départ
    await expect(page.getByTestId('marketplace-documents-panel')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Aucun document marketplace attaché')).toBeVisible();

    // Création
    await fillCreateForm(page, { visibility: 'PUBLIC', title: 'Certificat Ecocert 2026' });
    const [createResp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/v1/marketplace/documents') && r.request().method() === 'POST',
      ),
      page.getByTestId('md-create-submit').click(),
    ]);
    expect(createResp.status()).toBe(201);

    // Ligne visible avec badges PUBLIC + PENDING
    const row = page.locator('[data-testid^="md-row-"]').first();
    await expect(row).toBeVisible();
    await expect(row.getByTestId('visibility-badge-PUBLIC')).toBeVisible();
    await expect(row.getByTestId('status-badge-PENDING')).toBeVisible();
    await expect(row.getByText(/En attente de revue/i)).toBeVisible();

    // State vérifié : 1 doc PENDING + 1 item queue PENDING
    const docs = Object.values(state.docs);
    expect(docs).toHaveLength(1);
    expect(docs[0].verificationStatus).toBe('PENDING');
    expect(docs[0].visibility).toBe('PUBLIC');
    expect(
      state.queue.filter((q) => q.reviewType === 'DOCUMENT' && q.status === 'PENDING'),
    ).toHaveLength(1);
    expect(state.createCalls).toHaveLength(1);
  });
});

/* =====================================================================
 * 2. Quality approuve → seller voit VERIFIED
 * ===================================================================== */
test.describe('P12-B — Admin approuve le document, seller voit VERIFIED', () => {
  test('approve via /admin/review-queue bascule le doc en VERIFIED et résout la queue', async ({
    page,
  }) => {
    const state = makeDocumentsState();
    await seedSellerProfile(state);
    await mockAuthAs(page, ADMIN_USER);
    await mockMarketplaceDocumentsRoutes(page, state);

    // Seed : un doc seller déjà PENDING + item queue
    const { makeMarketplaceDocument, enqueueDocumentReview } =
      await import('./helpers/marketplace-documents');
    const doc = makeMarketplaceDocument(state, {
      documentId: 'doc-src-1',
      relatedType: 'SELLER_PROFILE',
      relatedId: RELATED_ID,
      title: 'Certificat Ecocert 2026',
      visibility: 'PUBLIC',
      verificationStatus: 'PENDING',
    });
    enqueueDocumentReview(state, doc.id);

    await loginAsRole(page, ADMIN_USER);
    await page.goto('/admin/review-queue', { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: /File de revue marketplace/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/Documents 1/i)).toBeVisible();

    const row = page.locator('tbody tr').first();
    await expect(row).toContainText('DOCUMENT');

    const [verifyResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/v1/marketplace/documents/${doc.id}/verify`) &&
          r.request().method() === 'POST',
      ),
      row.getByRole('button', { name: /Approuver/i }).click(),
    ]);
    expect(verifyResp.status()).toBe(200);

    // Backend state convergé
    expect(state.docs[doc.id].verificationStatus).toBe('VERIFIED');
    expect(state.queue[0].status).toBe('APPROVED');
    expect(state.verifyCalls).toEqual([doc.id]);
    expect(state.rejectCalls).toHaveLength(0);

    // Queue PENDING vide
    await expect(page.getByText('Aucun item')).toBeVisible();

    // Vue seller : le panel affiche VERIFIED (on re-login seller)
    await mockAuthAs(page, SELLER_USER);
    await loginAsRole(page, SELLER_USER);
    await page.goto(SELLER_DOC_PATH, { timeout: 60_000 });
    const sellerRow = page.getByTestId(`md-row-${doc.id}`);
    await expect(sellerRow.getByTestId('status-badge-VERIFIED')).toBeVisible({ timeout: 30_000 });
    await expect(sellerRow.getByText(/En attente de revue/i)).toHaveCount(0);
  });
});

/* =====================================================================
 * 3. Admin rejette avec motif → seller voit le motif
 * ===================================================================== */
test.describe('P12-C — Admin rejette, seller voit le motif de rejet', () => {
  test('reject avec motif bascule REJECTED et affiche le motif côté seller', async ({ page }) => {
    const state = makeDocumentsState();
    await seedSellerProfile(state);
    await mockAuthAs(page, ADMIN_USER);
    await mockMarketplaceDocumentsRoutes(page, state);

    const { makeMarketplaceDocument, enqueueDocumentReview } =
      await import('./helpers/marketplace-documents');
    const doc = makeMarketplaceDocument(state, {
      documentId: 'doc-src-1',
      relatedType: 'SELLER_PROFILE',
      relatedId: RELATED_ID,
      title: 'Certificat Ecocert 2026',
      visibility: 'PUBLIC',
    });
    enqueueDocumentReview(state, doc.id);

    await loginAsRole(page, ADMIN_USER);
    await page.goto('/admin/review-queue', { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: /File de revue marketplace/i })).toBeVisible({
      timeout: 30_000,
    });

    const row = page.locator('tbody tr').first();
    await row.getByRole('button', { name: /Rejeter/i }).click();

    await page
      .getByPlaceholder(/Expliquer pourquoi/i)
      .fill('Certificat périmé, renvoyer la version 2026 signée');
    const [rejectResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/v1/marketplace/documents/${doc.id}/reject`) &&
          r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: /Confirmer le rejet/i }).click(),
    ]);
    expect(rejectResp.status()).toBe(200);

    expect(state.docs[doc.id].verificationStatus).toBe('REJECTED');
    expect(state.queue[0].status).toBe('REJECTED');
    expect(state.queue[0].reviewReason).toMatch(/Certificat périmé/);
    expect(state.rejectCalls).toHaveLength(1);

    // Côté seller : motif affiché
    await mockAuthAs(page, SELLER_USER);
    await loginAsRole(page, SELLER_USER);
    await page.goto(SELLER_DOC_PATH, { timeout: 60_000 });
    const sellerRow = page.getByTestId(`md-row-${doc.id}`);
    await expect(sellerRow.getByTestId('status-badge-REJECTED')).toBeVisible({ timeout: 30_000 });
    await expect(sellerRow.getByTestId(`reject-reason-${doc.id}`)).toContainText(
      /Certificat périmé/,
    );
  });
});

/* =====================================================================
 * 4. Seller modifie un VERIFIED → repasse PENDING + nouvel item queue
 * ===================================================================== */
test.describe('P12-D — Seller modifie un VERIFIED → re-queue', () => {
  test('changement de visibilité sur un VERIFIED rebascule PENDING et enfile un nouvel item', async ({
    page,
  }) => {
    const state = makeDocumentsState();
    await seedSellerProfile(state);
    await mockAuthAs(page, SELLER_USER);
    await mockMarketplaceDocumentsRoutes(page, state);

    const { makeMarketplaceDocument } = await import('./helpers/marketplace-documents');
    const doc = makeMarketplaceDocument(state, {
      documentId: 'doc-src-1',
      relatedType: 'SELLER_PROFILE',
      relatedId: RELATED_ID,
      title: 'Certificat Ecocert 2026',
      visibility: 'BUYER_ON_REQUEST',
      verificationStatus: 'VERIFIED',
    });

    await loginAsRole(page, SELLER_USER);
    await page.goto(SELLER_DOC_PATH, { timeout: 60_000 });
    const sellerRow = page.getByTestId(`md-row-${doc.id}`);
    await expect(sellerRow.getByTestId('status-badge-VERIFIED')).toBeVisible({ timeout: 30_000 });

    // Passe la visibilité BUYER_ON_REQUEST → PUBLIC
    await sellerRow.getByTestId(`md-edit-${doc.id}`).click();
    const form = page.getByTestId(`md-edit-form-${doc.id}`);
    await expect(form).toBeVisible();
    await form.locator(`#md-edit-visibility-${doc.id}`).selectOption('PUBLIC');

    const [patchResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().endsWith(`/api/v1/marketplace/documents/${doc.id}`) &&
          r.request().method() === 'PATCH',
      ),
      page.getByTestId(`md-edit-submit-${doc.id}`).click(),
    ]);
    expect(patchResp.status()).toBe(200);

    // Backend : doc redevient PENDING + 1 nouvel item queue PENDING
    expect(state.docs[doc.id].verificationStatus).toBe('PENDING');
    expect(state.docs[doc.id].visibility).toBe('PUBLIC');
    const pendingItems = state.queue.filter((q) => q.entityId === doc.id && q.status === 'PENDING');
    expect(pendingItems).toHaveLength(1);

    // UI seller mise à jour
    await expect(
      page.getByTestId(`md-row-${doc.id}`).getByTestId('status-badge-PENDING'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByTestId(`md-row-${doc.id}`).getByTestId('visibility-badge-PUBLIC'),
    ).toBeVisible();
  });
});

/* =====================================================================
 * 5. Seller détache → le marketplace-document disparaît, la source reste
 * ===================================================================== */
test.describe('P12-E — Seller détache un document', () => {
  test('delete supprime le marketplaceDocument, la source Document reste intacte', async ({
    page,
  }) => {
    const state = makeDocumentsState();
    const source = await seedSellerProfile(state);
    await mockAuthAs(page, SELLER_USER);
    await mockMarketplaceDocumentsRoutes(page, state);

    const { makeMarketplaceDocument, enqueueDocumentReview } =
      await import('./helpers/marketplace-documents');
    const doc = makeMarketplaceDocument(state, {
      documentId: source.id,
      relatedType: 'SELLER_PROFILE',
      relatedId: RELATED_ID,
      title: 'Certificat Ecocert 2026',
      visibility: 'PUBLIC',
    });
    enqueueDocumentReview(state, doc.id);

    await loginAsRole(page, SELLER_USER);
    await page.goto(SELLER_DOC_PATH, { timeout: 60_000 });
    await expect(page.getByTestId(`md-row-${doc.id}`)).toBeVisible({ timeout: 30_000 });

    // Accepte la confirm() native
    page.once('dialog', (d) => d.accept());

    const [delResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().endsWith(`/api/v1/marketplace/documents/${doc.id}`) &&
          r.request().method() === 'DELETE',
      ),
      page.getByTestId(`md-delete-${doc.id}`).click(),
    ]);
    expect(delResp.status()).toBe(200);

    // Marketplace document supprimé
    expect(state.docs[doc.id]).toBeUndefined();
    expect(state.deleteCalls).toEqual([doc.id]);

    // La source Document est toujours vivante
    expect(state.sources[source.id]).toBeDefined();
    expect(state.sources[source.id].deleted).toBe(false);

    // Queue résolue (plus de PENDING)
    expect(state.queue.filter((q) => q.entityId === doc.id && q.status === 'PENDING')).toHaveLength(
      0,
    );

    // Panel vide
    await expect(page.getByText('Aucun document marketplace attaché')).toBeVisible({
      timeout: 15_000,
    });
  });
});

/* =====================================================================
 * 6. Visibilité buyer / public — au niveau API (pages SSR non routables)
 * ===================================================================== */
test.describe('P12-F — Visibilité buyer / public', () => {
  test('projections publique et buyer respectent les règles métier', async () => {
    const state = makeDocumentsState();
    await seedSellerProfile(state);
    const { makeMarketplaceDocument } = await import('./helpers/marketplace-documents');

    // 1) PRIVATE VERIFIED — jamais
    const privateOk = makeMarketplaceDocument(state, {
      id: 'md-private',
      documentId: 'doc-src-1',
      visibility: 'PRIVATE',
      verificationStatus: 'VERIFIED',
    });
    // 2) BUYER_ON_REQUEST VERIFIED — buyer oui, public non
    const buyerOnReq = makeMarketplaceDocument(state, {
      id: 'md-buyer',
      documentId: 'doc-src-1',
      visibility: 'BUYER_ON_REQUEST',
      verificationStatus: 'VERIFIED',
    });
    // 3) PUBLIC mais PENDING — jamais (pas encore vérifié)
    const pubPending = makeMarketplaceDocument(state, {
      id: 'md-pub-pending',
      documentId: 'doc-src-1',
      visibility: 'PUBLIC',
      verificationStatus: 'PENDING',
    });
    // 4) PUBLIC VERIFIED mais expiré — jamais
    const pubExpired = makeMarketplaceDocument(state, {
      id: 'md-pub-expired',
      documentId: 'doc-src-1',
      visibility: 'PUBLIC',
      verificationStatus: 'VERIFIED',
      validUntil: new Date(Date.now() - 24 * 3600_000).toISOString(),
    });
    // 5) PUBLIC VERIFIED non expiré — visible partout
    const pubLive = makeMarketplaceDocument(state, {
      id: 'md-pub-live',
      documentId: 'doc-src-1',
      visibility: 'PUBLIC',
      verificationStatus: 'VERIFIED',
      validUntil: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
    });

    const publicList = projectPublic(state);
    const buyerList = projectBuyerView(state);

    // Public : uniquement le PUBLIC+VERIFIED+non expiré
    expect(publicList.map((d) => d.id).sort()).toEqual(['md-pub-live']);
    expect(publicList.some((d) => d.id === privateOk.id)).toBe(false);
    expect(publicList.some((d) => d.id === buyerOnReq.id)).toBe(false);
    expect(publicList.some((d) => d.id === pubPending.id)).toBe(false);
    expect(publicList.some((d) => d.id === pubExpired.id)).toBe(false);

    // Buyer : PUBLIC live + BUYER_ON_REQUEST VERIFIED non expiré
    expect(buyerList.map((d) => d.id).sort()).toEqual(['md-buyer', 'md-pub-live']);
    expect(buyerList.some((d) => d.id === privateOk.id)).toBe(false);
    expect(buyerList.some((d) => d.id === pubPending.id)).toBe(false);
    expect(buyerList.some((d) => d.id === pubExpired.id)).toBe(false);
  });
});
