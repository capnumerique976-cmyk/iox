import { Page } from '@playwright/test';

/**
 * Helpers partagés entre les specs E2E.
 *
 * - FAKE_USER / FAKE_TOKENS : identité stable pour les mocks auth.
 * - wrap()                  : enveloppe ResponseInterceptor { success, data, timestamp }.
 * - mockAuth()              : mocke /auth/login + /dashboard/stats minimal.
 * - loginAs()               : remplit le formulaire /login et attend /dashboard.
 */

export const FAKE_USER = {
  id: 'user-e2e-1',
  email: 'e2e@iox.mch',
  firstName: 'E2E',
  lastName: 'Tester',
  role: 'ADMIN',
};

export const FAKE_TOKENS = {
  accessToken: 'e2e-access-token',
  refreshToken: 'e2e-refresh-token',
  expiresIn: 900,
};

export async function wrap<T>(data: T) {
  return { success: true, data, timestamp: new Date().toISOString() };
}

export async function mockAuth(page: Page, email = 'e2e@iox.mch', password = 'good-password') {
  await page.route('**/api/v1/auth/login', async (route) => {
    const body = route.request().postDataJSON() as { email: string; password: string };
    if (body.email === email && body.password === password) {
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

  // Dashboard stats minimales pour que /dashboard ne crash pas après redirection.
  await page.route('**/api/v1/dashboard/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        await wrap({
          beneficiaries: { total: 0, active: 0 },
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

  // Endpoints secondaires (alerts, audit, sous-chemins dashboard) — no-op.
  await page.route(/\/api\/v1\/(dashboard|alerts|audit)\b[^/]*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(await wrap([])),
    });
  });
}

export async function loginAs(page: Page, email = 'e2e@iox.mch', password = 'good-password') {
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await Promise.all([
    page.waitForResponse('**/api/v1/auth/login'),
    page.getByRole('button', { name: /Se connecter/i }).click(),
  ]);
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });
}
