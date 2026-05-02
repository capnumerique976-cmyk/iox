# PAY-1 phase 1 LOT 1 — Schéma Prisma + onboarding backend Stripe Connect Express

## TL;DR

Pose les fondations du module `payments` :
- 2 modèles Prisma (`SellerStripeAccount`, `Payment`) + 2 enums (`SellerStripeAccountStatus`, `PaymentStatus`).
- Migration additive `pay_1_ph1_payments_and_stripe_accounts` (CREATE TABLE/TYPE/INDEX uniquement).
- Module backend `payments` avec 3 services (Payments, StripeOnboarding) + 1 controller + factory Stripe SDK injectée DI.
- 4 endpoints onboarding seller : `POST /connect/onboarding-link`, `POST /connect/refresh-status`, `GET /connect/account-status`, `POST /webhook` (stub V1).
- 24 specs jest verts (PaymentsService 5, StripeOnboardingService 13, PaymentsController 6).

## Modèles Prisma

### SellerStripeAccount

| Champ | Type | Note |
|---|---|---|
| id | uuid PK | |
| sellerProfileId | uuid FK unique | 1:1 avec SellerProfile |
| stripeAccountId | string unique | `acct_...` Stripe |
| status | enum | PENDING_ONBOARDING → ONBOARDING_INCOMPLETE → CHARGES_ENABLED → PAYOUTS_ENABLED ; ou RESTRICTED |
| chargesEnabled | bool | flag Stripe |
| payoutsEnabled | bool | flag Stripe |
| detailsSubmitted | bool | flag Stripe |
| capabilitiesJson | jsonb | snapshot |
| requirementsJson | jsonb | snapshot |

Cascade delete depuis SellerProfile.

### Payment

| Champ | Type | Note |
|---|---|---|
| id | uuid PK | |
| quoteRequestId | uuid? | FK soft (pas Prisma relation V1) |
| marketplaceOfferId | uuid? | FK soft |
| sellerProfileId | uuid | côté qui reçoit |
| buyerCompanyId / buyerUserId | uuid | côté qui paie |
| amountCents | int | total facturé buyer |
| currency | string | EUR V1 only |
| applicationFeeCents | int | commission IOX 5% gross |
| status | enum | PENDING → REQUIRES_ACTION → PROCESSING → SUCCEEDED \| FAILED \| CANCELED \| REFUNDED |
| stripePaymentIntentId / stripeCheckoutSessionId / stripeChargeId / stripeTransferId | string? unique partial | IDs Stripe |
| errorCode / errorMessage | string? | Stripe error si fail |
| metadataJson | jsonb? | passthrough |

Index : status+createdAt, sellerProfileId+createdAt, buyerCompanyId+createdAt, quoteRequestId.

## Pattern factory Stripe SDK

`apps/backend/src/payments/stripe.factory.ts` :
- Token DI `STRIPE_CLIENT` injecte un `StripeClientWrapper`.
- En production : factory lit `STRIPE_SECRET_KEY` env var et instancie `Stripe`.
- En tests : on override le provider avec un mock object.
- Si secret absent : wrapper retourne `isConfigured()=false` au lieu de crasher au boot. Les services throw clair (BadRequestException) au moment d'un endpoint qui en a besoin.
- Pas d'apiVersion pinné V1 — utilise default account version (gérée côté dashboard Stripe).

## Endpoints onboarding seller

### `POST /api/v1/payments/connect/onboarding-link`

Body `{ returnUrl, refreshUrl }`. Rôle `MARKETPLACE_SELLER`. Idempotent : crée un compte Stripe Express si pas existant, sinon réutilise.

Response : `{ url, expiresAt }` — l'URL est valide ~5 min, le seller est redirigé vers Stripe pour KYC + bank account collection.

### `POST /api/v1/payments/connect/refresh-status`

Sync les flags charges/payouts/details depuis Stripe vers DB. Appelé après le return Stripe sur `/seller/payments/return`.

### `GET /api/v1/payments/connect/account-status`

Lecture pure DB (pas d'appel Stripe). Si pas encore créé → retourne pseudo-row `{ status: 'PENDING_ONBOARDING', chargesEnabled: false, ... }`.

### `POST /api/v1/payments/webhook` (stub V1)

Endpoint public (pas de JWT — Stripe poste sans auth user). Vérification signature obligatoire via `STRIPE_WEBHOOK_SECRET`.

V1 (LOT 1) : log + return 200. LOT 3 implémentera le traitement réel des events `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`.

Le body raw est préservé sur `req.rawBody` via le hook `verify` de `express.json()` dans `main.ts` (uniquement pour `/payments/webhook`, pour ne pas alourdir les autres routes).

## Env vars

Toutes optionnelles V1 :
- `STRIPE_SECRET_KEY` (sk_test_... en test mode V1)
- `STRIPE_WEBHOOK_SECRET` (whsec_...)
- `STRIPE_PUBLISHABLE_KEY` (pk_test_..., exposé frontend si besoin)

Si absentes : graceful degradation au boot, throw clair à l'usage.

## Status mapping (computeStatus)

```
PAYOUTS_ENABLED       ← payouts_enabled && charges_enabled
CHARGES_ENABLED       ← charges_enabled
ONBOARDING_INCOMPLETE ← details_submitted (Stripe analyse)
RESTRICTED            ← requirements.disabled_reason présent
PENDING_ONBOARDING    ← défaut (compte pas démarré)
```

## TODO LOT 2 (frontend onboarding seller)

- Helper `apps/frontend/src/lib/payments.ts` (3 méthodes API).
- Pages `/seller/payments`, `/seller/payments/setup`, `/return`, `/refresh`.
- UI status badges + bouton démarrer/poursuivre.

## TODO LOT 3 (payment intent buyer + webhook handler complet)

- Endpoint `POST /payments/checkout-session` (buyer).
- Webhook handler implémente `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`.
- Application fee 5% gross via `application_fee_amount` + `transfer_data.destination`.
- Page `/buyer/payments/checkout/[rfqId]` server component.
- Email notification template `payment-confirmed-to-buyer`.

---

## Activation production

Voir doc dédiée : [`docs/ops/STRIPE_PROD_ACTIVATION.md`](../ops/STRIPE_PROD_ACTIVATION.md).

Scripts ops :
- `deploy/scripts/activate-stripe.sh` — bascule env VPS (3 vars Stripe) + restart backend.
- `deploy/scripts/smoke-stripe-onboarding.sh` — login smoke-seller + génère onboarding link + vérifie SellerStripeAccount créé.

Smoke E2E test mode : `apps/frontend/e2e/payments-onboarding-smoke.spec.ts` (tag `@stripe-prod`, skippé sans `STRIPE_SECRET_KEY` env).

Rollback : revert env vars Stripe + restart → factory `STRIPE_CLIENT.isConfigured()` retourne false → endpoints throw clair (mode dégradé V0).
