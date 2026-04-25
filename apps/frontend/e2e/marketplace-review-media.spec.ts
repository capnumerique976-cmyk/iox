import { test, expect, Page } from '@playwright/test';
import {
  ADMIN_USER,
  loginAsRole,
  makeMediaAsset,
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
 * Scénarios E2E marketplace P9-A et P9-B.
 *
 * P9-A — seller upload → admin approve → buyer voit le média
 *   On simule qu'un seller a déjà uploadé un média (state initial PENDING + item queue).
 *   Admin ouvre /admin/review-queue, voit la preview, clique Approuver.
 *   Vérifications :
 *     - appel PATCH /media-assets/:id/approve (pas /review-queue/:id/approve)
 *     - queue auto-résolue (moderationStatus=APPROVED, queue=APPROVED)
 *     - filtre PENDING : item disparaît de la liste
 *     - simulation visibilité buyer : média renvoyé APPROVED par l'endpoint asset
 *
 * P9-B — reject → resubmit → second review
 *   Admin rejette avec motif.
 *   On remet le média en PENDING + nouvel item queue (simule update seller).
 *   Admin approuve. La 2ᵉ review existe sans casser la 1ʳᵉ (historique REJECTED).
 *
 * Hypothèses de seed :
 *   - Auth mockée (admin@iox.mch / good-password)
 *   - Aucun backend requis. Stub storage pour éviter les erreurs next/image.
 */

const MEDIA_ID = 'media-prod-1';
const PRODUCT_ID = 'mp-prod-1';

async function setup(page: Page): Promise<ReviewQueueState> {
  await mockAuthAs(page, ADMIN_USER);
  const state = makeReviewQueueState();

  // Seed : un média PENDING déjà uploadé par le seller
  state.medias[MEDIA_ID] = makeMediaAsset({
    id: MEDIA_ID,
    relatedType: 'MARKETPLACE_PRODUCT',
    relatedId: PRODUCT_ID,
    role: 'MAIN',
    moderationStatus: 'PENDING',
    altTextFr: 'Flacon Ylang-Ylang',
  });
  state.items.push(
    makeQueueItem({
      id: 'queue-media-1',
      entityType: 'MARKETPLACE_PRODUCT',
      entityId: MEDIA_ID,
      reviewType: 'MEDIA',
      status: 'PENDING',
    }),
  );

  await mockReviewQueueRoutes(page, state);
  return state;
}

test.describe("P9-A — Admin approve d'un média marketplace", () => {
  test('le média PENDING apparaît avec preview, approve le fait disparaître et bascule APPROVED', async ({
    page,
  }) => {
    page.on('pageerror', (err) => console.log('[pageerror]', err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[console.error]', msg.text());
    });
    const state = await setup(page);

    await loginAsRole(page, ADMIN_USER);
    await page.goto('/admin/review-queue', { timeout: 60_000 });

    // Page affiche le compteur et notre item
    await expect(page.getByRole('heading', { name: /File de revue marketplace/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/Médias 1/i)).toBeVisible();

    // Ligne MEDIA visible + preview <img> chargée
    const row = page.locator('tbody tr').first();
    await expect(row).toContainText('MEDIA');
    await expect(row.getByRole('img', { name: /Flacon Ylang-Ylang/i })).toBeVisible();

    // Rôle du média affiché (MAIN)
    await expect(row.getByText('MAIN')).toBeVisible();

    // Approuver → appel PATCH /media-assets/:id/approve
    const [resp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/v1/media-assets/${MEDIA_ID}/approve`) &&
          r.request().method() === 'PATCH',
      ),
      row.getByRole('button', { name: /Approuver/i }).click(),
    ]);
    expect(resp.status()).toBe(200);

    // Aucun appel au endpoint review-queue/approve pour ce type MEDIA
    expect(state.approveCalls).toEqual([{ type: 'MEDIA', target: MEDIA_ID }]);

    // État convergé : média APPROVED + queue APPROVED
    expect(state.medias[MEDIA_ID].moderationStatus).toBe('APPROVED');
    expect(state.items[0].status).toBe('APPROVED');

    // La liste (filtre PENDING par défaut) ne contient plus l'item
    await expect(page.getByText('Aucun item')).toBeVisible();
    await expect(page.getByText(/Médias 0/i)).toBeVisible();

    // Simulation "visibilité publique" : un consommateur API verrait moderationStatus=APPROVED
    // (la règle métier de publication est vérifiée côté backend, cf tests unitaires media-assets).
  });
});

test.describe('P9-B — Admin rejette un média, seller resubmit, 2ᵉ review approuvée', () => {
  test('rejet avec motif → resubmit → nouvelle review PENDING → approve', async ({ page }) => {
    const state = await setup(page);

    await loginAsRole(page, ADMIN_USER);
    await page.goto('/admin/review-queue', { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: /File de revue marketplace/i })).toBeVisible({
      timeout: 30_000,
    });

    const row = page.locator('tbody tr').first();
    await row.getByRole('button', { name: /Rejeter/i }).click();

    // L9-2 : titre standardisé via ConfirmDialog → "Rejeter cet item de revue".
    const modal = page.getByRole('heading', { name: /Rejeter cet item de revue/i });
    await expect(modal).toBeVisible();

    await page.getByPlaceholder(/Expliquer pourquoi/i).fill('Image floue, fond inapproprié');
    const [rejectResp] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes(`/api/v1/media-assets/${MEDIA_ID}/reject`) &&
          r.request().method() === 'PATCH',
      ),
      page.getByRole('button', { name: /Confirmer le rejet/i }).click(),
    ]);
    expect(rejectResp.status()).toBe(200);

    // État : média REJECTED + queue REJECTED avec motif persisté
    expect(state.medias[MEDIA_ID].moderationStatus).toBe('REJECTED');
    expect(state.items[0].status).toBe('REJECTED');
    expect(state.items[0].reviewReason).toBe('Image floue, fond inapproprié');
    expect(state.rejectCalls[0]).toMatchObject({
      type: 'MEDIA',
      target: MEDIA_ID,
      reason: 'Image floue, fond inapproprié',
    });

    // Liste PENDING → vide
    await expect(page.getByText('Aucun item')).toBeVisible();

    // On passe le filtre sur REJECTED pour voir l'historique
    await page.locator('select').first().selectOption('REJECTED');
    const historyRow = page.locator('tbody tr').first();
    await expect(historyRow).toContainText('REJECTED');
    await expect(historyRow).toContainText('Image floue');

    // Simulation du resubmit : seller met à jour son média → passe en PENDING + nouvel item queue.
    // On mute le state puis on recharge (comme le front appelle load() après chaque action).
    state.medias[MEDIA_ID].moderationStatus = 'PENDING';
    state.items.push(
      makeQueueItem({
        id: 'queue-media-2',
        entityType: 'MARKETPLACE_PRODUCT',
        entityId: MEDIA_ID,
        reviewType: 'MEDIA',
        status: 'PENDING',
      }),
    );

    // Repasse le filtre sur PENDING → nouvelle review visible
    await page.locator('select').first().selectOption('PENDING');
    await expect(page.getByText(/Médias 1/i)).toBeVisible();
    const pendingRow = page.locator('tbody tr').first();
    await expect(pendingRow).toContainText('PENDING');

    // Pas de doublon : exactement 1 item PENDING pour ce média
    const pendingForMedia = state.items.filter(
      (i) => i.entityId === MEDIA_ID && i.status === 'PENDING',
    );
    expect(pendingForMedia).toHaveLength(1);
    expect(pendingForMedia[0].id).toBe('queue-media-2');

    // Approbation de la 2ᵉ review
    await Promise.all([
      page.waitForResponse((r) => r.url().includes(`/api/v1/media-assets/${MEDIA_ID}/approve`)),
      pendingRow.getByRole('button', { name: /Approuver/i }).click(),
    ]);

    expect(state.medias[MEDIA_ID].moderationStatus).toBe('APPROVED');
    // queue-media-1 reste REJECTED (historique), queue-media-2 passe APPROVED
    expect(state.items.find((i) => i.id === 'queue-media-1')!.status).toBe('REJECTED');
    expect(state.items.find((i) => i.id === 'queue-media-2')!.status).toBe('APPROVED');
  });
});
