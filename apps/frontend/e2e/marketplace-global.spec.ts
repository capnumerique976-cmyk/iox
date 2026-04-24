import { test, expect, Page } from '@playwright/test';
import {
  ADMIN_USER,
  BUYER_USER,
  SELLER_USER,
  loginAsRole,
  makeRfqState,
  mockAuthAs,
  mockRfqRoutes,
  RfqState,
  warmupRoutes,
} from './helpers/marketplace';
import {
  DocumentsState,
  makeDocumentsState,
  makeMarketplaceDocument,
  makeSourceDocument,
  enqueueDocumentReview,
  mockMarketplaceDocumentsRoutes,
} from './helpers/marketplace-documents';
import { makeDefaultFixture, ssrMock } from './helpers/ssr-client';

/**
 * P13 — Grand E2E marketplace bout-à-bout.
 *
 *   Pipeline :
 *     A) Seller prépare produit + média + document PUBLIC  → états PENDING
 *     B) Admin approuve publication / média / document      → états APPROVED / VERIFIED
 *     C) Buyer/public charge la fiche publique SSR réelle   → voit exactement ce qui est validé
 *     D) Buyer clique le CTA "Demander un devis"           → crée une RFQ depuis l'offre
 *     E) Régression — aucun contenu non validé ne fuit publiquement
 *
 *   Harness :
 *     - `helpers/ssr-mock-server.mjs` : serveur HTTP qui mocke marketplace-catalog
 *       (lancé par playwright webServer ; BACKEND_INTERNAL_URL le pointe depuis Next).
 *     - `helpers/ssr-client.ts`        : peuplage + mutations via contrôle plan.
 *     - page.route()                    : flux dashboard (seller, admin, buyer RFQ).
 */

test.describe.configure({ timeout: 180_000 });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await warmupRoutes(p, [
    '/login',
    '/dashboard',
    '/admin/review-queue',
    '/seller/documents/MARKETPLACE_PRODUCT/mp-prod-1',
    '/marketplace',
    '/marketplace/products/huile-ylang-ylang-bio',
    '/quote-requests/new?offerId=offer-ylang-1',
  ]);
  await ctx.close();
});

test.beforeEach(async () => {
  await ssrMock.reset();
});

/* =====================================================================
 * P13-A — Seller prépare sa publication (doc PUBLIC + média)
 * ===================================================================== */
test.describe('P13-A — Seller publishes product bundle', () => {
  test('seller attache un document PUBLIC → statut PENDING + item review enfilé', async ({
    page,
  }) => {
    const { seller, product, offer } = makeDefaultFixture();
    // Seed SSR état initial : offre non publiée, média PENDING → public page 404
    await ssrMock.seed({
      sellers: [seller],
      products: [product],
      offers: [{ ...offer, isPublished: false }],
      medias: [
        {
          id: 'media-main-1',
          relatedType: 'MARKETPLACE_PRODUCT',
          relatedId: product.id,
          role: 'MAIN',
          mimeType: 'image/jpeg',
          altTextFr: 'Flacon Ylang-Ylang',
          moderationStatus: 'PENDING',
        },
      ],
    });

    // Dashboard : seller attache un doc marketplace au produit
    const docState = makeDocumentsState();
    const source = makeSourceDocument({
      id: 'doc-src-1',
      name: 'Certificat Ecocert 2026',
      linkedEntityType: 'MARKETPLACE_PRODUCT',
      linkedEntityId: product.id,
    });
    docState.sources[source.id] = source;

    await mockAuthAs(page, SELLER_USER);
    await mockMarketplaceDocumentsRoutes(page, docState);

    await loginAsRole(page, SELLER_USER);
    await page.goto(`/seller/documents/MARKETPLACE_PRODUCT/${product.id}`, { timeout: 60_000 });
    await expect(page.getByTestId('marketplace-documents-panel')).toBeVisible({ timeout: 30_000 });

    // Crée un doc PUBLIC
    await page.getByTestId('btn-create-marketplace-document').click();
    const form = page.getByTestId('md-create-form');
    await form.locator('#md-source').selectOption({ index: 1 });
    await form.locator('#md-title').fill('Certificat Ecocert 2026');
    await form.locator('#md-visibility').selectOption('PUBLIC');
    await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith('/api/v1/marketplace/documents') && r.request().method() === 'POST',
      ),
      page.getByTestId('md-create-submit').click(),
    ]);

    // Dashboard : doc PENDING visible + queue item enfilé
    const row = page.locator('[data-testid^="md-row-"]').first();
    await expect(row.getByTestId('status-badge-PENDING')).toBeVisible();
    await expect(row.getByTestId('visibility-badge-PUBLIC')).toBeVisible();
    expect(
      docState.queue.filter((q) => q.reviewType === 'DOCUMENT' && q.status === 'PENDING'),
    ).toHaveLength(1);

    // Public page : offre non publiée + média non approuvé → 404
    const pubResp = await page.request.get('/marketplace/products/huile-ylang-ylang-bio');
    expect(pubResp.status()).toBe(404);
  });
});

/* =====================================================================
 * P13-B — Admin approuve le média + le document marketplace
 * ===================================================================== */
test.describe('P13-B — Admin approves bundle', () => {
  test('verify DOCUMENT + approve MEDIA depuis /admin/review-queue, états convergés', async ({
    page,
  }) => {
    const { seller, product, offer } = makeDefaultFixture();

    // Dashboard : seed queue avec 1 item DOCUMENT PENDING
    const docState = makeDocumentsState();
    const source = makeSourceDocument({
      id: 'doc-src-1',
      linkedEntityType: 'MARKETPLACE_PRODUCT',
      linkedEntityId: product.id,
    });
    docState.sources[source.id] = source;
    const mdoc = makeMarketplaceDocument(docState, {
      id: 'md-1',
      documentId: source.id,
      relatedType: 'MARKETPLACE_PRODUCT',
      relatedId: product.id,
      title: 'Certificat Ecocert 2026',
      visibility: 'PUBLIC',
      verificationStatus: 'PENDING',
    });
    enqueueDocumentReview(docState, mdoc.id);

    // SSR seed : même doc PENDING → toujours invisible en public
    await ssrMock.seed({
      sellers: [seller],
      products: [product],
      offers: [
        {
          ...offer,
          isPublished: true,
          publishedAt: new Date(Date.now() - 60_000).toISOString(),
          status: 'ACTIVE',
        },
      ],
      medias: [
        {
          id: 'media-main-1',
          relatedType: 'MARKETPLACE_PRODUCT',
          relatedId: product.id,
          role: 'MAIN',
          mimeType: 'image/jpeg',
          altTextFr: 'Flacon Ylang-Ylang',
          moderationStatus: 'PENDING',
        },
      ],
      marketplaceDocuments: [
        {
          ...mdoc,
        },
      ],
    });

    // Avant approbation → public page charge mais sans image ni doc
    const beforeHtml = await (
      await page.request.get('/marketplace/products/huile-ylang-ylang-bio')
    ).text();
    expect(beforeHtml).toContain(product.commercialName);
    expect(beforeHtml).not.toContain('Certificat Ecocert 2026');
    expect(beforeHtml).toContain('Pas d&#x27;image'); // Primary image absente

    // Admin se connecte et approuve le DOCUMENT depuis la review-queue
    await mockAuthAs(page, ADMIN_USER);
    await mockMarketplaceDocumentsRoutes(page, docState);

    await loginAsRole(page, ADMIN_USER);
    await page.goto('/admin/review-queue', { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: /File de revue marketplace/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/Documents 1/i)).toBeVisible();

    const row = page.locator('tbody tr').first();
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/v1/marketplace/documents/${mdoc.id}/verify`) &&
          r.request().method() === 'POST',
      ),
      row.getByRole('button', { name: /Approuver/i }).click(),
    ]);

    // Convergence dashboard
    expect(docState.docs[mdoc.id].verificationStatus).toBe('VERIFIED');
    expect(docState.queue[0].status).toBe('APPROVED');

    // Sync SSR : approve média + verify doc (simule l'effet backend)
    await ssrMock.approveMedia('media-main-1');
    await ssrMock.verifyDocument(mdoc.id);

    // Après approbation → public page expose image + document
    const afterHtml = await (
      await page.request.get('/marketplace/products/huile-ylang-ylang-bio')
    ).text();
    expect(afterHtml).toContain('Certificat Ecocert 2026');
    expect(afterHtml).toContain('/__e2e_stub_media__/media-main-1');
    expect(afterHtml).not.toContain('Pas d&#x27;image');
  });
});

/* =====================================================================
 * P13-C — Buyer/public voit exactement ce qui est approuvé (SSR réel)
 * ===================================================================== */
test.describe('P13-C — Public SSR rendering respects approval gates', () => {
  test('la page publique rend uniquement image approuvée + doc public vérifié', async ({
    page,
  }) => {
    const { seller, product, offer } = makeDefaultFixture();
    await ssrMock.seed({
      sellers: [seller],
      products: [product],
      offers: [
        { ...offer, isPublished: true, publishedAt: new Date().toISOString(), status: 'ACTIVE' },
      ],
      medias: [
        // APPROVED → visible
        {
          id: 'media-ok',
          relatedType: 'MARKETPLACE_PRODUCT',
          relatedId: product.id,
          role: 'MAIN',
          mimeType: 'image/jpeg',
          altTextFr: 'Flacon Ylang-Ylang (approuvé)',
          moderationStatus: 'APPROVED',
        },
        // PENDING → masqué
        {
          id: 'media-pending',
          relatedType: 'MARKETPLACE_PRODUCT',
          relatedId: product.id,
          role: 'GALLERY',
          altTextFr: 'Galerie (en attente)',
          moderationStatus: 'PENDING',
        },
        // REJECTED → masqué
        {
          id: 'media-rejected',
          relatedType: 'MARKETPLACE_PRODUCT',
          relatedId: product.id,
          role: 'GALLERY',
          altTextFr: 'Galerie (rejetée)',
          moderationStatus: 'REJECTED',
        },
      ],
      marketplaceDocuments: [
        // PUBLIC + VERIFIED + non expiré → visible
        makeMarketplaceDocumentShape({
          id: 'md-ok',
          productId: product.id,
          title: 'Certificat Ecocert 2026',
          visibility: 'PUBLIC',
          verificationStatus: 'VERIFIED',
          validUntil: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        }),
        // PRIVATE → jamais
        makeMarketplaceDocumentShape({
          id: 'md-private',
          productId: product.id,
          title: 'Fiche interne confidentielle',
          visibility: 'PRIVATE',
          verificationStatus: 'VERIFIED',
        }),
        // BUYER_ON_REQUEST → jamais côté public
        makeMarketplaceDocumentShape({
          id: 'md-buyer',
          productId: product.id,
          title: 'Analyse microbio (sur demande)',
          visibility: 'BUYER_ON_REQUEST',
          verificationStatus: 'VERIFIED',
        }),
        // PUBLIC mais PENDING → jamais
        makeMarketplaceDocumentShape({
          id: 'md-pub-pending',
          productId: product.id,
          title: 'Attestation en attente',
          visibility: 'PUBLIC',
          verificationStatus: 'PENDING',
        }),
        // PUBLIC VERIFIED mais expiré → jamais
        makeMarketplaceDocumentShape({
          id: 'md-pub-expired',
          productId: product.id,
          title: 'Certificat expiré 2023',
          visibility: 'PUBLIC',
          verificationStatus: 'VERIFIED',
          validUntil: new Date(Date.now() - 86_400_000).toISOString(),
        }),
      ],
    });

    await page.goto('/marketplace/products/huile-ylang-ylang-bio', { timeout: 60_000 });

    // Produit rendu
    await expect(page.getByRole('heading', { name: product.commercialName })).toBeVisible({
      timeout: 30_000,
    });

    // Image principale approuvée
    await expect(page.getByAltText('Flacon Ylang-Ylang (approuvé)')).toBeVisible();

    // Documents : uniquement le certificat approuvé
    await expect(page.getByText('Documents publics')).toBeVisible();
    await expect(page.getByText('Certificat Ecocert 2026')).toBeVisible();
    await expect(page.getByText('Fiche interne confidentielle')).toHaveCount(0);
    await expect(page.getByText('Analyse microbio (sur demande)')).toHaveCount(0);
    await expect(page.getByText('Attestation en attente')).toHaveCount(0);
    await expect(page.getByText('Certificat expiré 2023')).toHaveCount(0);

    // Médias rejetés / pending absents du DOM
    await expect(page.getByAltText('Galerie (en attente)')).toHaveCount(0);
    await expect(page.getByAltText('Galerie (rejetée)')).toHaveCount(0);

    // CTA devis présent et pointé sur l'offerId
    const cta = page.getByRole('link', { name: /Demander un devis/i });
    await expect(cta).toBeVisible();
    // CTA non-authentifié pointe vers /login?redirect=<encodé> — on vérifie
    // que l'URL de redirection contient bien l'offerId pour que le flux RFQ
    // puisse reprendre après login.
    await expect(cta).toHaveAttribute(
      'href',
      new RegExp(`/login\\?redirect=.*offerId%3D${offer.id}`),
    );
  });

  test('le catalogue liste uniquement les produits publiables', async ({ page }) => {
    const { seller, product, offer } = makeDefaultFixture();
    // 2e produit dont l'offre n'est pas publiée
    const hiddenProduct = {
      ...product,
      id: 'mp-prod-2',
      slug: 'clous-girofle',
      commercialName: 'Clous de girofle bio',
    };
    await ssrMock.seed({
      sellers: [seller],
      products: [product, hiddenProduct],
      offers: [
        { ...offer, isPublished: true, publishedAt: new Date().toISOString(), status: 'ACTIVE' },
        {
          ...offer,
          id: 'offer-girofle',
          productId: hiddenProduct.id,
          title: 'Clous de girofle lot 2026',
          isPublished: false,
          status: 'DRAFT',
        },
      ],
    });

    await page.goto('/marketplace', { timeout: 60_000 });
    await expect(page.getByText(product.commercialName)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Clous de girofle bio')).toHaveCount(0);
  });
});

/* =====================================================================
 * P13-D — Buyer crée une RFQ depuis la fiche publique (flux complet)
 * ===================================================================== */
test.describe('P13-D — Buyer creates RFQ from public product page', () => {
  test('CTA public → login → /quote-requests/new?offerId → RFQ créée, seller dialog, note interne filtrée', async ({
    page,
  }) => {
    const { seller, product, offer } = makeDefaultFixture();
    await ssrMock.seed({
      sellers: [seller],
      products: [product],
      offers: [
        { ...offer, isPublished: true, publishedAt: new Date().toISOString(), status: 'ACTIVE' },
      ],
      medias: [
        {
          id: 'media-main-1',
          relatedType: 'MARKETPLACE_PRODUCT',
          relatedId: product.id,
          role: 'MAIN',
          mimeType: 'image/jpeg',
          altTextFr: 'Flacon Ylang-Ylang',
          moderationStatus: 'APPROVED',
        },
      ],
    });

    // Public page : récupère l'URL du CTA
    await page.goto(`/marketplace/products/${product.slug}`, { timeout: 60_000 });
    const cta = page.getByRole('link', { name: /Demander un devis/i });
    await expect(cta).toBeVisible({ timeout: 30_000 });
    const ctaHref = await cta.getAttribute('href');
    // href = /login?redirect=<URL-encodé contenant offerId>
    expect(ctaHref).toMatch(new RegExp(`/login\\?redirect=.*offerId%3D${offer.id}`));

    // Buyer se connecte et crée la RFQ
    const rfq: RfqState = makeRfqState();
    await mockAuthAs(page, BUYER_USER);
    await mockRfqRoutes(page, rfq, BUYER_USER);

    await loginAsRole(page, BUYER_USER);
    await page.goto(`/quote-requests/new?offerId=${offer.id}`, { timeout: 60_000 });
    await expect(page.locator('option[value="company-buyer-1"]')).toHaveCount(1, {
      timeout: 30_000,
    });

    await page.locator('select').first().selectOption('company-buyer-1');
    await page.getByLabel(/Quantité souhaitée/i).fill('100');
    await page.getByLabel(/^Unité$/i).fill('kg');
    await page
      .getByLabel(/Message au vendeur/i)
      .fill('Merci de nous transmettre votre offre FOB Marseille.');

    const [createResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/v1/marketplace/quote-requests') && r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: /Envoyer la demande/i }).click(),
    ]);
    expect(createResp.status()).toBe(201);

    // offerId correctement transmis
    expect(rfq.createCalls[0]?.offerId).toBe(offer.id);
    expect(rfq.requests).toHaveLength(1);

    const newRfqId = rfq.requests[0].id;
    await page.waitForURL(new RegExp(`/quote-requests/${newRfqId}$`), { timeout: 30_000 });

    // Le buyer envoie un message public
    await page.getByPlaceholder(/Répondre/i).fill('Quel est le prix pour 100 kg FOB ?');
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/v1/marketplace/quote-requests/${newRfqId}/messages`) &&
          r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: /Envoyer/i }).click(),
    ]);

    // Buyer ne peut PAS cocher note interne
    await expect(page.getByLabel(/Note interne/i)).toHaveCount(0);

    // Seller prend la suite
    await mockAuthAs(page, SELLER_USER);
    await mockRfqRoutes(page, rfq, SELLER_USER);
    await loginAsRole(page, SELLER_USER);
    await page.goto(`/quote-requests/${newRfqId}`, { timeout: 60_000 });
    // h1 = titre de l'offre, puis section "Fil de discussion"
    await expect(page.getByRole('heading', { name: /Fil de discussion/i })).toBeVisible({
      timeout: 30_000,
    });

    // Seller ajoute une note interne
    await page.getByPlaceholder(/Répondre/i).fill('Prix plancher 350€/kg — pré-validé direction');
    await page.getByLabel(/Note interne/i).check();
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/v1/marketplace/quote-requests/${newRfqId}/messages`) &&
          r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: /Envoyer/i }).click(),
    ]);

    // Seller passe la RFQ en QUALIFIED (bouton affiché "→ Qualifiée")
    await page.getByRole('button', { name: /Qualifiée/i }).click();
    await expect
      .poll(() => rfq.requests.find((r) => r.id === newRfqId)?.status, {
        timeout: 10_000,
      })
      .toBe('QUALIFIED');

    // Buyer revient : il ne voit PAS la note interne
    await mockAuthAs(page, BUYER_USER);
    await mockRfqRoutes(page, rfq, BUYER_USER);
    await loginAsRole(page, BUYER_USER);
    await page.goto(`/quote-requests/${newRfqId}`, { timeout: 60_000 });
    await expect(page.getByText('Quel est le prix pour 100 kg')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Prix plancher 350/i)).toHaveCount(0);
  });
});

/* =====================================================================
 * P13-E — Régressions de fuite publique
 * ===================================================================== */
test.describe('P13-E — No public leakage of non-validated content', () => {
  test('seller suspendu → fiche publique 404', async ({ page }) => {
    const { seller, product, offer } = makeDefaultFixture();
    await ssrMock.seed({
      sellers: [{ ...seller, status: 'SUSPENDED' }],
      products: [product],
      offers: [
        { ...offer, isPublished: true, publishedAt: new Date().toISOString(), status: 'ACTIVE' },
      ],
    });
    const resp = await page.request.get(`/marketplace/products/${product.slug}`);
    expect(resp.status()).toBe(404);
  });

  test('offre suspendue → fiche publique 404 + catalogue vide', async ({ page }) => {
    const { seller, product, offer } = makeDefaultFixture();
    await ssrMock.seed({
      sellers: [seller],
      products: [product],
      offers: [
        { ...offer, isPublished: true, publishedAt: new Date().toISOString(), status: 'SUSPENDED' },
      ],
    });
    const detail = await page.request.get(`/marketplace/products/${product.slug}`);
    expect(detail.status()).toBe(404);

    await page.goto('/marketplace', { timeout: 60_000 });
    await expect(page.getByText(product.commercialName)).toHaveCount(0);
  });

  test('document rejeté ou expiré jamais rendu public', async ({ page }) => {
    const { seller, product, offer } = makeDefaultFixture();
    await ssrMock.seed({
      sellers: [seller],
      products: [product],
      offers: [
        { ...offer, isPublished: true, publishedAt: new Date().toISOString(), status: 'ACTIVE' },
      ],
      medias: [
        {
          id: 'media-main-1',
          relatedType: 'MARKETPLACE_PRODUCT',
          relatedId: product.id,
          role: 'MAIN',
          moderationStatus: 'APPROVED',
          altTextFr: 'OK',
        },
      ],
      marketplaceDocuments: [
        makeMarketplaceDocumentShape({
          id: 'md-rejected',
          productId: product.id,
          title: 'Certificat rejeté',
          visibility: 'PUBLIC',
          verificationStatus: 'REJECTED',
        }),
        makeMarketplaceDocumentShape({
          id: 'md-expired',
          productId: product.id,
          title: 'Attestation 2022',
          visibility: 'PUBLIC',
          verificationStatus: 'VERIFIED',
          validUntil: new Date(Date.now() - 86_400_000).toISOString(),
        }),
      ],
    });

    await page.goto(`/marketplace/products/${product.slug}`, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: product.commercialName })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Certificat rejeté')).toHaveCount(0);
    await expect(page.getByText('Attestation 2022')).toHaveCount(0);
    // Pas de bloc "Documents publics" quand aucun doc éligible
    await expect(page.getByText('Documents publics')).toHaveCount(0);
  });

  test('média rejeté jamais rendu public', async ({ page }) => {
    const { seller, product, offer } = makeDefaultFixture();
    await ssrMock.seed({
      sellers: [seller],
      products: [product],
      offers: [
        { ...offer, isPublished: true, publishedAt: new Date().toISOString(), status: 'ACTIVE' },
      ],
      medias: [
        {
          id: 'media-rejected',
          relatedType: 'MARKETPLACE_PRODUCT',
          relatedId: product.id,
          role: 'MAIN',
          moderationStatus: 'REJECTED',
          altTextFr: 'Contenu interdit',
        },
      ],
    });
    await page.goto(`/marketplace/products/${product.slug}`, { timeout: 60_000 });
    await expect(page.getByAltText('Contenu interdit')).toHaveCount(0);
    // Placeholder "Pas d'image" affiché à la place
    await expect(page.getByText(/Pas d'image/)).toBeVisible();
  });
});

/* =====================================================================
 * P13-F — /login?redirect=… ramène l'utilisateur sur la page demandée
 * ===================================================================== */
test.describe('P13-F — Login redirect flow', () => {
  test('login avec ?redirect=/quote-requests/new?offerId=… mène le buyer à la bonne page', async ({
    page,
  }) => {
    const target = '/quote-requests/new?offerId=offer-ylang-1';
    await mockAuthAs(page, BUYER_USER);
    // Attendu : après login, l'utilisateur atterrit sur la page RFQ demandée
    // (qui vit sous le dashboard layout → React hydrate, pas de routage 404).
    await loginAsRole(page, BUYER_USER, {
      redirect: target,
      expectUrl: /\/quote-requests\/new\?offerId=offer-ylang-1$/,
    });
  });

  test('redirect protocol-relative ignoré → fallback /dashboard (anti open-redirect)', async ({
    page,
  }) => {
    await mockAuthAs(page, BUYER_USER);
    await loginAsRole(page, BUYER_USER, {
      redirect: '//evil.example.com/phish',
      expectUrl: /\/dashboard$/,
    });
  });
});

/* =====================================================================
 * Helpers internes au spec
 * ===================================================================== */
function makeMarketplaceDocumentShape(opts: {
  id: string;
  productId: string;
  title: string;
  visibility: 'PRIVATE' | 'BUYER_ON_REQUEST' | 'PUBLIC';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  validUntil?: string;
  documentType?: string;
}) {
  return {
    id: opts.id,
    relatedType: 'MARKETPLACE_PRODUCT',
    relatedId: opts.productId,
    documentId: 'doc-src-1',
    documentType: opts.documentType ?? 'CERT_BIO',
    title: opts.title,
    visibility: opts.visibility,
    verificationStatus: opts.verificationStatus,
    validFrom: null,
    validUntil: opts.validUntil ?? null,
  };
}
