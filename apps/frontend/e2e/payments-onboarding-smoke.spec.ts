// PAY-1 phase 1 — Smoke E2E onboarding Stripe Connect Express (test mode).
//
// Test taggé `@stripe-prod` : skippé par défaut en CI normale.
// Active si STRIPE_SECRET_KEY env présent (CI Stripe-aware ou local après
// activation). Vérifie redirect Stripe Express depuis /seller/payments.
//
// Pré-requis exécution :
//  - VPS avec STRIPE_SECRET_KEY configuré (cf. docs/ops/STRIPE_PROD_ACTIVATION.md).
//  - User smoke-seller@iox.mch existe avec password IoxSmoke2026!.
//  - SellerProfile rattaché au compte smoke-seller (pas pré-onboardé Stripe).

import { test, expect } from '@playwright/test';

const STRIPE_TAG = '@stripe-prod';

test.describe(`Payments onboarding smoke ${STRIPE_TAG}`, () => {
  test.beforeAll(() => {
    if (!process.env.STRIPE_SECRET_KEY) {
      test.skip(
        true,
        'STRIPE_SECRET_KEY absent — skip smoke onboarding (test mode requis).',
      );
    }
  });

  test('seller voit page onboarding + bouton démarrer redirect Stripe Express', async ({
    page,
  }) => {
    // 1. Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('smoke-seller@iox.mch');
    await page.getByLabel(/mot de passe/i).fill('IoxSmoke2026!');
    await page.getByRole('button', { name: /connecter|sign in/i }).click();

    // 2. Navigate /seller/payments
    await page.goto('/seller/payments');

    // 3. Status badge présent
    await expect(page.getByTestId('seller-payments-status-badge')).toBeVisible({
      timeout: 10_000,
    });

    // 4. Bouton démarrer présent (status par défaut PENDING_ONBOARDING avant Stripe)
    const startBtn = page.getByTestId('seller-payments-start');
    await expect(startBtn).toBeVisible();

    // 5. Click → redirect Stripe Express
    // Note : on intercepte la redirection en bloquant la navigation pour vérifier l'URL.
    // Stripe URL pattern : https://connect.stripe.com/express/onboarding/...
    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().startsWith('https://connect.stripe.com'),
        { timeout: 15_000 },
      ),
      startBtn.click(),
    ]);

    expect(request.url()).toMatch(/^https:\/\/connect\.stripe\.com\/express\//);
  });
});
