# PaymentProvider Seam Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the Stripe coupling from three payment services to a single `PaymentProvider` interface, so tests mock domain operations instead of the Stripe SDK structure.

**Architecture:** Create `PaymentProvider` interface with domain types + errors in `payments/provider/`. `StripePaymentAdapter` implements the interface and absorbs `stripe.factory.ts`. All three services (`PaymentsService`, `StripeOnboardingService`, `PaymentsWebhookService`) inject `PAYMENT_PROVIDER` token. `PaymentsWebhookService` gains `receiveRaw()` so webhook signature verification moves out of the controller.

**Tech Stack:** NestJS DI (`@Inject` token), Stripe SDK v22, Jest mocks with plain objects.

**Spec:** `docs/superpowers/specs/2026-05-18-payment-provider-seam-design.md`

---

## File Map

| Action | Path |
|--------|------|
| Create | `apps/backend/src/payments/provider/payment-provider.interface.ts` |
| Create | `apps/backend/src/payments/provider/payment-provider.errors.ts` |
| Create | `apps/backend/src/payments/provider/stripe/stripe-payment.adapter.ts` |
| Create | `apps/backend/src/payments/provider/stripe/stripe-payment.adapter.spec.ts` |
| Modify | `apps/backend/src/payments/payments.service.ts` |
| Modify | `apps/backend/src/payments/payments.service.spec.ts` |
| Modify | `apps/backend/src/payments/stripe-onboarding.service.ts` |
| Modify | `apps/backend/src/payments/stripe-onboarding.service.spec.ts` |
| Modify | `apps/backend/src/payments/payments-webhook.service.ts` |
| Modify | `apps/backend/src/payments/payments-webhook.service.spec.ts` |
| Modify | `apps/backend/src/payments/payments.controller.ts` |
| Modify | `apps/backend/src/payments/payments.controller.spec.ts` |
| Modify | `apps/backend/src/payments/payments.module.ts` |
| Delete | `apps/backend/src/payments/stripe.factory.ts` |

---

## Task 1: Foundation — Interface + Errors

**Files:**
- Create: `apps/backend/src/payments/provider/payment-provider.interface.ts`
- Create: `apps/backend/src/payments/provider/payment-provider.errors.ts`

No runtime behaviour — TypeScript compilation validates these.

- [ ] **Step 1: Create provider directory and interface file**

```bash
mkdir -p apps/backend/src/payments/provider/stripe
```

Create `apps/backend/src/payments/provider/payment-provider.interface.ts`:

```typescript
// PaymentProvider — seam entre les services payments et le SDK PSP.
// Toutes les opérations retournent des types IOX — aucun type Stripe ne fuit
// hors de l'adapter.

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

// ── Input types ──────────────────────────────────────────────────────────────

export interface CheckoutSessionParams {
  amountCents: number;
  /** Devise normalisée UPPERCASE (ex: 'EUR', 'USD'). */
  currency: string;
  productName: string;
  applicationFeeCents: number;
  /** stripeAccountId du seller Connect Express. */
  destinationAccountId: string;
  successUrl: string;
  cancelUrl: string;
  /** Metadata attachée au PaymentIntent ET à la session Checkout. */
  metadata: Record<string, string>;
}

export interface ConnectedAccountParams {
  /** Code pays ISO 3166-1 alpha-2 (ex: 'FR'). */
  country: string;
  email?: string;
  sellerProfileId: string;
  companyId: string;
}

export interface OnboardingLinkParams {
  stripeAccountId: string;
  returnUrl: string;
  refreshUrl: string;
}

export interface RefundParams {
  paymentIntentId: string;
  /** Si absent : remboursement total. */
  amountCents?: number;
}

// ── Output types ─────────────────────────────────────────────────────────────

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface RefundResult {
  refundId: string;
}

export interface AccountStatusFlags {
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  capabilities?: object | null;
  requirements?: { disabled_reason?: string | null } | null;
}

export interface PaymentEvent {
  id: string;
  type: string;
  data: { object: unknown };
}

// ── Interface ─────────────────────────────────────────────────────────────────

export interface PaymentProvider {
  /** Vrai si le PSP est configuré (clé API présente). */
  isConfigured(): boolean;

  /** Crée une Checkout Session. Retourne sessionId + URL de redirection. */
  createCheckoutSession(p: CheckoutSessionParams): Promise<CheckoutSessionResult>;

  /** Crée un remboursement total ou partiel. */
  createRefund(p: RefundParams): Promise<RefundResult>;

  /** Crée un compte Connect Express (onboarding seller). */
  createConnectedAccount(p: ConnectedAccountParams): Promise<{ accountId: string }>;

  /** Génère un AccountLink d'onboarding (valide ~5 min côté PSP). */
  generateOnboardingLink(p: OnboardingLinkParams): Promise<{ url: string; expiresAt: number }>;

  /** Récupère les flags de statut d'un compte connecté depuis le PSP. */
  retrieveAccountFlags(accountId: string): Promise<AccountStatusFlags>;

  /**
   * Vérifie la signature HMAC du webhook et retourne l'event parsé.
   * Throw WebhookSignatureError si la signature est invalide.
   */
  verifyWebhookEvent(payload: Buffer, signature: string, secret: string): PaymentEvent;
}
```

- [ ] **Step 2: Create errors file**

Create `apps/backend/src/payments/provider/payment-provider.errors.ts`:

```typescript
// Hiérarchie d'erreurs domain payments.
// Les adapters (ex: StripePaymentAdapter) catch les erreurs PSP spécifiques
// et les rethrow via ces classes — les services ne voient jamais d'erreurs Stripe.

/** Erreur de base — toutes les erreurs PSP en héritent. */
export class PaymentProviderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}

/** PSP non configuré (clé API absente). */
export class PaymentProviderNotConfiguredError extends PaymentProviderError {
  constructor() {
    super('Payment provider not configured. Set STRIPE_SECRET_KEY.');
    this.name = 'PaymentProviderNotConfiguredError';
  }
}

/** Paiement refusé par la banque ou la carte. */
export class PaymentDeclinedError extends PaymentProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'PaymentDeclinedError';
  }
}

/** Mauvaise configuration PSP (paramètres invalides envoyés au PSP). */
export class PaymentConfigError extends PaymentProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'PaymentConfigError';
  }
}

/** Signature webhook invalide ou absente. */
export class WebhookSignatureError extends PaymentProviderError {
  constructor(cause?: unknown) {
    super('Invalid webhook signature.', cause);
    this.name = 'WebhookSignatureError';
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/backend && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 erreurs (les nouveaux fichiers n'ont pas d'imports cassés).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/payments/provider/payment-provider.interface.ts \
        apps/backend/src/payments/provider/payment-provider.errors.ts
git commit -m "feat(payments): add PaymentProvider interface and domain errors"
```

---

## Task 2: StripePaymentAdapter — TDD sur mapError + isConfigured

**Files:**
- Create: `apps/backend/src/payments/provider/stripe/stripe-payment.adapter.spec.ts`
- Create: `apps/backend/src/payments/provider/stripe/stripe-payment.adapter.ts`

- [ ] **Step 1: Write failing tests for mapError + isConfigured**

Create `apps/backend/src/payments/provider/stripe/stripe-payment.adapter.spec.ts`:

```typescript
// Tests pour StripePaymentAdapter.
// On teste uniquement la logique pure de l'adapter :
//  - isConfigured() selon la présence de STRIPE_SECRET_KEY
//  - mapError() — mapping Stripe errors → domain errors
// Les appels Stripe réels (createCheckoutSession, etc.) sont des concerns
// d'intégration non testés unitairement ici.

import { ConfigService } from '@nestjs/config';
import { StripePaymentAdapter } from './stripe-payment.adapter';
import Stripe from 'stripe';
import {
  PaymentDeclinedError,
  PaymentConfigError,
  PaymentProviderError,
  PaymentProviderNotConfiguredError,
  WebhookSignatureError,
} from '../payment-provider.errors';

function makeAdapter(key?: string): StripePaymentAdapter {
  const config = { get: jest.fn().mockReturnValue(key) } as unknown as ConfigService;
  return new StripePaymentAdapter(config);
}

/** Crée un faux objet qui passe le `instanceof` check sans appeler le constructeur Stripe. */
function fakeStripeError<T>(Ctor: new (...args: unknown[]) => T, message: string): T {
  const err = Object.create(Ctor.prototype) as T & { message: string };
  err.message = message;
  return err;
}

describe('StripePaymentAdapter', () => {
  describe('isConfigured()', () => {
    it('returns false when STRIPE_SECRET_KEY is absent', () => {
      expect(makeAdapter(undefined).isConfigured()).toBe(false);
    });

    it('returns false when STRIPE_SECRET_KEY is empty string', () => {
      expect(makeAdapter('').isConfigured()).toBe(false);
    });

    it('returns true when STRIPE_SECRET_KEY is present', () => {
      // sk_test_xxx instancie le SDK localement sans appel réseau
      expect(makeAdapter('sk_test_abc123').isConfigured()).toBe(true);
    });
  });

  describe('mapError()', () => {
    let adapter: StripePaymentAdapter;
    beforeEach(() => {
      adapter = makeAdapter(undefined);
    });

    it('StripeCardError → PaymentDeclinedError', () => {
      const err = fakeStripeError(Stripe.errors.StripeCardError, 'Your card was declined.');
      const mapped = adapter.mapError(err);
      expect(mapped).toBeInstanceOf(PaymentDeclinedError);
      expect(mapped.message).toBe('Your card was declined.');
    });

    it('StripeInvalidRequestError → PaymentConfigError', () => {
      const err = fakeStripeError(Stripe.errors.StripeInvalidRequestError, 'Invalid amount.');
      const mapped = adapter.mapError(err);
      expect(mapped).toBeInstanceOf(PaymentConfigError);
      expect(mapped.message).toBe('Invalid amount.');
    });

    it('StripeSignatureVerificationError → WebhookSignatureError', () => {
      const err = fakeStripeError(Stripe.errors.StripeSignatureVerificationError, 'No signatures found.');
      const mapped = adapter.mapError(err);
      expect(mapped).toBeInstanceOf(WebhookSignatureError);
    });

    it('PaymentProviderError passes through unchanged', () => {
      const err = new PaymentProviderNotConfiguredError();
      expect(adapter.mapError(err)).toBe(err);
    });

    it('generic Error → PaymentProviderError with same message', () => {
      const err = new Error('network timeout');
      const mapped = adapter.mapError(err);
      expect(mapped).toBeInstanceOf(PaymentProviderError);
      expect(mapped.message).toBe('network timeout');
    });

    it('non-Error value → PaymentProviderError with generic message', () => {
      const mapped = adapter.mapError('some string error');
      expect(mapped).toBeInstanceOf(PaymentProviderError);
      expect(mapped.message).toBe('Unknown PSP error');
    });
  });
});
```

- [ ] **Step 2: Run tests — expect failures (adapter not yet created)**

```bash
cd apps/backend && npx jest provider/stripe/stripe-payment.adapter.spec.ts --no-coverage 2>&1 | tail -20
```
Expected: `Cannot find module './stripe-payment.adapter'`

- [ ] **Step 3: Create StripePaymentAdapter**

Create `apps/backend/src/payments/provider/stripe/stripe-payment.adapter.ts`:

```typescript
// StripePaymentAdapter — seul fichier qui importe le SDK Stripe.
// Traduit les params domain → SDK Stripe, et les réponses/erreurs SDK → domain.

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  PaymentProvider,
  CheckoutSessionParams,
  CheckoutSessionResult,
  ConnectedAccountParams,
  OnboardingLinkParams,
  AccountStatusFlags,
  RefundParams,
  RefundResult,
  PaymentEvent,
} from '../payment-provider.interface';
import {
  PaymentProviderError,
  PaymentProviderNotConfiguredError,
  PaymentDeclinedError,
  PaymentConfigError,
  WebhookSignatureError,
} from '../payment-provider.errors';

@Injectable()
export class StripePaymentAdapter implements PaymentProvider {
  private readonly stripe: Stripe | null;

  constructor(config: ConfigService) {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    this.stripe =
      key && key.length > 0
        ? new Stripe(key, {
            typescript: true,
            appInfo: { name: 'iox-marketplace', version: '1.0.0' },
          })
        : null;
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  private sdk(): Stripe {
    if (!this.stripe) throw new PaymentProviderNotConfiguredError();
    return this.stripe;
  }

  async createCheckoutSession(p: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    try {
      const session = await this.sdk().checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: p.currency.toLowerCase(),
              product_data: { name: p.productName },
              unit_amount: p.amountCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: p.applicationFeeCents,
          transfer_data: { destination: p.destinationAccountId },
          metadata: p.metadata,
        },
        success_url: p.successUrl,
        cancel_url: p.cancelUrl,
        metadata: p.metadata,
      });
      return { sessionId: session.id, url: session.url ?? '' };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async createRefund(p: RefundParams): Promise<RefundResult> {
    try {
      const params: Stripe.RefundCreateParams = {
        payment_intent: p.paymentIntentId,
        reason: 'requested_by_customer',
      };
      if (p.amountCents !== undefined) params.amount = p.amountCents;
      const refund = await this.sdk().refunds.create(params);
      return { refundId: refund.id };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async createConnectedAccount(p: ConnectedAccountParams): Promise<{ accountId: string }> {
    try {
      const account = await this.sdk().accounts.create({
        type: 'express',
        country: p.country,
        email: p.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'company',
        metadata: {
          seller_profile_id: p.sellerProfileId,
          company_id: p.companyId,
        },
      });
      return { accountId: account.id };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async generateOnboardingLink(
    p: OnboardingLinkParams,
  ): Promise<{ url: string; expiresAt: number }> {
    try {
      const link = await this.sdk().accountLinks.create({
        account: p.stripeAccountId,
        type: 'account_onboarding',
        return_url: p.returnUrl,
        refresh_url: p.refreshUrl,
      });
      return { url: link.url, expiresAt: link.expires_at };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async retrieveAccountFlags(accountId: string): Promise<AccountStatusFlags> {
    try {
      const account = await this.sdk().accounts.retrieve(accountId);
      return {
        detailsSubmitted: account.details_submitted ?? false,
        chargesEnabled: account.charges_enabled ?? false,
        payoutsEnabled: account.payouts_enabled ?? false,
        capabilities: account.capabilities ? (account.capabilities as object) : null,
        requirements: account.requirements
          ? (account.requirements as { disabled_reason?: string | null })
          : null,
      };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  verifyWebhookEvent(payload: Buffer, signature: string, secret: string): PaymentEvent {
    try {
      const event = this.sdk().webhooks.constructEvent(payload, signature, secret);
      return {
        id: event.id,
        type: event.type,
        data: { object: event.data.object },
      };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  /** Visible pour les tests unitaires. */
  mapError(err: unknown): PaymentProviderError {
    if (err instanceof PaymentProviderError) return err;
    if (err instanceof Stripe.errors.StripeCardError) {
      return new PaymentDeclinedError(err.message, err);
    }
    if (err instanceof Stripe.errors.StripeInvalidRequestError) {
      return new PaymentConfigError(err.message, err);
    }
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      return new WebhookSignatureError(err);
    }
    return new PaymentProviderError(
      err instanceof Error ? err.message : 'Unknown PSP error',
      err,
    );
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd apps/backend && npx jest provider/stripe/stripe-payment.adapter.spec.ts --no-coverage 2>&1 | tail -10
```
Expected: `Tests: 9 passed, 9 total`

- [ ] **Step 5: TypeScript check**

```bash
cd apps/backend && npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 erreurs.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/payments/provider/
git commit -m "feat(payments): add StripePaymentAdapter with domain error mapping"
```

---

## Task 3: Migrate PaymentsService

**Files:**
- Modify: `apps/backend/src/payments/payments.service.ts`
- Modify: `apps/backend/src/payments/payments.service.spec.ts`

- [ ] **Step 1: Update payments.service.spec.ts — new mock**

Replace the entire import block and `makeStripeMock` in `payments.service.spec.ts`:

```typescript
// Remplacer les lignes 1-38 par :

// PAY-1 phase 1 LOT 1+3 — Spec PaymentsService.
// PAY-2 — refund specs.

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { APPLICATION_FEE_PERCENT, PaymentsService } from './payments.service';
import { PrismaService } from '../database/prisma.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import { AuditService } from '../audit/audit.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './provider/payment-provider.interface';
import {
  PaymentStatus,
  QuoteRequestStatus,
  UserRole,
  RequestUser,
} from '@iox/shared';

const createRefundMock = jest.fn().mockResolvedValue({ refundId: 're_test_123' });

function makeProviderMock(opts: { configured?: boolean } = {}): PaymentProvider {
  return {
    isConfigured: jest.fn().mockReturnValue(opts.configured ?? true),
    createCheckoutSession: jest.fn().mockResolvedValue({
      sessionId: 'cs_test_abc',
      url: 'https://checkout.stripe.com/c/pay/cs_test_abc',
    }),
    createRefund: createRefundMock,
    createConnectedAccount: jest.fn().mockResolvedValue({ accountId: 'acct_test' }),
    generateOnboardingLink: jest.fn().mockResolvedValue({ url: 'https://stripe.com/ob', expiresAt: 9999 }),
    retrieveAccountFlags: jest.fn().mockResolvedValue({ detailsSubmitted: true, chargesEnabled: true, payoutsEnabled: true }),
    verifyWebhookEvent: jest.fn(),
  };
}
```

Replace the `beforeEach` provider line (line 83) — change `STRIPE_CLIENT` → `PAYMENT_PROVIDER` and mock factory:

```typescript
// Remplacer :
//   { provide: STRIPE_CLIENT, useValue: makeStripeMock() },
// Par :
        { provide: PAYMENT_PROVIDER, useValue: makeProviderMock() },
```

Replace the `refund` test assertions (lines 383-395) — change `refundsCreateMock` expectations:

```typescript
// Remplacer :
//   expect(refundsCreateMock).toHaveBeenCalledWith(
//     expect.objectContaining({
//       payment_intent: 'pi_test',
//       reason: 'requested_by_customer',
//     }),
//   );
// Par :
      expect(createRefundMock).toHaveBeenCalledWith({
        paymentIntentId: 'pi_test',
        amountCents: undefined,
      });
```

Replace the `partial refund` test assertion (line 431):

```typescript
// Remplacer :
//   expect(refundsCreateMock).toHaveBeenCalledWith(
//     expect.objectContaining({
//       payment_intent: 'pi_test',
//       amount: 5000,
//     }),
//   );
// Par :
      expect(createRefundMock).toHaveBeenCalledWith({
        paymentIntentId: 'pi_test',
        amountCents: 5000,
      });
```

- [ ] **Step 2: Run spec — expect failures (service not yet migrated)**

```bash
cd apps/backend && npx jest payments/payments.service.spec.ts --no-coverage 2>&1 | tail -15
```
Expected: errors about `PAYMENT_PROVIDER` token not found or wrong injections.

- [ ] **Step 3: Migrate payments.service.ts**

Replace the import block at the top:

```typescript
// Remplacer :
//   import { STRIPE_CLIENT, type StripeClientWrapper } from './stripe.factory';
// Par :
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from './provider/payment-provider.interface';
```

Also remove `toStripeCurrency` from the money import (no longer needed in the service):

```typescript
// Remplacer :
//   import { normalizeCurrency, toStripeCurrency } from '../common/money';
// Par :
import { normalizeCurrency } from '../common/money';
```

Replace constructor injection:

```typescript
// Remplacer :
//   @Inject(STRIPE_CLIENT) private readonly stripeWrapper: StripeClientWrapper,
// Par :
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
```

Replace `createCheckoutSession` — the Stripe call block (lines 74-181). Replace the entire method body starting from the `isConfigured` check through to the return:

```typescript
  async createCheckoutSession(input: CreateCheckoutSessionInput, actor: RequestUser) {
    if (!this.provider.isConfigured()) {
      throw new BadRequestException(
        'Stripe non configuré côté serveur. Contacter l\'admin.',
      );
    }

    // 1. Validation RFQ
    const rfq = await this.prisma.quoteRequest.findUnique({
      where: { id: input.quoteRequestId },
      include: {
        marketplaceOffer: {
          include: {
            sellerProfile: { include: { stripeAccount: true } },
          },
        },
      },
    });
    if (!rfq) throw new NotFoundException('RFQ introuvable');

    QuoteRequestFsm.assertPayable(rfq.status as QuoteRequestStatus);

    if (actor.id !== rfq.buyerUserId) {
      throw new BadRequestException('Cette RFQ n\'appartient pas à votre compte');
    }

    const sellerProfile = rfq.marketplaceOffer.sellerProfile;
    const stripeAccount = sellerProfile.stripeAccount;
    if (!stripeAccount || !stripeAccount.chargesEnabled) {
      throw new BadRequestException(
        'Le vendeur n\'est pas configuré pour les paiements Stripe.',
      );
    }

    let currency: string;
    try {
      currency = normalizeCurrency(input.currency);
    } catch {
      throw new BadRequestException(
        `Devise non supportée : ${input.currency ?? '(vide)'}. Devises acceptées : EUR, USD`,
      );
    }

    const applicationFeeCents = this.computeApplicationFeeCents(input.amountCents);

    // 3. Crée Payment row PENDING
    const payment = await this.prisma.payment.create({
      data: {
        quoteRequestId: input.quoteRequestId,
        marketplaceOfferId: input.marketplaceOfferId,
        sellerProfileId: sellerProfile.id,
        buyerCompanyId: rfq.buyerCompanyId,
        buyerUserId: actor.id,
        amountCents: input.amountCents,
        currency,
        applicationFeeCents,
        status: PaymentStatus.PENDING,
      },
    });

    // 4. Délègue la création session au provider (aucun SDK Stripe ici)
    const sessionResult = await this.provider.createCheckoutSession({
      amountCents: input.amountCents,
      currency,
      productName: rfq.marketplaceOffer.title ?? 'Commande IOX Marketplace',
      applicationFeeCents,
      destinationAccountId: stripeAccount.stripeAccountId,
      successUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
      metadata: {
        payment_id: payment.id,
        quote_request_id: input.quoteRequestId,
        marketplace_offer_id: input.marketplaceOfferId,
      },
    });

    // 5. Persist sessionId sur Payment row
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { stripeCheckoutSessionId: sessionResult.sessionId },
    });

    this.logger.log(
      `Checkout session created paymentId=${payment.id} sessionId=${sessionResult.sessionId} amountCents=${input.amountCents} appFee=${applicationFeeCents}`,
    );

    return {
      paymentId: payment.id,
      sessionId: sessionResult.sessionId,
      checkoutUrl: sessionResult.url,
    };
  }
```

Replace the `refund` method — the Stripe call block:

```typescript
  async refund(id: string, dto: RefundPaymentDto, actor: RequestUser) {
    if (!this.provider.isConfigured()) {
      throw new BadRequestException(
        'Stripe non configuré côté serveur. Contacter l\'admin.',
      );
    }

    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Paiement introuvable');

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException(
        `Remboursement impossible : statut ${payment.status} (requis: SUCCEEDED)`,
      );
    }

    if (!this.ownership.isStaff(actor)) {
      if (actor.role === UserRole.MARKETPLACE_SELLER) {
        if (!(actor.sellerProfileIds ?? []).includes(payment.sellerProfileId)) {
          throw new ForbiddenException('Ce paiement n\'appartient pas à votre profil vendeur');
        }
      } else {
        throw new ForbiddenException('Rôle non autorisé pour le remboursement');
      }
    }

    const refundResult = await this.provider.createRefund({
      paymentIntentId: payment.stripePaymentIntentId ?? '',
      amountCents: dto.amountCents,
    });

    const existingMeta =
      (payment.metadataJson as Record<string, unknown> | null) ?? {};
    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.REFUNDED,
        metadataJson: {
          ...existingMeta,
          refundId: refundResult.refundId,
          refundReason: dto.reason ?? null,
          refundAmountCents: dto.amountCents ?? payment.amountCents,
        },
      },
    });

    await this.audit.log({
      action: 'PAYMENT_REFUNDED',
      entityType: EntityType.PAYMENT,
      entityId: id,
      userId: actor.id,
      previousData: { status: payment.status },
      newData: {
        status: PaymentStatus.REFUNDED,
        refundId: refundResult.refundId,
        refundAmountCents: dto.amountCents ?? payment.amountCents,
      },
      notes: dto.reason ?? undefined,
    });

    this.logger.log(
      `Payment REFUNDED paymentId=${id} refundId=${refundResult.refundId} amountCents=${dto.amountCents ?? payment.amountCents}`,
    );

    return updated;
  }
```

- [ ] **Step 4: Run spec — expect pass**

```bash
cd apps/backend && npx jest payments/payments.service.spec.ts --no-coverage 2>&1 | tail -10
```
Expected: `Tests: X passed` (same count as before).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/payments/payments.service.ts \
        apps/backend/src/payments/payments.service.spec.ts
git commit -m "refactor(payments): migrate PaymentsService to PaymentProvider seam"
```

---

## Task 4: Migrate StripeOnboardingService

**Files:**
- Modify: `apps/backend/src/payments/stripe-onboarding.service.ts`
- Modify: `apps/backend/src/payments/stripe-onboarding.service.spec.ts`

- [ ] **Step 1: Update stripe-onboarding.service.spec.ts — new mock**

Replace the import block and `makeStripeMock` (lines 1-41):

```typescript
// PAY-1 phase 1 LOT 1 — Spec StripeOnboardingService.

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StripeOnboardingService } from './stripe-onboarding.service';
import { PrismaService } from '../database/prisma.service';
import { SellerOwnershipService } from '../common/services/seller-ownership.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from './provider/payment-provider.interface';
import { SellerStripeAccountStatus } from '@iox/shared';

const ownershipMock = {
  isStaff: () => true,
  assertSellerProfileOwnership: jest.fn().mockResolvedValue(undefined),
};

function makeProviderMock(opts: { configured?: boolean } = {}): PaymentProvider {
  return {
    isConfigured: jest.fn().mockReturnValue(opts.configured ?? true),
    createConnectedAccount: jest.fn().mockResolvedValue({ accountId: 'acct_test_123' }),
    generateOnboardingLink: jest.fn().mockResolvedValue({
      url: 'https://stripe.com/onboarding/abc',
      expiresAt: 1234567890,
    }),
    retrieveAccountFlags: jest.fn().mockResolvedValue({
      detailsSubmitted: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      capabilities: { transfers: 'active' },
      requirements: { disabled_reason: null },
    }),
    createCheckoutSession: jest.fn(),
    createRefund: jest.fn(),
    verifyWebhookEvent: jest.fn(),
  };
}
```

In `beforeEach`, replace the provider line:

```typescript
// Remplacer :
//   { provide: STRIPE_CLIENT, useValue: makeStripeMock() },
// Par :
        { provide: PAYMENT_PROVIDER, useValue: makeProviderMock() },
```

In `generateOnboardingLink — throw BadRequestException si Stripe non configuré` test, replace the module setup:

```typescript
// Remplacer tout le bloc Test.createTestingModule dans ce test par :
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StripeOnboardingService,
          { provide: PrismaService, useValue: prisma },
          { provide: SellerOwnershipService, useValue: ownershipMock },
          { provide: PAYMENT_PROVIDER, useValue: makeProviderMock({ configured: false }) },
        ],
      }).compile();
      const localService = module.get(StripeOnboardingService);
```

- [ ] **Step 2: Run spec — expect failures**

```bash
cd apps/backend && npx jest payments/stripe-onboarding.service.spec.ts --no-coverage 2>&1 | tail -15
```
Expected: token errors or wrong injections.

- [ ] **Step 3: Migrate stripe-onboarding.service.ts**

Replace the import block:

```typescript
// Remplacer :
//   import { STRIPE_CLIENT, type StripeClientWrapper } from './stripe.factory';
// Par :
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from './provider/payment-provider.interface';
```

Replace constructor injection:

```typescript
// Remplacer :
//   @Inject(STRIPE_CLIENT) private readonly stripeWrapper: StripeClientWrapper,
// Par :
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
```

Replace `createOrGetStripeAccount` — Stripe call block:

```typescript
    if (!this.provider.isConfigured()) {
      throw new BadRequestException(
        'Stripe non configuré côté serveur. Contacter l\'admin.',
      );
    }

    const stripe = this.stripeWrapper.client(); // ← SUPPRIMER cette ligne

    const account = await stripe.accounts.create({ ... }); // ← REMPLACER par :
    const { accountId } = await this.provider.createConnectedAccount({
      country: seller.country ?? 'FR',
      email: seller.company?.email ?? undefined,
      sellerProfileId,
      companyId: seller.companyId,
    });

    this.logger.log(
      `Stripe Express account created sellerProfileId=${sellerProfileId} stripeAccountId=${accountId}`,
    );

    return this.prisma.sellerStripeAccount.create({
      data: {
        sellerProfileId,
        stripeAccountId: accountId,  // ← était account.id
        status: SellerStripeAccountStatus.PENDING_ONBOARDING,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      },
    });
```

Replace `generateOnboardingLink` — Stripe call block:

```typescript
    // Remplacer :
    //   const stripe = this.stripeWrapper.client();
    //   const link = await stripe.accountLinks.create({ ... });
    //   return { url: link.url, expiresAt: link.expires_at };
    // Par :
    const result = await this.provider.generateOnboardingLink({
      stripeAccountId: account.stripeAccountId,
      returnUrl,
      refreshUrl,
    });

    this.logger.log(
      `Onboarding link generated sellerProfileId=${sellerProfileId} expiresAt=${result.expiresAt}`,
    );
    return result;
```

Replace `syncAccountStatus` — Stripe call block:

```typescript
    // Remplacer :
    //   const stripe = this.stripeWrapper.client();
    //   const account = await stripe.accounts.retrieve(existing.stripeAccountId);
    //   const status = this.computeStatus({ detailsSubmitted: account.details_submitted ?? false, ... });
    //   return this.prisma.sellerStripeAccount.update({ ..., data: { ..., capabilitiesJson: account.capabilities, ... } });
    // Par :
    const flags = await this.provider.retrieveAccountFlags(existing.stripeAccountId);
    const status = this.computeStatus(flags);

    return this.prisma.sellerStripeAccount.update({
      where: { sellerProfileId },
      data: {
        status,
        chargesEnabled: flags.chargesEnabled,
        payoutsEnabled: flags.payoutsEnabled,
        detailsSubmitted: flags.detailsSubmitted,
        capabilitiesJson: flags.capabilities ?? null,
        requirementsJson: flags.requirements ?? null,
      },
    });
```

Also update the `isConfigured` checks in `generateOnboardingLink` and `syncAccountStatus`:

```typescript
// Dans generateOnboardingLink et syncAccountStatus, remplacer :
//   if (!this.stripeWrapper.isConfigured())
// Par :
    if (!this.provider.isConfigured())
```

- [ ] **Step 4: Run spec — expect pass**

```bash
cd apps/backend && npx jest payments/stripe-onboarding.service.spec.ts --no-coverage 2>&1 | tail -10
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/payments/stripe-onboarding.service.ts \
        apps/backend/src/payments/stripe-onboarding.service.spec.ts
git commit -m "refactor(payments): migrate StripeOnboardingService to PaymentProvider seam"
```

---

## Task 5: Migrate PaymentsWebhookService — add receiveRaw

**Files:**
- Modify: `apps/backend/src/payments/payments-webhook.service.ts`
- Modify: `apps/backend/src/payments/payments-webhook.service.spec.ts`

- [ ] **Step 1: Add receiveRaw tests to payments-webhook.service.spec.ts**

Add `ConfigService` and `PAYMENT_PROVIDER` providers to `beforeEach`, then add a new `describe('receiveRaw')` block at the end of the file (before the closing `}`):

In `beforeEach`, add two providers:

```typescript
// Ajouter dans la liste providers de Test.createTestingModule :
        {
          provide: 'PAYMENT_PROVIDER',
          useValue: {
            verifyWebhookEvent: jest.fn(),
            isConfigured: jest.fn().mockReturnValue(true),
            createCheckoutSession: jest.fn(),
            createRefund: jest.fn(),
            createConnectedAccount: jest.fn(),
            generateOnboardingLink: jest.fn(),
            retrieveAccountFlags: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('whsec_test') },
        },
```

Also add at the top of the spec file:

```typescript
import { ConfigService } from '@nestjs/config';
import { PAYMENT_PROVIDER, type PaymentProvider } from './provider/payment-provider.interface';
import { WebhookSignatureError } from './provider/payment-provider.errors';
```

Add in `beforeEach` after `service = module.get(PaymentsWebhookService)`:

```typescript
    providerMock = module.get<PaymentProvider>(PAYMENT_PROVIDER as unknown as string);
```

Add `let providerMock: PaymentProvider;` to the top-level describe block vars.

Then add after all existing tests:

```typescript
  // ── receiveRaw — vérification signature + dispatch ────────────────

  describe('receiveRaw', () => {
    it('valid signature → dispatches event, returns result', async () => {
      const fakeEvent = {
        id: 'evt_raw_1',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_raw', metadata: { payment_id: 'pay_raw' }, latest_charge: 'ch_raw', amount: 5000 } },
      };
      (providerMock.verifyWebhookEvent as jest.Mock).mockReturnValue(fakeEvent);

      const res = await service.receiveRaw(Buffer.from('{}'), 'sig_valid');

      expect(providerMock.verifyWebhookEvent).toHaveBeenCalledWith(
        Buffer.from('{}'),
        'sig_valid',
        'whsec_test',
      );
      expect(res.handled).toBe(true);
      expect(res.action).toBe('payment-succeeded');
      expect(res.eventType).toBe('payment_intent.succeeded');
    });

    it('WebhookSignatureError from provider bubbles up', async () => {
      (providerMock.verifyWebhookEvent as jest.Mock).mockImplementation(() => {
        throw new WebhookSignatureError();
      });
      await expect(service.receiveRaw(Buffer.from('{}'), 'bad_sig')).rejects.toBeInstanceOf(
        WebhookSignatureError,
      );
    });

    it('unknown event type → handled=false, action=ignored', async () => {
      const unknownEvent = { id: 'evt_u', type: 'invoice.created', data: { object: {} } };
      (providerMock.verifyWebhookEvent as jest.Mock).mockReturnValue(unknownEvent);

      const res = await service.receiveRaw(Buffer.from('{}'), 'sig_ok');
      expect(res.handled).toBe(false);
      expect(res.action).toBe('ignored');
    });
  });
```

- [ ] **Step 2: Run spec — expect failures on receiveRaw tests**

```bash
cd apps/backend && npx jest payments/payments-webhook.service.spec.ts --no-coverage 2>&1 | tail -20
```
Expected: existing tests pass, `receiveRaw` tests fail with `service.receiveRaw is not a function`.

- [ ] **Step 3: Update payments-webhook.service.ts**

Add imports at the top:

```typescript
// Ajouter :
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
  type PaymentEvent,
} from './provider/payment-provider.interface';
```

Update constructor — add `PaymentProvider` + `ConfigService` injections:

```typescript
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly onboarding: StripeOnboardingService,
    private readonly notifEmail: NotifEmailService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    config: ConfigService,
  ) {
    this.webhookSecret = config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
  }
```

Add `receiveRaw` method after the constructor (before `handleEvent`):

```typescript
  /**
   * Point d'entrée webhook de bout en bout.
   * Vérifie la signature via le provider, puis dispatche l'event.
   * Throw WebhookSignatureError si la signature est invalide — le controller
   * est responsable de mapper cette erreur en BadRequestException HTTP.
   */
  async receiveRaw(
    payload: Buffer,
    signature: string,
  ): Promise<{ handled: boolean; action: string; eventType: string }> {
    const event = this.provider.verifyWebhookEvent(payload, signature, this.webhookSecret);
    this.logger.log(`Webhook received type=${event.type} id=${event.id}`);
    const result = await this.handleEvent(event);
    return { ...result, eventType: event.type };
  }
```

Update `handleEvent` signature to accept `PaymentEvent` (replace the local interface with the imported one):

```typescript
  // Remplacer le type du paramètre event dans handleEvent :
  async handleEvent(event: PaymentEvent): Promise<{ handled: boolean; action: string }> {
```

Remove **only** the local `StripeEventBase` interface declaration at the top of the file (replaced by imported `PaymentEvent`). Keep `StripePaymentIntentLike` and `StripeAccountLike` — they're still used by the private handlers.

- [ ] **Step 4: Run spec — expect all pass**

```bash
cd apps/backend && npx jest payments/payments-webhook.service.spec.ts --no-coverage 2>&1 | tail -10
```
Expected: all tests pass (existing + 3 new receiveRaw tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/payments/payments-webhook.service.ts \
        apps/backend/src/payments/payments-webhook.service.spec.ts
git commit -m "refactor(payments): add receiveRaw to WebhookService, inject PaymentProvider"
```

---

## Task 6: Simplify PaymentsController

**Files:**
- Modify: `apps/backend/src/payments/payments.controller.ts`
- Modify: `apps/backend/src/payments/payments.controller.spec.ts`

- [ ] **Step 1: Update payments.controller.spec.ts**

Replace the `stripeWrapper` setup + `STRIPE_CLIENT` provider in `beforeEach`:

```typescript
// Remplacer dans le fichier spec :
// 1. Supprimer : import { STRIPE_CLIENT, type StripeClientWrapper } from './stripe.factory';
// 2. Ajouter : import { WebhookSignatureError, PaymentProviderNotConfiguredError } from './provider/payment-provider.errors';
// 3. Dans beforeEach, remplacer :
//      const webhookSvc = {
//        handleEvent: jest.fn().mockResolvedValue({ handled: true, action: 'payment-succeeded' }),
//      };
//      stripeWrapper = { ... };
//      const config = { get: jest.fn().mockReturnValue('whsec_test') };
// Par :
    const webhookSvc = {
      receiveRaw: jest.fn().mockResolvedValue({
        handled: true,
        action: 'payment-succeeded',
        eventType: 'payment_intent.succeeded',
      }),
    };
// 4. Dans les providers, supprimer :
//      { provide: ConfigService, useValue: config },
//      { provide: STRIPE_CLIENT, useValue: stripeWrapper },
// 5. Supprimer la variable `let stripeWrapper: StripeClientWrapper;`
```

Replace the three webhook tests:

```typescript
  it('POST webhook : signature manquante → 400', async () => {
    const req = { rawBody: Buffer.from('{}') } as unknown as Request;
    await expect(controller.webhook(undefined, req)).rejects.toThrow(BadRequestException);
  });

  it('POST webhook : signature valide → 200 + type dans réponse', async () => {
    const req = { rawBody: Buffer.from('{}') } as unknown as Request;
    const res = await controller.webhook('sig_valid', req);
    expect(res.received).toBe(true);
    expect(res.type).toBe('payment_intent.succeeded');
  });

  it('POST webhook : WebhookSignatureError → 400', async () => {
    const webhookSvc = controller['webhookHandler'] as { receiveRaw: jest.Mock };
    webhookSvc.receiveRaw.mockRejectedValueOnce(new WebhookSignatureError());
    const req = { rawBody: Buffer.from('{}') } as unknown as Request;
    await expect(controller.webhook('sig_bad', req)).rejects.toThrow(BadRequestException);
  });
```

- [ ] **Step 2: Run spec — expect failures**

```bash
cd apps/backend && npx jest payments/payments.controller.spec.ts --no-coverage 2>&1 | tail -15
```
Expected: token/method errors on `STRIPE_CLIENT` / `handleEvent`.

- [ ] **Step 3: Update payments.controller.ts**

Remove from imports:
```typescript
// Supprimer :
import { Inject } from '@nestjs/common';  // seulement si plus utilisé ailleurs
import { STRIPE_CLIENT, type StripeClientWrapper } from './stripe.factory';
```

Remove from constructor:
```typescript
// Supprimer :
//   private readonly config: ConfigService,
//   @Inject(STRIPE_CLIENT) private readonly stripeWrapper: StripeClientWrapper,
```

Add at the top:
```typescript
import {
  WebhookSignatureError,
  PaymentProviderNotConfiguredError,
} from './provider/payment-provider.errors';
```

Replace the entire `webhook` method:

```typescript
  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook Stripe (signature requise dans header stripe-signature)',
    description:
      '**Endpoint interne — NE PAS appeler depuis le frontend.** ' +
      'Reçoit les events Stripe (payment_intent.succeeded, checkout.session.completed, ' +
      'account.updated, etc.). ' +
      'La signature HMAC dans le header `stripe-signature` est vérifiée avec STRIPE_WEBHOOK_SECRET. ' +
      'Si la vérification échoue → 400. ' +
      'Events traités : payment_intent.succeeded/payment_failed, checkout.session.completed, account.updated.',
  })
  @ApiHeader({
    name: 'stripe-signature',
    required: true,
    description: 'Signature HMAC Stripe (générée par Stripe, vérifiée côté backend)',
  })
  @ApiSecurity({})
  @ApiOkResponse({ type: WebhookAckDto })
  @ApiBadRequestResponse({ description: 'Signature manquante ou invalide | Body raw indisponible' })
  async webhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: Request,
  ) {
    if (!signature) {
      throw new BadRequestException('Signature Stripe manquante');
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      throw new BadRequestException('Body raw indisponible (raw-body parser non câblé)');
    }

    let result: { handled: boolean; action: string; eventType: string };
    try {
      result = await this.webhookHandler.receiveRaw(rawBody, signature);
    } catch (err) {
      if (err instanceof WebhookSignatureError) {
        this.logger.warn(`Webhook signature verification failed: ${err.message}`);
        throw new BadRequestException(`Webhook signature invalide: ${err.message}`);
      }
      if (err instanceof PaymentProviderNotConfiguredError) {
        throw new BadRequestException('Stripe non configuré côté serveur');
      }
      throw err;
    }

    return { received: true, type: result.eventType, ...result };
  }
```

- [ ] **Step 4: Run spec — expect pass**

```bash
cd apps/backend && npx jest payments/payments.controller.spec.ts --no-coverage 2>&1 | tail -10
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/payments/payments.controller.ts \
        apps/backend/src/payments/payments.controller.spec.ts
git commit -m "refactor(payments): simplify controller webhook — delegate to WebhookService.receiveRaw"
```

---

## Task 7: Wire Module + Delete stripe.factory.ts

**Files:**
- Modify: `apps/backend/src/payments/payments.module.ts`
- Delete: `apps/backend/src/payments/stripe.factory.ts`

- [ ] **Step 1: Update payments.module.ts**

Replace the entire file:

```typescript
// PAY-1 phase 1 — Payments module.
// PAY-2 — +AuditModule, +NotifEmailModule, +InvoicesService, +InvoicesController.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { AuditModule } from '../audit/audit.module';
import { NotifEmailModule } from '../notif-email/notif-email.module';
import { PaymentsController } from './payments.controller';
import { InvoicesController } from './invoices.controller';
import { PaymentsService } from './payments.service';
import { PaymentsWebhookService } from './payments-webhook.service';
import { StripeOnboardingService } from './stripe-onboarding.service';
import { InvoicesService } from './invoices.service';
import { PAYMENT_PROVIDER } from './provider/payment-provider.interface';
import { StripePaymentAdapter } from './provider/stripe/stripe-payment.adapter';

@Module({
  imports: [ConfigModule, DatabaseModule, CommonModule, AuditModule, NotifEmailModule],
  controllers: [PaymentsController, InvoicesController],
  providers: [
    PaymentsService,
    PaymentsWebhookService,
    StripeOnboardingService,
    InvoicesService,
    {
      provide: PAYMENT_PROVIDER,
      useClass: StripePaymentAdapter,
    },
  ],
  exports: [PaymentsService, PaymentsWebhookService, StripeOnboardingService, InvoicesService],
})
export class PaymentsModule {}
```

- [ ] **Step 2: Delete stripe.factory.ts**

```bash
rm apps/backend/src/payments/stripe.factory.ts
```

- [ ] **Step 3: TypeScript check — no remaining references to stripe.factory**

```bash
cd apps/backend && npx tsc --noEmit 2>&1
```
Expected: 0 erreurs. If `stripe.factory` is referenced anywhere, `tsc` will report it.

Also verify no stray imports:
```bash
grep -r "stripe.factory" apps/backend/src/ 2>/dev/null
```
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/payments/payments.module.ts
git rm apps/backend/src/payments/stripe.factory.ts
git commit -m "refactor(payments): wire PAYMENT_PROVIDER in module, remove stripe.factory.ts"
```

---

## Task 8: Full Verification

- [ ] **Step 1: Run full backend test suite**

```bash
cd apps/backend && npx jest --no-coverage 2>&1 | tail -20
```
Expected: `Test Suites: X passed` — même nombre qu'avant, 0 failed. Le nombre total de tests augmente de 9 (3 receiveRaw + 6 adapter).

- [ ] **Step 2: TypeScript clean**

```bash
cd apps/backend && npx tsc --noEmit 2>&1
```
Expected: `exit 0`, 0 erreurs.

- [ ] **Step 3: Verify no Stripe import outside adapter**

```bash
grep -r "from 'stripe'" apps/backend/src/ --include="*.ts" | grep -v "stripe-payment.adapter"
```
Expected: no output (aucun fichier hors de l'adapter n'importe le SDK Stripe).

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "test(payments): full suite green — PaymentProvider seam complete"
```
