# PAY-1 phase 1 LOT 3 — Payment Intent buyer + Webhook handler complet + Email confirmation

## TL;DR

Clôt PAY-1 phase 1 POC :
- **Backend** : endpoint `POST /payments/checkout-session` (buyer) + webhook handler complet (`payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`).
- **Frontend** : 3 pages buyer (`checkout/[rfqId]`, `return/[paymentId]`, `cancel/[paymentId]`).
- **Email** : templates `payment-confirmed-to-buyer` FR + EN dans le registry (à brancher au webhook V2).
- **Tests** : 12 nouveaux specs (PaymentsService 7, PaymentsWebhookService 5, frontend buyer 3, email template 6).
- **Application fee 5% gross** via `application_fee_amount` Stripe + `transfer_data.destination` (split à la source).

## Backend

### Endpoint `POST /api/v1/payments/checkout-session`

Body `CreateCheckoutSessionDto` :
```typescript
{
  quoteRequestId: string;
  marketplaceOfferId: string;
  amountCents: number; // min 50 (Stripe limit)
  currency?: string;   // EUR seulement V1
  returnUrl: string;
  cancelUrl: string;
}
```

Validation :
- RFQ exists
- RFQ status === `WON` (sinon `BadRequestException`)
- Buyer ownership : `actor.id === rfq.buyerUserId`
- Seller `SellerStripeAccount` exists et `chargesEnabled === true`
- Currency `EUR` uniquement V1

Workflow :
1. Crée `Payment` row avec status=PENDING, `applicationFeeCents = Math.floor(amountCents * 0.05)`.
2. Crée Stripe Checkout Session avec :
   - `mode: 'payment'`
   - `line_items[0].price_data` (currency, name de l'offer, unit_amount).
   - `payment_intent_data.application_fee_amount` (commission IOX).
   - `payment_intent_data.transfer_data.destination` (= sellerStripeAccount.stripeAccountId).
   - `metadata.payment_id` propagé sur PaymentIntent + Session.
3. Persist `stripeCheckoutSessionId` sur Payment row.
4. Retourne `{ paymentId, sessionId, checkoutUrl }`.

### Webhook handler (`PaymentsWebhookService`)

Délégué depuis `PaymentsController.webhook` après vérification signature (`stripe.webhooks.constructEvent`).

Events handled :
- **`payment_intent.succeeded`** :
  - Lit `metadata.payment_id`.
  - Update Payment row : `status=SUCCEEDED`, `stripePaymentIntentId`, `stripeChargeId` (depuis `latest_charge`).
- **`payment_intent.payment_failed`** :
  - Update Payment row : `status=FAILED`, `errorCode`, `errorMessage` (depuis `last_payment_error`).
- **`account.updated`** (Stripe Connect) :
  - Lit `metadata.seller_profile_id`.
  - Update SellerStripeAccount : flags + status calculé via `StripeOnboardingService.computeStatus`.
- Autres events → log + ignore (return 200).

### Application fee — calcul

```typescript
applicationFeeCents = Math.floor(amountCents * 0.05);
```

`Math.floor` garantit `applicationFee ≤ amount`. Exemple :
- 100 EUR (10000 cents) → fee 500 cents (5 EUR), seller reçoit 9500 cents (95 EUR).
- 99,99 EUR (9999 cents) → fee 499 cents, seller reçoit 9500 cents.

Le split est appliqué côté Stripe : le buyer paie le total, Stripe retient `application_fee_amount` pour le compte plateforme IOX, et transfère le reste vers `transfer_data.destination` (compte seller Connect).

### Stripe SDK 22.x typing quirks

Le namespace merging Stripe (class + namespace) ne se réimporte pas proprement via `import type StripeSdk from 'stripe'` quand le tsconfig utilise `module: commonjs` + `esModuleInterop`. Pattern adopté : interfaces `*Like` minimales locales pour les events handlers (champs lus uniquement). Le SDK runtime fonctionne normalement (les calls Stripe sont typés correctement, c'est juste l'extraction des types nominaux qui pose problème).

## Frontend

### `/buyer/payments/checkout/[rfqId]/page.tsx`

Client component (lecture params + form controlled + redirect post-API).

UI V1 simplifiée :
- Input Offer ID + montant EUR.
- Bouton "Payer via Stripe" → POST checkout-session → `window.location.href = checkoutUrl`.

V2 enrichira : pré-remplir depuis RFQ details, afficher seller info, récap commande.

### `/buyer/payments/return/[paymentId]/page.tsx`

Page de confirmation après Stripe success (Stripe redirige vers cette URL via `success_url`). Affichage statique "✅ Paiement reçu".

V2 : poll status Payment row (le webhook update SUCCEEDED en async) ou affichage progressive.

### `/buyer/payments/cancel/[paymentId]/page.tsx`

Page d'abandon (Stripe redirige via `cancel_url`). Affichage "⚠️ Paiement annulé" + lien "Réessayer".

## Email confirmation

Templates `payment-confirmed-to-buyer` FR + EN ajoutés au registry. Pas encore déclenchés par le webhook handler (LOT 3 ne wire pas l'envoi pour rester focal sur le pipeline DB). LOT 4+ ajoutera l'appel `notifEmailService.send('payment-confirmed-to-buyer', ...)` dans `handlePaymentIntentSucceeded`.

Données du template :
- `buyerDisplayName`, `sellerDisplayName`, `offerTitle`, `amountFormatted` (ex: "100,00 €"), `paymentId`, `ctaUrl`.

## Tests

```
$ pnpm --filter @iox/backend test src/notif-email src/payments
Test Suites: 21 passed, 21 total
Tests:       176 passed, 176 total

$ pnpm --filter @iox/frontend test -- buyer/payments --run
Test Files  1 passed (1)
Tests  3 passed (3)
```

Specs nouveaux :
- `payments.service.spec.ts` : +7 specs (computeApplicationFeeCents 1, createCheckoutSession 6 — happy + 5 error paths).
- `payments-webhook.service.spec.ts` : 5 specs (succeeded, failed, account.updated, ignored, no-payment-id).
- `payments.controller.spec.ts` : étendu pour injecter PaymentsService + PaymentsWebhookService.
- `buyer/payments/checkout/[rfqId]/page.test.tsx` : 3 specs (rendu, error sans champs, click → API).
- `payment-confirmed-to-buyer.template.spec.ts` : 6 specs FR + EN.

Backend tsc clean. Frontend tsc clean.

## TODO LOT 4+ (PAY-2)

- Brancher l'envoi email `payment-confirmed-to-buyer` dans `handlePaymentIntentSucceeded`.
- Pré-remplir page `/buyer/payments/checkout/[rfqId]` depuis RFQ details (suppression des inputs offerId/amount manuels).
- Liste paiements buyer + seller (consultable côté dashboard).
- Refunds (admin-side : POST /payments/:id/refund avec Stripe).
- Disputes (chargeback Stripe webhook → Payment.status=DISPUTED).
- Reporting financier (CSV export commissions IOX par mois).
- Multi-currency (USD, MUR, KMF...).
- Historique transferts seller (Stripe Connect Express dashboard).
- Webhook idempotency (Event.id stocké pour ignore replay).
- Activation prod : configuration env vars VPS + DNS + clé API live.
