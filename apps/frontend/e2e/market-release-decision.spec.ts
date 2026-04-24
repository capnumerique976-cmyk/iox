import { test, expect, Page } from '@playwright/test';
import { mockAuth, loginAs, wrap } from './helpers/auth';

/**
 * E2E scénario métier #3 : décision de mise sur le marché.
 *
 * Parcours :
 *   1. login
 *   2. /market-release-decisions/new
 *   3. sélection d'un lot fini éligible (READY_FOR_VALIDATION)
 *   4. choix décision "Non conforme" → motif de blocage obligatoire
 *   5. soumission → POST /market-release-decisions
 *   6. redirection vers la liste /market-release-decisions
 *
 * Couvre la règle métier critique : impossible de bloquer un lot sans motif.
 */

const BATCH_ID = 'batch-e2e-release-1';

async function setupMocks(page: Page) {
  await mockAuth(page);

  // La page charge 3 statuts éligibles (READY_FOR_VALIDATION, CREATED, AVAILABLE).
  // On répond uniformément avec un seul lot pour chaque appel.
  await page.route(/\/api\/v1\/product-batches\?.*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({
          data: [
            {
              id: BATCH_ID,
              code: 'LOT-2026-0042',
              status: 'READY_FOR_VALIDATION',
              product: { id: 'prod-x', name: 'Ylang-Ylang Bio' },
            },
          ],
          meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
        }),
      ),
    });
  });

  // Liste (pour la redirection après création)
  await page.route('**/api/v1/market-release-decisions', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as {
        productBatchId: string;
        decision: string;
        blockingReason?: string;
      };
      // Le backend exige blockingReason non vide pour NON_COMPLIANT.
      if (body.decision === 'NON_COMPLIANT' && !body.blockingReason) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, message: 'blockingReason requis' }),
        });
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(
          await wrap({
            id: 'decision-e2e-1',
            productBatchId: body.productBatchId,
            decision: body.decision,
            blockingReason: body.blockingReason ?? null,
            createdAt: new Date().toISOString(),
          }),
        ),
      });
      return;
    }
    // GET list
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }),
      ),
    });
  });
}

test.describe('Parcours critique : décision de mise sur le marché', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('bloque un lot non conforme avec motif obligatoire', async ({ page }) => {
    await loginAs(page);
    await page.goto('/market-release-decisions/new');

    await expect(page.getByRole('heading', { name: /Nouvelle décision/i })).toBeVisible();

    // Sélection du lot dans la liste (bouton code LOT-…)
    await page.getByRole('button', { name: /LOT-2026-0042/ }).click();
    await expect(page.getByText('statut READY_FOR_VALIDATION')).toBeVisible();

    // Décision "Non conforme"
    await page.getByRole('button', { name: /Non conforme/i }).click();

    // Tentative sans motif → erreur locale
    await page.getByRole('button', { name: /Créer la décision/i }).click();
    await expect(page.getByText(/Motif de blocage obligatoire/i)).toBeVisible();
    await expect(page).toHaveURL(/\/market-release-decisions\/new$/);

    // Saisie du motif + re-soumission
    await page.getByPlaceholder(/Raison précise/i).fill('Teneur en pesticides au-dessus du seuil');

    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/v1/market-release-decisions') && r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: /Créer la décision/i }).click(),
    ]);
    expect(resp.status()).toBe(201);

    // Redirection vers la liste
    await expect(page).toHaveURL(/\/market-release-decisions$/, { timeout: 10_000 });
  });

  test('valide un lot conforme sans motif', async ({ page }) => {
    await loginAs(page);
    await page.goto('/market-release-decisions/new');

    await page.getByRole('button', { name: /LOT-2026-0042/ }).click();

    // Décision "Conforme" (sélectionnée par défaut) — on reclique pour forcer la valeur
    await page.getByRole('button', { name: /^Conforme$/i }).click();

    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/v1/market-release-decisions') && r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: /Créer la décision/i }).click(),
    ]);
    expect(resp.status()).toBe(201);

    await expect(page).toHaveURL(/\/market-release-decisions$/, { timeout: 10_000 });
  });
});
