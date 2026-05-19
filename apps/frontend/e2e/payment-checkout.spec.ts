/**
 * P10-PAY — Buyer checkout paiement (mocked API, CI-safe).
 *
 * Ce spec teste le parcours frontend complet :
 *   RFQ WON → CTA "Finaliser le paiement" → page checkout → POST checkout-session → redirect Stripe
 *
 * Stripe checkout réel (saisie carte 4242...) n'est PAS inclus car :
 *  - La page checkout.stripe.com est hors contrôle Playwright
 *  - Le webhook Stripe ne peut pas être déclenché de façon fiable en CI
 *
 * Pour le test E2E complet avec vraie carte :
 *   voir notes/manual-e2e-payment-checkout-m132.md
 *
 * Prérequis :
 *   - Playwright configuré (playwright.config.ts)
 *   - baseURL = http://localhost:3000 (ou VPS)
 */

import { test, expect, type Page } from '@playwright/test';
import { wrap } from './helpers/auth';
import { loginAsRole } from './helpers/marketplace';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BUYER_USER = {
  id: 'user-buyer-1',
  email: 'buyer@export.io',
  firstName: 'Buyer',
  lastName: 'Tester',
  role: 'MARKETPLACE_BUYER' as const,
};

const RFQ_ID = 'rfq-won-1';
const OFFER_ID = 'offer-vanille-1';
const PAYMENT_ID = 'pay-test-1';
const CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/cs_test_xxx';

function makeWonRfq(overrides: Record<string, unknown> = {}) {
  return {
    id: RFQ_ID,
    status: 'WON',
    requestedQuantity: 2,
    requestedUnit: 'kg',
    deliveryCountry: 'FR',
    targetMarket: 'EU',
    message: 'Commande 2kg vanille Bourbon Grand Cru.',
    assignedToUserId: null,
    createdAt: '2026-04-20T00:00:00Z',
    updatedAt: '2026-04-21T00:00:00Z',
    buyerCompanyId: 'company-buyer-1',
    buyerUserId: 'user-buyer-1',
    marketplaceOffer: {
      id: OFFER_ID,
      title: 'Vanille Bourbon Grand Cru',
      priceMode: 'FIXED',
      unitPrice: '1200.00',
      currency: 'EUR',
      moq: 1,
      incoterm: 'FOB',
      leadTimeDays: 21,
      departureLocation: 'Mamoudzou',
      sellerProfile: {
        id: 'sp-1',
        slug: 'demo-coop-vanille',
        publicDisplayName: 'Coop Vanille Premium',
      },
      marketplaceProduct: {
        id: 'mp-1',
        slug: 'vanille-bourbon-grade-a',
        commercialName: 'Vanille Bourbon Grade A',
      },
    },
    buyerCompany: { id: 'company-buyer-1', code: 'BUY', name: 'Export France SAS', country: 'FR' },
    buyerUser: { id: 'user-buyer-1', firstName: 'Buyer', lastName: 'Tester', email: 'buyer@export.io' },
    assignedToUser: null,
    messages: [],
    ...overrides,
  };
}

// ── Route mocks ───────────────────────────────────────────────────────────────

async function mockAuthRoutes(page: Page) {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(await wrap(BUYER_USER)),
    });
  });
  await page.route('**/api/v1/dashboard/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(await wrap({ beneficiaries: { total: 0, active: 0 } })),
    });
  });
  await page.route('**/api/v1/buyers/daily-actions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(await wrap({ actions: [] })),
    });
  });
  await page.route('**/api/v1/notifications**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(await wrap({ items: [], total: 0 })),
    });
  });
  await page.route('**/api/v1/users/me/companies**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(await wrap([])),
    });
  });
}

async function mockRfqRoutes(page: Page) {
  // RFQ detail
  await page.route(`**/api/v1/marketplace/quote-requests/${RFQ_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(await wrap(makeWonRfq())),
    });
  });
  // RFQ list (buyer)
  await page.route('**/api/v1/marketplace/quote-requests**', async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET' && !url.pathname.includes(RFQ_ID)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(await wrap({ items: [makeWonRfq()], total: 1 })),
      });
    } else {
      await route.fallback();
    }
  });
}

async function mockCheckoutRoutes(
  page: Page,
  opts: { failWith?: string } = {},
) {
  await page.route('**/api/v1/payments/checkout-session', async (route) => {
    if (opts.failWith) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'Bad Request', message: opts.failWith },
        }),
      });
    } else {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(
          await wrap({ paymentId: PAYMENT_ID, sessionId: 'cs_test_xxx', checkoutUrl: CHECKOUT_URL }),
        ),
      });
    }
  });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeAll(async ({ browser }) => {
  // Warmup pages to prime router cache
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await mockAuthRoutes(page);
  await mockRfqRoutes(page);
  await page.goto('/buyer/quote-requests', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
  await page.goto(`/buyer/quote-requests/${RFQ_ID}`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
  await page.goto(`/buyer/payments/checkout/${RFQ_ID}`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
  await ctx.close();
});

// ── P10-PAY-A : CTA "Finaliser le paiement" sur RFQ WON ──────────────────────

test.describe('P10-PAY-A — CTA paiement sur RFQ WON', () => {
  test('buyer voit CTA "Finaliser le paiement" sur une RFQ WON', async ({ page }) => {
    await mockAuthRoutes(page);
    await mockRfqRoutes(page);

    await loginAsRole(page, BUYER_USER, { expectUrl: /\/buyer$/ });
    await page.goto(`/buyer/quote-requests/${RFQ_ID}`, { timeout: 60_000 });
    await expect(page.locator('[data-testid="buyer-rfq-payment-cta"]')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Finaliser le paiement')).toBeVisible();
  });

  test('CTA pointe vers la page checkout', async ({ page }) => {
    await mockAuthRoutes(page);
    await mockRfqRoutes(page);

    await loginAsRole(page, BUYER_USER, { expectUrl: /\/buyer$/ });
    await page.goto(`/buyer/quote-requests/${RFQ_ID}`, { timeout: 60_000 });
    const cta = page.locator('[data-testid="buyer-rfq-payment-cta"]');
    await expect(cta).toBeVisible({ timeout: 20_000 });
    const href = await cta.locator('a').getAttribute('href');
    expect(href).toMatch(new RegExp(`/buyer/payments/checkout/${RFQ_ID}`));
  });

  test('pas de CTA paiement sur RFQ QUOTED', async ({ page }) => {
    await mockAuthRoutes(page);
    await page.route(`**/api/v1/marketplace/quote-requests/${RFQ_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(await wrap(makeWonRfq({ status: 'QUOTED' }))),
      });
    });

    await loginAsRole(page, BUYER_USER, { expectUrl: /\/buyer$/ });
    await page.goto(`/buyer/quote-requests/${RFQ_ID}`, { timeout: 60_000 });
    // Page loads (heading visible) but no payment CTA
    await page.waitForSelector('[data-testid]', { timeout: 20_000 });
    await expect(page.locator('[data-testid="buyer-rfq-payment-cta"]')).toHaveCount(0);
  });
});

// ── P10-PAY-B : Page checkout ─────────────────────────────────────────────────

test.describe('P10-PAY-B — Page checkout buyer', () => {
  test('affiche le résumé produit et montant read-only', async ({ page }) => {
    await mockAuthRoutes(page);
    await mockRfqRoutes(page);
    await mockCheckoutRoutes(page);

    await loginAsRole(page, BUYER_USER, { expectUrl: /\/buyer$/ });
    await page.goto(`/buyer/payments/checkout/${RFQ_ID}`, { timeout: 60_000 });

    // Résumé visible
    await expect(page.locator('[data-testid="buyer-checkout-summary"]')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Vanille Bourbon Grade A')).toBeVisible();
    await expect(page.getByText('Coop Vanille Premium')).toBeVisible();

    // Montant en lecture seule — un <p>, non un <input>
    const amountEl = page.locator('[data-testid="buyer-checkout-amount"]');
    await expect(amountEl).toBeVisible();
    const tag = await amountEl.evaluate((el) => el.tagName.toLowerCase());
    expect(tag).toBe('p');

    // Offer ID read-only input
    const offerInput = page.locator('[data-testid="buyer-checkout-offer-id"]');
    await expect(offerInput).toBeVisible();
    await expect(offerInput).toHaveAttribute('readonly', /.*/);
  });

  test('montant total proéminent affiché', async ({ page }) => {
    await mockAuthRoutes(page);
    await mockRfqRoutes(page);
    await mockCheckoutRoutes(page);

    await loginAsRole(page, BUYER_USER, { expectUrl: /\/buyer$/ });
    await page.goto(`/buyer/payments/checkout/${RFQ_ID}`, { timeout: 60_000 });

    // 1200 EUR × 2 kg = 2400.00
    await expect(page.locator('[data-testid="buyer-checkout-total"]')).toContainText('2400.00', {
      timeout: 20_000,
    });
    await expect(page.locator('[data-testid="buyer-checkout-total"]')).toContainText('EUR');
  });

  test('bouton Payer via Stripe appelle POST checkout-session', async ({ page }) => {
    await mockAuthRoutes(page);
    await mockRfqRoutes(page);
    await mockCheckoutRoutes(page);

    // Intercept redirect to Stripe (ne pas vraiment naviguer)
    await page.route('https://checkout.stripe.com/**', async (route) => {
      await route.abort(); // stop redirect
    });

    const checkoutReq = page.waitForRequest(
      (r) => r.url().includes('/api/v1/payments/checkout-session') && r.method() === 'POST',
    );

    await loginAsRole(page, BUYER_USER, { expectUrl: /\/buyer$/ });
    await page.goto(`/buyer/payments/checkout/${RFQ_ID}`, { timeout: 60_000 });
    await expect(page.locator('[data-testid="buyer-checkout-pay"]')).toBeVisible({
      timeout: 20_000,
    });
    await page.locator('[data-testid="buyer-checkout-pay"]').click();

    const req = await checkoutReq;
    const body = req.postDataJSON() as Record<string, unknown>;
    expect(body.quoteRequestId).toBe(RFQ_ID);
    expect(body.marketplaceOfferId).toBe(OFFER_ID);
    expect(typeof body.amountCents).toBe('number');
    expect(body.amountCents).toBeGreaterThan(0);
    expect(body.currency).toBe('EUR');
    expect(body.returnUrl).toMatch(/\/buyer\/payments\/return\//);
    expect(body.cancelUrl).toMatch(/\/buyer\/payments\/cancel\//);
  });

  test('erreur serveur → toast affiché, pas de redirect', async ({ page }) => {
    await mockAuthRoutes(page);
    await mockRfqRoutes(page);
    await mockCheckoutRoutes(page, { failWith: 'Le vendeur n\'est pas configuré pour les paiements Stripe.' });

    await loginAsRole(page, BUYER_USER, { expectUrl: /\/buyer$/ });
    await page.goto(`/buyer/payments/checkout/${RFQ_ID}`, { timeout: 60_000 });
    await expect(page.locator('[data-testid="buyer-checkout-pay"]')).toBeVisible({
      timeout: 20_000,
    });
    await page.locator('[data-testid="buyer-checkout-pay"]').click();

    // Toast erreur visible
    await expect(
      page.getByText(/Le vendeur n'est pas configuré/i).or(page.getByText(/Erreur/i)),
    ).toBeVisible({ timeout: 10_000 });

    // Toujours sur la page checkout (pas de redirect Stripe)
    expect(page.url()).toMatch(/\/buyer\/payments\/checkout\//);
  });
});

// ── P10-PAY-C : Page retour après paiement ────────────────────────────────────

test.describe('P10-PAY-C — Page retour succès', () => {
  test('affiche confirmation de paiement reçu', async ({ page }) => {
    await mockAuthRoutes(page);

    await loginAsRole(page, BUYER_USER, { expectUrl: /\/buyer$/ });
    await page.goto(`/buyer/payments/return/${RFQ_ID}`, { timeout: 60_000 });

    await expect(page.locator('[data-testid="buyer-payments-return-page"]')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText('Paiement reçu')).toBeVisible();
    await expect(page.getByRole('link', { name: /Voir ma facture/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /espace acheteur/i })).toBeVisible();
  });
});

// ── P10-PAY-D : Sécurité ──────────────────────────────────────────────────────

test.describe('P10-PAY-D — Sécurité frontend', () => {
  test('bandeau sécurité Stripe visible', async ({ page }) => {
    await mockAuthRoutes(page);
    await mockRfqRoutes(page);
    await mockCheckoutRoutes(page);

    await loginAsRole(page, BUYER_USER, { expectUrl: /\/buyer$/ });
    await page.goto(`/buyer/payments/checkout/${RFQ_ID}`, { timeout: 60_000 });

    await expect(page.locator('[data-testid="buyer-checkout-security"]')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('[data-testid="buyer-checkout-security"]')).toContainText('Stripe');
    await expect(page.locator('[data-testid="buyer-checkout-security"]')).toContainText(
      'données bancaires ne transitent pas par IOX',
    );
  });

  test('offer ID non modifiable par le buyer', async ({ page }) => {
    await mockAuthRoutes(page);
    await mockRfqRoutes(page);
    await mockCheckoutRoutes(page);

    await loginAsRole(page, BUYER_USER, { expectUrl: /\/buyer$/ });
    await page.goto(`/buyer/payments/checkout/${RFQ_ID}`, { timeout: 60_000 });

    const offerInput = page.locator('[data-testid="buyer-checkout-offer-id"]');
    await expect(offerInput).toBeVisible({ timeout: 20_000 });
    // Tenter de modifier → doit rester inchangé
    await offerInput.fill('tampered-offer-id').catch(() => {});
    const value = await offerInput.inputValue();
    expect(value).toBe(OFFER_ID);
  });
});
