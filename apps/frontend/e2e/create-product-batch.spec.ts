import { test, expect, Page } from '@playwright/test';
import { mockAuth, loginAs, wrap } from './helpers/auth';

/**
 * E2E scénario métier #2 : création d'un lot fini.
 *
 * Parcours :
 *   1. login (admin e2e@iox.mch)
 *   2. accès /product-batches/new
 *   3. choix produit conforme + quantité + date production
 *   4. soumission → POST /product-batches
 *   5. redirection vers /product-batches/<id>
 *
 * Deux tests :
 *   - happy path : tout est valide, redirection OK.
 *   - validation : tentative sans produit → erreur locale, pas d'appel API.
 */

const PRODUCT_ID = 'prod-e2e-1';
const BATCH_ID = 'batch-e2e-1';

async function setupMocks(page: Page) {
  await mockAuth(page);

  // Produits conformes
  await page.route(/\/api\/v1\/products\?.*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({
          data: [
            { id: PRODUCT_ID, code: 'PROD-001', name: 'Ylang-Ylang Bio', status: 'COMPLIANT' },
          ],
          meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
        }),
      ),
    });
  });

  // Opérations de transformation (liste vide OK : champ optionnel)
  await page.route(/\/api\/v1\/transformation-operations(\?|$).*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } }),
      ),
    });
  });

  // Création lot
  await page.route('**/api/v1/product-batches', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as {
        productId: string;
        quantity: number;
        unit: string;
        productionDate: string;
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(
          await wrap({
            id: BATCH_ID,
            code: 'LOT-2026-0001',
            productId: body.productId,
            quantity: body.quantity,
            unit: body.unit,
            productionDate: body.productionDate,
            status: 'CREATED',
          }),
        ),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }),
      ),
    });
  });

  // Détail lot (après création)
  await page.route(`**/api/v1/product-batches/${BATCH_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({
          id: BATCH_ID,
          code: 'LOT-2026-0001',
          quantity: 350,
          unit: 'kg',
          productionDate: new Date().toISOString().slice(0, 10),
          status: 'CREATED',
          product: { id: PRODUCT_ID, name: 'Ylang-Ylang Bio' },
          createdAt: new Date().toISOString(),
        }),
      ),
    });
  });
}

test.describe("Parcours critique : création d'un lot fini", () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('crée un lot fini depuis un produit conforme', async ({ page }) => {
    await loginAs(page);
    await page.goto('/product-batches/new');

    await expect(page.getByRole('heading', { name: /Créer un lot fini/i })).toBeVisible();

    // Sélection produit (select HTML natif)
    await page.locator('select').first().selectOption({ value: PRODUCT_ID });

    await page.getByPlaceholder('350').fill('350');
    // Unité et date déjà pré-remplies (kg + today).

    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().includes('/api/v1/product-batches') && r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: /Créer le lot/i }).click(),
    ]);
    expect(resp.status()).toBe(201);

    await expect(page).toHaveURL(new RegExp(`/product-batches/${BATCH_ID}$`), { timeout: 10_000 });
  });

  test('bloque la soumission sans produit sélectionné', async ({ page }) => {
    await loginAs(page);
    await page.goto('/product-batches/new');

    await page.getByPlaceholder('350').fill('100');

    // Aucune requête POST ne doit partir.
    let posted = false;
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/v1/product-batches')) posted = true;
    });

    await page.getByRole('button', { name: /Créer le lot/i }).click();

    await expect(page.getByText('Sélectionnez un produit')).toBeVisible();
    expect(posted).toBe(false);
    await expect(page).toHaveURL(/\/product-batches\/new$/);
  });
});
