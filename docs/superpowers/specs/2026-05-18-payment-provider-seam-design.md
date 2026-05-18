# Design — PaymentProvider seam

**Date :** 2026-05-18
**Domaine :** `apps/backend/src/payments/`
**Statut :** Approuvé — en attente d'implémentation

---

## Problème

`STRIPE_CLIENT` injecte `StripeClientWrapper` (interface : `isConfigured()` + `client(): Stripe.Stripe`). Les trois services du module payments naviguent ensuite dans le SDK Stripe directement :

```typescript
const stripe = this.stripeWrapper.client();
await stripe.checkout.sessions.create({ ... }); // PaymentsService
await stripe.accounts.create({ ... });          // StripeOnboardingService
stripe.webhooks.constructEvent(...);            // PaymentsController
```

**Conséquences :**
- Tests mockent la structure interne du SDK Stripe — fragiles aux upgrades SDK.
- Swap PSP = réécriture des 3 services.
- Vérification de signature webhook dans le controller — logique métier hors du bon module.
- `isConfigured()` vérifié sur chaque appel dans 3 services différents.

**Test de suppression :** supprimer `StripeClientWrapper` → la complexité Stripe réapparaît dans 3 services. Elle y était déjà. Le seam actuel est cosmétique.

---

## Solution

Lever le seam de "SDK wrapper" à "domain operations wrapper". L'interface expose des opérations métier et retourne des types IOX — aucun type Stripe ne fuit hors de l'adapter.

---

## Architecture

### Structure de fichiers

```
apps/backend/src/payments/
  provider/
    payment-provider.interface.ts     ← PaymentProvider interface + 7 types domain
    payment-provider.errors.ts        ← PaymentProviderError hierarchy
    stripe/
      stripe-payment.adapter.ts       ← StripePaymentAdapter implements PaymentProvider
  payments.service.ts                 ← injecte PAYMENT_PROVIDER (retire STRIPE_CLIENT)
  stripe-onboarding.service.ts        ← injecte PAYMENT_PROVIDER (retire STRIPE_CLIENT)
  payments-webhook.service.ts         ← injecte PAYMENT_PROVIDER, expose receiveRaw()
  payments.module.ts                  ← provide PAYMENT_PROVIDER → StripePaymentAdapter
  stripe.factory.ts                   ← supprimé (absorbé dans StripePaymentAdapter)
```

---

### Interface `PaymentProvider`

```typescript
// payment-provider.interface.ts

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

// ── Types domain (aucun import Stripe) ──────────────────────────────

export interface CheckoutSessionParams {
  amountCents: number;
  currency: string;
  productName: string;
  applicationFeeCents: number;
  destinationAccountId: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  url: string;
}

export interface ConnectedAccountParams {
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

export interface AccountStatusFlags {
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  capabilities?: object | null;
  requirements?: { disabled_reason?: string | null } | null;
}

export interface RefundParams {
  paymentIntentId: string;
  amountCents?: number;
}

export interface RefundResult {
  refundId: string;
}

export interface PaymentEvent {
  id: string;
  type: string;
  data: { object: unknown };
}

// ── Interface ────────────────────────────────────────────────────────

export interface PaymentProvider {
  /** Vrai si le PSP est configuré (clé présente). */
  isConfigured(): boolean;

  /** Crée une Checkout Session. Retourne sessionId + URL de redirection. */
  createCheckoutSession(p: CheckoutSessionParams): Promise<CheckoutSessionResult>;

  /** Crée un remboursement total ou partiel. */
  createRefund(p: RefundParams): Promise<RefundResult>;

  /** Crée un compte Express (onboarding vendeur). */
  createConnectedAccount(p: ConnectedAccountParams): Promise<{ accountId: string }>;

  /** Génère un AccountLink d'onboarding (valide ~5 min). */
  generateOnboardingLink(p: OnboardingLinkParams): Promise<{ url: string; expiresAt: number }>;

  /** Récupère les flags de statut du compte connecté depuis le PSP. */
  retrieveAccountFlags(accountId: string): Promise<AccountStatusFlags>;

  /** Vérifie la signature du webhook et retourne l'event parsé. */
  verifyWebhookEvent(payload: Buffer, signature: string, secret: string): PaymentEvent;
}
```

---

### Erreurs domain

```typescript
// payment-provider.errors.ts

/** Erreur de base — toutes les erreurs PSP en héritent. */
export class PaymentProviderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}

/** PSP non configuré (clé absente). */
export class PaymentProviderNotConfiguredError extends PaymentProviderError {
  constructor() {
    super('Payment provider not configured. Set STRIPE_SECRET_KEY.');
    this.name = 'PaymentProviderNotConfiguredError';
  }
}

/** Paiement refusé par la banque / carte. */
export class PaymentDeclinedError extends PaymentProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'PaymentDeclinedError';
  }
}

/** Mauvaise configuration PSP (paramètres invalides). */
export class PaymentConfigError extends PaymentProviderError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'PaymentConfigError';
  }
}

/** Signature webhook invalide. */
export class WebhookSignatureError extends PaymentProviderError {
  constructor(cause?: unknown) {
    super('Invalid webhook signature.', cause);
    this.name = 'WebhookSignatureError';
  }
}
```

---

### `StripePaymentAdapter`

Responsabilités :
1. Créer l'instance Stripe SDK (lazy — échoue à l'appel si clé absente, pas au boot)
2. Traduire les params domain → params SDK Stripe
3. Traduire les réponses SDK Stripe → types domain
4. Catch `Stripe.errors.*` → rethrow erreurs IOX

```typescript
// stripe/stripe-payment.adapter.ts
@Injectable()
export class StripePaymentAdapter implements PaymentProvider {
  private readonly stripe: Stripe | null;

  constructor(private readonly config: ConfigService) {
    const key = config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = key ? new Stripe(key, { typescript: true, appInfo: { name: 'iox-marketplace' } }) : null;
  }

  isConfigured(): boolean { return this.stripe !== null; }

  private sdk(): Stripe {
    if (!this.stripe) throw new PaymentProviderNotConfiguredError();
    return this.stripe;
  }

  async createCheckoutSession(p: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    try {
      const session = await this.sdk().checkout.sessions.create({ /* mapping */ });
      return { sessionId: session.id, url: session.url ?? '' };
    } catch (err) {
      throw this.mapError(err);
    }
  }

  // ... idem pour les 5 autres méthodes

  private mapError(err: unknown): PaymentProviderError {
    if (err instanceof Stripe.errors.StripeCardError) return new PaymentDeclinedError(err.message, err);
    if (err instanceof Stripe.errors.StripeInvalidRequestError) return new PaymentConfigError(err.message, err);
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) return new WebhookSignatureError(err);
    if (err instanceof PaymentProviderError) return err;
    return new PaymentProviderError(err instanceof Error ? err.message : 'Unknown PSP error', err);
  }
}
```

---

### `PaymentsWebhookService` — receiveRaw

Nouveau point d'entrée de bout en bout :

```typescript
// Inject PaymentProvider via PAYMENT_PROVIDER token
async receiveRaw(payload: Buffer, signature: string): Promise<{ handled: boolean; action: string }> {
  const event = this.provider.verifyWebhookEvent(payload, signature, this.webhookSecret);
  return this.handleEvent(event); // méthode existante inchangée
}
```

`PaymentsController` réduit à :

```typescript
@Post('webhook')
@HttpCode(200)
async webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string) {
  return this.webhookService.receiveRaw(req.rawBody!, sig);
}
```

---

### Module NestJS

```typescript
// payments.module.ts
{
  provide: PAYMENT_PROVIDER,
  useClass: StripePaymentAdapter,
}
// stripeClientProvider supprimé
```

---

## Impact sur les tests existants

**Avant :**
```typescript
function makeStripeMock(): StripeClientWrapper {
  return {
    isConfigured: () => true,
    client: () => ({
      checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: 'cs_test', url: '...' }) } },
      refunds: { create: jest.fn().mockResolvedValue({ id: 're_test' }) },
    }) as never,
  };
}
```

**Après :**
```typescript
function makeProviderMock(): PaymentProvider {
  return {
    isConfigured: jest.fn().mockReturnValue(true),
    createCheckoutSession: jest.fn().mockResolvedValue({ sessionId: 'cs_test', url: 'https://...' }),
    createRefund: jest.fn().mockResolvedValue({ refundId: 're_test_123' }),
    createConnectedAccount: jest.fn().mockResolvedValue({ accountId: 'acct_test' }),
    generateOnboardingLink: jest.fn().mockResolvedValue({ url: 'https://connect.stripe.com/...', expiresAt: 9999999 }),
    retrieveAccountFlags: jest.fn().mockResolvedValue({ detailsSubmitted: true, chargesEnabled: true, payoutsEnabled: true }),
    verifyWebhookEvent: jest.fn().mockReturnValue({ id: 'evt_1', type: 'payment_intent.succeeded', data: { object: {} } }),
  };
}
```

Zéro import Stripe dans les specs. Impossible à casser par un upgrade SDK.

---

## Ce qui ne change pas

| Élément | Statut |
|---------|--------|
| `PaymentsController` endpoints | Inchangés (signatures HTTP identiques) |
| `InvoicesService` / `InvoicesController` | Inchangés (pas de Stripe) |
| `computeStatus()` dans `StripeOnboardingService` | Inchangé (déjà pur, accepte `AccountStatusFlags`) |
| Modèles Prisma | Inchangés |
| Enums `@iox/shared` | Inchangés |
| Comportement runtime | Identique |

---

## Bénéfices

**Localité :** tout le savoir Stripe (SDK, types, erreurs) vit dans `StripePaymentAdapter`. Supprimer ce fichier = supprimer Stripe du projet.

**Leverage :** `MockPaymentProvider` trivial (plain objects). Tests découplés du SDK.

**Extensibilité :** PAY-5 multi-PSP = ajouter `MangopayPaymentAdapter implements PaymentProvider`. Services inchangés.

**Sécurité :** vérification webhook dans `PaymentsWebhookService` — testable directement via `receiveRaw(fakePayload, fakeSig)` avec mock qui throw `WebhookSignatureError`.

---

## Fichiers touchés

| Fichier | Action |
|---------|--------|
| `provider/payment-provider.interface.ts` | Créer |
| `provider/payment-provider.errors.ts` | Créer |
| `provider/stripe/stripe-payment.adapter.ts` | Créer |
| `payments.service.ts` | Migrer `STRIPE_CLIENT` → `PAYMENT_PROVIDER` |
| `stripe-onboarding.service.ts` | Migrer `STRIPE_CLIENT` → `PAYMENT_PROVIDER` |
| `payments-webhook.service.ts` | Ajouter `receiveRaw()`, injecter `PAYMENT_PROVIDER` |
| `payments.controller.ts` | Simplifier webhook handler |
| `payments.module.ts` | Remplacer `stripeClientProvider` par `StripePaymentAdapter` |
| `stripe.factory.ts` | Supprimer |
| `*.spec.ts` (4 fichiers) | Migrer mocks vers `PaymentProvider` |
