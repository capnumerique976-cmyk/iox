import { test, expect, Page } from '@playwright/test';
import {
  ADMIN_USER,
  loginAsRole,
  makeQueueItem,
  makeReviewQueueState,
  mockAuthAs,
  mockReviewQueueRoutes,
  ReviewQueueState,
  warmupRoutes,
} from './helpers/marketplace';

test.describe.configure({ timeout: 120_000 });

test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await warmupRoutes(p, ['/login', '/dashboard', '/admin/review-queue']);
  await ctx.close();
});

/**
 * P9-C — Publication d'un produit marketplace.
 *
 * Les pages "seller CRUD" (profile / product / offer management) ne sont pas encore
 * exposées côté frontend. L'E2E couvre donc la partie observable depuis l'UI :
 *   - admin ouvre /admin/review-queue
 *   - filtre sur PUBLICATION
 *   - voit une publication PENDING (profil seller, produit ou offre)
 *   - approuve via l'endpoint queue (POST /review-queue/:id/approve)
 *
 * Pour un produit à publier, on teste qu'une publication refusée garde son motif
 * et réapparaît en PENDING après resubmit (simulation).
 */

async function setup(page: Page): Promise<ReviewQueueState> {
  await mockAuthAs(page, ADMIN_USER);
  const state = makeReviewQueueState();

  state.items.push(
    makeQueueItem({
      id: 'queue-pub-1',
      entityType: 'MARKETPLACE_PRODUCT',
      entityId: 'mp-prod-1',
      reviewType: 'PUBLICATION',
      status: 'PENDING',
    }),
    makeQueueItem({
      id: 'queue-pub-2',
      entityType: 'SELLER_PROFILE',
      entityId: 'seller-1',
      reviewType: 'PUBLICATION',
      status: 'PENDING',
    }),
  );

  await mockReviewQueueRoutes(page, state);
  return state;
}

test.describe('P9-C — Publication : approve via file de revue', () => {
  test('admin filtre PUBLICATION et approuve un produit', async ({ page }) => {
    const state = await setup(page);

    await loginAsRole(page, ADMIN_USER);
    await page.goto('/admin/review-queue', { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: /File de revue marketplace/i })).toBeVisible({
      timeout: 30_000,
    });

    // 2 publications en attente
    await expect(page.getByText(/Publications 2/i)).toBeVisible();

    // Filtrer sur PUBLICATION
    await page.locator('select').nth(1).selectOption('PUBLICATION');
    await expect(page.locator('tbody tr')).toHaveCount(2);

    // Approuver le produit (1ʳᵉ ligne : MARKETPLACE_PRODUCT)
    const productRow = page.locator('tbody tr').filter({ hasText: 'Produit marketplace' });
    await expect(productRow).toHaveCount(1);

    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/v1/marketplace/review-queue/queue-pub-1/approve') &&
          r.request().method() === 'POST',
      ),
      productRow.getByRole('button', { name: /Approuver/i }).click(),
    ]);
    expect(resp.status()).toBe(200);

    // L'approbation a bien appelé l'endpoint queue (pas media-assets)
    expect(state.approveCalls).toEqual([{ type: 'OTHER', target: 'queue-pub-1' }]);
    expect(state.items.find((i) => i.id === 'queue-pub-1')!.status).toBe('APPROVED');
    // L'autre item reste PENDING
    expect(state.items.find((i) => i.id === 'queue-pub-2')!.status).toBe('PENDING');
  });

  test('rejet avec motif → resubmit → 2ᵉ PUBLICATION PENDING', async ({ page }) => {
    const state = await setup(page);

    await loginAsRole(page, ADMIN_USER);
    await page.goto('/admin/review-queue', { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: /File de revue marketplace/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.locator('select').nth(1).selectOption('PUBLICATION');

    const productRow = page.locator('tbody tr').filter({ hasText: 'Produit marketplace' });
    await productRow.getByRole('button', { name: /Rejeter/i }).click();
    await page
      .getByPlaceholder(/Expliquer pourquoi/i)
      .fill('Fiche incomplète : description trop courte');

    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/v1/marketplace/review-queue/queue-pub-1/reject') &&
          r.request().method() === 'POST',
      ),
      page.getByRole('button', { name: /Confirmer le rejet/i }).click(),
    ]);

    expect(state.items.find((i) => i.id === 'queue-pub-1')!.status).toBe('REJECTED');
    expect(state.items.find((i) => i.id === 'queue-pub-1')!.reviewReason).toBe(
      'Fiche incomplète : description trop courte',
    );
    expect(state.rejectCalls[0].reason).toBe('Fiche incomplète : description trop courte');

    // Simulation du re-soumission : le seller met à jour le produit → nouvelle review PENDING
    state.items.push(
      makeQueueItem({
        id: 'queue-pub-3',
        entityType: 'MARKETPLACE_PRODUCT',
        entityId: 'mp-prod-1',
        reviewType: 'PUBLICATION',
        status: 'PENDING',
      }),
    );

    // Reload filtre PENDING pour voir la nouvelle entrée
    await page.locator('select').first().selectOption('PENDING');
    await page.locator('select').nth(1).selectOption('PUBLICATION');
    await expect(page.locator('tbody tr').filter({ hasText: 'Produit marketplace' })).toHaveCount(
      1,
    );

    // Pas de doublon PENDING pour le même produit : une seule (queue-pub-3)
    const pending = state.items.filter(
      (i) => i.entityId === 'mp-prod-1' && i.reviewType === 'PUBLICATION' && i.status === 'PENDING',
    );
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe('queue-pub-3');
  });
});
