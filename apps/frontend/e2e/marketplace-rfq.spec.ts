import { test, expect, Page } from '@playwright/test';
import {
  BUYER_USER,
  SELLER_USER,
  loginAsRole,
  makeRfqState,
  mockAuthAs,
  mockRfqRoutes,
  RfqState,
  warmupRoutes,
} from './helpers/marketplace';

test.describe.configure({ timeout: 180_000 });

test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await warmupRoutes(p, [
    '/login',
    '/dashboard',
    '/quote-requests',
    '/quote-requests/new',
    '/quote-requests/rfq-1',
  ]);
  await ctx.close();
});

/**
 * P9-D — Flow RFQ buyer / seller.
 *
 * 1) Buyer authentifié ouvre /quote-requests/new?offerId=…
 * 2) Sélectionne sa société + remplit le formulaire
 * 3) Envoie la demande → redirection /quote-requests/<id>
 * 4) Envoie un message
 * 5) Vérifie :
 *    - offerId transmis
 *    - pas de transition WON/LOST disponible côté buyer (uniquement CANCELLED)
 *    - pas de case "Note interne" côté buyer
 *
 * Puis, seller se connecte (second contexte isolé) :
 *    - voit la même RFQ
 *    - envoie un message + peut marquer internalNote
 *    - change le statut NEW → QUALIFIED
 *    - buyer ne reçoit pas les notes internes (filtrage messages)
 */

const OFFER_ID = 'offer-ylang-1';

async function setupBuyer(page: Page): Promise<RfqState> {
  await mockAuthAs(page, BUYER_USER);
  const state = makeRfqState();
  await mockRfqRoutes(page, state, BUYER_USER);
  return state;
}

async function setupSeller(page: Page, state: RfqState) {
  await mockAuthAs(page, SELLER_USER);
  await mockRfqRoutes(page, state, SELLER_USER);
}

test.describe('P9-D — Buyer crée une RFQ et échange avec le seller', () => {
  test('buyer crée une RFQ depuis une offre publiée', async ({ page }) => {
    const state = await setupBuyer(page);

    await loginAsRole(page, BUYER_USER);
    await page.goto(`/quote-requests/new?offerId=${OFFER_ID}`, { timeout: 60_000 });
    await expect(page.locator('select').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('option[value="company-buyer-1"]')).toHaveCount(1, {
      timeout: 30_000,
    });

    await expect(page.getByRole('heading', { name: /Nouvelle demande de devis/i })).toBeVisible();
    await expect(page.getByText(OFFER_ID)).toBeVisible();

    // Sélectionner la société acheteuse
    await page.locator('select').first().selectOption('company-buyer-1');
    await page.getByLabel(/Quantité souhaitée/i).fill('100');
    await page.getByLabel(/^Unité$/i).fill('kg');
    await page
      .getByLabel(/Message au vendeur/i)
      .fill('Merci de nous transmettre votre offre FOB Marseille.');

    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().endsWith('/api/v1/marketplace/quote-requests') && r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: /Envoyer la demande/i }).click(),
    ]);
    expect(resp.status()).toBe(201);

    // offerId transmis correctement
    expect(state.createCalls).toHaveLength(1);
    expect(state.createCalls[0]).toMatchObject({
      offerId: OFFER_ID,
      buyerCompanyId: 'company-buyer-1',
    });

    // Redirection vers la fiche
    await page.waitForURL(/\/quote-requests\/rfq-1$/);
    await expect(
      page.getByRole('heading', { name: /Huile essentielle Ylang-Ylang/i }),
    ).toBeVisible();

    // Buyer : seule transition possible = CANCELLED
    await expect(page.getByRole('button', { name: /→ Annulée/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /→ Qualifiée/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /→ Gagnée/i })).toHaveCount(0);

    // Pas de case Note interne côté buyer
    await expect(page.getByText(/Note interne/)).toHaveCount(0);

    // Envoi d'un message public
    await page.getByPlaceholder(/Répondre…/).fill('Bonjour, avez-vous un MOQ sur cette huile ?');
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/v1/marketplace/quote-requests/rfq-1/messages') &&
          r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: /^Envoyer$/i }).click(),
    ]);

    expect(state.messages['rfq-1']).toHaveLength(1);
    expect(state.messages['rfq-1'][0]).toMatchObject({
      isInternalNote: false,
      authorUser: expect.objectContaining({ role: 'MARKETPLACE_BUYER' }),
    });
  });

  test('seller répond, ajoute une note interne, fait passer NEW → QUALIFIED; buyer ne voit pas la note', async ({
    browser,
  }) => {
    // Context 1 : buyer crée la RFQ
    const buyerCtx = await browser.newContext();
    const buyerPage = await buyerCtx.newPage();
    const state = await setupBuyer(buyerPage);
    await loginAsRole(buyerPage, BUYER_USER);
    await buyerPage.goto(`/quote-requests/new?offerId=${OFFER_ID}`, { timeout: 60_000 });
    await expect(buyerPage.locator('select').first()).toBeVisible({ timeout: 30_000 });
    // Attendre que les options soient chargées (companies API mock) avant selectOption
    await expect(buyerPage.locator('option[value="company-buyer-1"]')).toHaveCount(1, {
      timeout: 30_000,
    });
    await buyerPage.locator('select').first().selectOption('company-buyer-1');
    await buyerPage.getByLabel(/Message au vendeur/i).fill('Demande initiale buyer');
    await Promise.all([
      buyerPage.waitForResponse(
        (r) =>
          r.url().endsWith('/api/v1/marketplace/quote-requests') && r.request().method() === 'POST',
      ),
      buyerPage.getByRole('button', { name: /Envoyer la demande/i }).click(),
    ]);
    await buyerPage.waitForURL(/\/quote-requests\/rfq-1$/);

    // Context 2 : seller consulte la même RFQ (state partagé entre les 2 contexts)
    const sellerCtx = await browser.newContext();
    const sellerPage = await sellerCtx.newPage();
    await setupSeller(sellerPage, state);
    await loginAsRole(sellerPage, SELLER_USER);
    await sellerPage.goto('/quote-requests/rfq-1', { timeout: 60_000 });

    await expect(
      sellerPage.getByRole('heading', { name: /Huile essentielle Ylang-Ylang/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Seller voit la transition QUALIFIED
    await expect(sellerPage.getByRole('button', { name: /→ Qualifiée/i })).toBeVisible();

    // Seller envoie une réponse publique
    await sellerPage.getByPlaceholder(/Répondre…/).fill('Bonjour, notre MOQ est 10 kg.');
    await Promise.all([
      sellerPage.waitForResponse(
        (r) =>
          r.url().includes('/api/v1/marketplace/quote-requests/rfq-1/messages') &&
          r.request().method() === 'POST',
      ),
      sellerPage.getByRole('button', { name: /^Envoyer$/i }).click(),
    ]);

    // Seller ajoute une note interne
    await sellerPage.getByPlaceholder(/Répondre…/).fill('Prospect solide, prioriser.');
    await sellerPage.getByLabel(/Note interne/i).check();
    await Promise.all([
      sellerPage.waitForResponse(
        (r) =>
          r.url().includes('/api/v1/marketplace/quote-requests/rfq-1/messages') &&
          r.request().method() === 'POST',
      ),
      sellerPage.getByRole('button', { name: /^Envoyer$/i }).click(),
    ]);

    // State : le message initial buyer est stocké dans rfq.message (pas dans les messages chat).
    // Messages du fil = 2 messages seller (1 public + 1 interne).
    expect(state.messages['rfq-1']).toHaveLength(2);
    expect(state.messages['rfq-1'].filter((m) => m.isInternalNote)).toHaveLength(1);

    // Seller change statut → QUALIFIED
    await Promise.all([
      sellerPage.waitForResponse(
        (r) =>
          r.url().includes('/api/v1/marketplace/quote-requests/rfq-1/status') &&
          r.request().method() === 'PATCH',
      ),
      sellerPage.getByRole('button', { name: /→ Qualifiée/i }).click(),
    ]);
    expect(state.requests[0].status).toBe('QUALIFIED');

    // Buyer recharge → ne voit PAS la note interne
    await buyerPage.reload();
    await expect(buyerPage.getByText('Bonjour, notre MOQ est 10 kg.')).toBeVisible();
    await expect(buyerPage.getByText('Prospect solide, prioriser.')).toHaveCount(0);

    // Et voit le statut mis à jour
    await expect(buyerPage.getByText(/Qualifiée/i).first()).toBeVisible();

    await buyerCtx.close();
    await sellerCtx.close();
  });
});

test.describe('P9-D — Permissions RFQ', () => {
  test('un paramètre offerId manquant affiche un message et bloque la création', async ({
    page,
  }) => {
    await setupBuyer(page);
    await loginAsRole(page, BUYER_USER);
    await page.goto('/quote-requests/new');
    await expect(page.getByText(/Paramètre.*offerId.*manquant/i)).toBeVisible();
  });
});
