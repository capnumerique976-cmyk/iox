import { test, expect, Page } from '@playwright/test';

/**
 * E2E critique : login → accès zone protégée → création entité métier.
 *
 * Le backend réel n'est pas requis : on mocke les routes /api/v1/* via
 * page.route() pour couvrir le flow UI complet de manière déterministe.
 *
 * Stratégie :
 *   1. login → POST /auth/login mocké, retourne tokens + user
 *   2. redirection attendue vers /dashboard (stats mockées)
 *   3. navigation /beneficiaries/new
 *   4. soumission formulaire → POST /beneficiaries mocké, retourne id
 *   5. redirection attendue vers /beneficiaries/<id>
 */

const FAKE_USER = {
  id: 'user-e2e-1',
  email: 'e2e@iox.mch',
  firstName: 'E2E',
  lastName: 'Tester',
  role: 'ADMIN',
};

const FAKE_TOKENS = {
  accessToken: 'e2e-access-token',
  refreshToken: 'e2e-refresh-token',
  expiresIn: 900,
};

const CREATED_BENEFICIARY_ID = 'ben-e2e-42';

async function wrap<T>(data: T) {
  return { success: true, data, timestamp: new Date().toISOString() };
}

async function setupApiMocks(page: Page) {
  // Auth
  await page.route('**/api/v1/auth/login', async (route) => {
    const body = route.request().postDataJSON() as { email: string; password: string };
    if (body.email === 'e2e@iox.mch' && body.password === 'good-password') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(await wrap({ ...FAKE_TOKENS, user: FAKE_USER })),
      });
      return;
    }
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Identifiants incorrects' },
      }),
    });
  });

  // Dashboard stats (minimum pour que la page dashboard ne crash pas)
  await page.route('**/api/v1/dashboard/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({
          beneficiaries: { total: 1, active: 1 },
          inboundBatches: { total: 0, received: 0, inControl: 0, accepted: 0, rejected: 0 },
          productBatches: {
            total: 0,
            created: 0,
            readyForValidation: 0,
            available: 0,
            reserved: 0,
            shipped: 0,
            blocked: 0,
            destroyed: 0,
            availableOrReserved: 0,
          },
          marketDecisions: {
            total: 0,
            compliant: 0,
            withReservations: 0,
            blocked: 0,
            complianceRate: 0,
          },
          labelValidations: { total: 0, valid: 0, invalid: 0, passRate: 0 },
          documents: { totalActive: 0 },
          products: { total: 0, compliant: 0, blocked: 0, draft: 0 },
        }),
      ),
    });
  });

  // Endpoints secondaires appelés par le dashboard ou le layout — no-op success
  await page.route(/\/api\/v1\/(dashboard|alerts|audit)\b[^/]*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(await wrap([])),
    });
  });

  // Création bénéficiaire
  await page.route('**/api/v1/beneficiaries', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name?: string };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(
          await wrap({ id: CREATED_BENEFICIARY_ID, code: 'BEN-0042', name: body.name }),
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

  // Détail bénéficiaire (après création on redirige dessus)
  await page.route(`**/api/v1/beneficiaries/${CREATED_BENEFICIARY_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({
          id: CREATED_BENEFICIARY_ID,
          code: 'BEN-0042',
          name: 'Coopérative E2E',
          type: 'entreprise',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        }),
      ),
    });
  });
}

test.describe('Parcours critique : login → création bénéficiaire', () => {
  // Warm-up : compile le bundle /login côté Next dev server avant la suite.
  // Sans ça, le 1er test flake à froid quand la compilation dépasse 5s.
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('rejette les mauvais identifiants et affiche un message', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'IOX' })).toBeVisible();

    await page.getByLabel('Adresse e-mail').fill('e2e@iox.mch');
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe');

    // On attend la réponse mockée pour éliminer la latence du dev server au 1er run
    const [response] = await Promise.all([
      page.waitForResponse('**/api/v1/auth/login'),
      page.getByRole('button', { name: /Se connecter/i }).click(),
    ]);
    expect(response.status()).toBe(401);

    await expect(page.getByText('Identifiants incorrects')).toBeVisible({ timeout: 10_000 });
    // Reste sur /login
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login valide → dashboard → création bénéficiaire → détail', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.getByLabel('Adresse e-mail').fill('e2e@iox.mch');
    await page.getByLabel('Mot de passe').fill('good-password');

    const [loginResp] = await Promise.all([
      page.waitForResponse('**/api/v1/auth/login'),
      page.getByRole('button', { name: /Se connecter/i }).click(),
    ]);
    expect(loginResp.status()).toBe(200);

    // 2. Redirection vers le dashboard protégé
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });

    // Token persisté (preuve que la session est établie)
    const accessToken = await page.evaluate(() => localStorage.getItem('iox_access_token'));
    expect(accessToken).toBe('e2e-access-token');

    // 3. Navigation directe vers le formulaire de création bénéficiaire
    await page.goto('/beneficiaries/new');
    await expect(page.getByRole('heading', { name: /Nouveau bénéficiaire/i })).toBeVisible();

    // 4. Remplir + soumettre
    await page.getByPlaceholder('Coopérative Mahoraise Bio').fill('Coopérative E2E');
    await page.getByRole('button', { name: /Créer le bénéficiaire/i }).click();

    // 5. Redirection vers le détail
    await expect(page).toHaveURL(new RegExp(`/beneficiaries/${CREATED_BENEFICIARY_ID}$`), {
      timeout: 10_000,
    });
  });
});
