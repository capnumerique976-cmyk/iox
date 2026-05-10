# Méga-mandat 40 — handoff PAY-1 phase 1 POC Stripe Connect

## TL;DR
- **LOT 1 schema + onboarding backend : ✅** — commit `bf1edd1`, 24 specs verts, 1 migration Prisma additive.
- **LOT 2 frontend onboarding seller : ✅** — commit `73e9b6f`, 5 specs verts.
- **LOT 3 payment intent buyer + webhook + email : ✅** — commit `8f9cb76`, 12 specs nouveaux (5 webhook, 7 service, 6 email).
- main intact (`f902287`).
- 1 migration Prisma additive (CREATE TABLE/TYPE/INDEX uniquement).
- 0 push, 0 deploy, 0 SSH, 0 appel Stripe réel (mock SDK via factory DI).

## Branches livrées
- `pay-1-ph1-schema-and-onboarding-backend` (HEAD `bf1edd1`, depuis main `f902287`)
- `pay-1-ph1-seller-onboarding-frontend` (HEAD `73e9b6f`, basée sur LOT 1)
- `pay-1-ph1-payment-intent-buyer` (HEAD `8f9cb76`, basée sur LOT 2)

## Périmètre cumulé

### Backend
- Modèles Prisma : `SellerStripeAccount` + `Payment` + 2 enums.
- Module `payments` : 4 services (PaymentsService, StripeOnboardingService, PaymentsWebhookService, factory `STRIPE_CLIENT`).
- Endpoints :
  - `POST /payments/connect/onboarding-link` (seller)
  - `POST /payments/connect/refresh-status` (seller)
  - `GET /payments/connect/account-status` (seller)
  - `POST /payments/checkout-session` (buyer)
  - `POST /payments/webhook` (Stripe → backend, signature requise, public)
- Express raw body préservé sur `req.rawBody` pour `/payments/webhook`.
- Application fee 5% gross via `application_fee_amount` + `transfer_data.destination`.
- Webhook handler : `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`, autres → ignore.
- Env vars optionnelles : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` (graceful degradation au boot, throw clair à l'usage).

### Frontend
- Helper `apps/frontend/src/lib/payments.ts` : 4 méthodes (getOnboardingLink, refresh, getAccountStatus, createCheckoutSession).
- Pages seller : `/seller/payments`, `/seller/payments/return`, `/seller/payments/refresh`.
- Pages buyer : `/buyer/payments/checkout/[rfqId]`, `/buyer/payments/return/[paymentId]`, `/buyer/payments/cancel/[paymentId]`.

### Email templates
- `payment-confirmed-to-buyer` FR + EN ajoutés au registry (déclenchement webhook V2).

### Shared
- Enums `SellerStripeAccountStatus` + `PaymentStatus` exposés via `@iox/shared`.

## LOT 1 — preuves brutes

```
$ git log --oneline main..pay-1-ph1-schema-and-onboarding-backend
bf1edd1 feat(payments): PAY-1 phase 1 LOT 1 — schema + onboarding backend Stripe Connect Express

$ git diff main..pay-1-ph1-schema-and-onboarding-backend --stat
 18 files changed, 1386 insertions(+), 1 deletion(-)

$ ls prisma/migrations/ | tail -2
20260430061049_i18n_3_user_preferred_locale
20260430175711_pay_1_ph1_payments_and_stripe_accounts

$ grep -nE "model Payment|model SellerStripeAccount|enum PaymentStatus|enum SellerStripeAccountStatus" prisma/schema.prisma
1391:enum SellerStripeAccountStatus {
1399:model SellerStripeAccount {
1418:enum PaymentStatus {
1428:model Payment {

$ grep "stripe" apps/backend/package.json
"stripe": "^22.1.0",

$ pnpm --filter @iox/backend test src/payments
PASS src/payments/payments.service.spec.ts
PASS src/payments/stripe-onboarding.service.spec.ts
PASS src/payments/payments.controller.spec.ts
Test Suites: 3 passed, 3 total
Tests:       24 passed, 24 total
```

## LOT 2 — preuves brutes

```
$ git log --oneline pay-1-ph1-schema-and-onboarding-backend..pay-1-ph1-seller-onboarding-frontend
73e9b6f feat(payments): PAY-1 phase 1 LOT 2 — frontend seller onboarding Stripe Connect Express

$ git diff bf1edd1..73e9b6f --stat
 6 files changed, 686 insertions(+)

$ ls "apps/frontend/src/app/(dashboard)/seller/payments/"
page.test.tsx  page.tsx  refresh/  return/

$ pnpm --filter @iox/frontend test -- seller/payments --run
✓ src/app/(dashboard)/seller/payments/page.test.tsx (5 tests) 88ms
Test Files  1 passed (1)
Tests  5 passed (5)
```

## LOT 3 — preuves brutes

```
$ git log --oneline pay-1-ph1-seller-onboarding-frontend..pay-1-ph1-payment-intent-buyer
8f9cb76 feat(payments): PAY-1 phase 1 LOT 3 — payment intent buyer + webhook handler complet + email confirmation

$ git diff 73e9b6f..8f9cb76 --stat
 17 files changed, 1358 insertions(+), 11 deletions(-)

$ grep -n "checkout-session\|webhook" apps/backend/src/payments/payments.controller.ts
142:  @Post('checkout-session')
174:  @Post('webhook')

$ grep -rn "application_fee_amount\|transfer_data" apps/backend/src/payments/
apps/backend/src/payments/payments.service.ts:142:        application_fee_amount: applicationFeeCents,
apps/backend/src/payments/payments.service.ts:143:        transfer_data: { destination: stripeAccount.stripeAccountId },

$ ls "apps/frontend/src/app/(dashboard)/buyer/payments/"
cancel  checkout  return

$ ls apps/backend/src/notif-email/templates/payment-confirmed*
apps/backend/src/notif-email/templates/payment-confirmed-to-buyer.en.template.ts
apps/backend/src/notif-email/templates/payment-confirmed-to-buyer.template.spec.ts
apps/backend/src/notif-email/templates/payment-confirmed-to-buyer.template.ts

$ pnpm --filter @iox/backend test src/payments src/notif-email
Test Suites: 21 passed, 21 total
Tests:       176 passed, 176 total

$ pnpm --filter @iox/frontend test -- buyer/payments --run
Test Files  1 passed (1)
Tests  3 passed (3)
```

Backend + frontend tsc clean.

## Blocages rencontrés

1. **Docker daemon initialement down** — démarré via `open -a Docker` puis `docker compose up -d postgres`. ~30s de friction.

2. **Stripe SDK 22.x typing avec module=commonjs** :
   - `import Stripe from 'stripe'` ne donne pas accès au namespace mergé pour les types nominaux (Event, PaymentIntent, Account).
   - Pattern README `Stripe.Event` échoue — namespace `StripeConstructor` n'expose pas Event directement, seulement un type alias `Stripe` (qui est lui-même class+namespace mais inaccessible en tant que namespace via le path `StripeSdk.Stripe.Event` sans namespace import).
   - Solution adoptée : interfaces `*Like` minimales locales (StripeEventBase, StripePaymentIntentLike, StripeAccountLike) avec champs lus par le webhook handler. Le SDK runtime fonctionne normalement (calls Stripe `accounts.create`, `accountLinks.create`, `checkout.sessions.create` typés correctement via factory wrapper). Sur mal-typage tolerable car shape d'event Stripe stable et tests couvrent les paths critiques.

3. **`apiVersion` Stripe** : SDK 22.1 attend `'2026-04-22.dahlia'` comme `LatestApiVersion`. J'ai laissé non-pinné V1 (utilise default account version). À pinner explicitement quand stable côté dashboard Stripe.

## Notes pour push cascade

### Ordre
```
git push -u origin pay-1-ph1-schema-and-onboarding-backend
gh pr create --base main --head pay-1-ph1-schema-and-onboarding-backend --title "feat(payments): PAY-1 phase 1 LOT 1 — schema + onboarding backend"
gh pr checks --watch     # surveiller drift Prisma + backend tests
gh pr merge --squash --delete-branch
git pull --rebase origin main

git checkout pay-1-ph1-seller-onboarding-frontend
git rebase --onto main bf1edd1     # rebaser sur main avancé
git push --force-with-lease
gh pr create --base main --head pay-1-ph1-seller-onboarding-frontend --title "feat(payments): PAY-1 phase 1 LOT 2 — frontend onboarding"
gh pr merge --squash --delete-branch
git pull --rebase origin main

git checkout pay-1-ph1-payment-intent-buyer
git rebase --onto main 73e9b6f
git push --force-with-lease
gh pr create --base main --head pay-1-ph1-payment-intent-buyer --title "feat(payments): PAY-1 phase 1 LOT 3 — payment intent buyer + webhook"
gh pr merge --squash --delete-branch
```

### Migration Prisma
1 migration additive `pay_1_ph1_payments_and_stripe_accounts` (CREATE TABLE + CREATE INDEX + CREATE TYPE uniquement, 0 ALTER existant). CI Prisma drift check devrait être vert. Migration sera appliquée automatiquement au deploy via `prisma migrate deploy`.

### Env vars VPS à configurer post-merge LOT 1
**OPTIONNELLES V1** (le boot fonctionne sans, le module degrade clair à l'usage si absentes) :
```
STRIPE_SECRET_KEY=sk_test_...     # test mode V1
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Webhook URL Stripe
Configurer côté Stripe dashboard après création compte :
- URL : `https://iox.mycloud.yt/api/v1/payments/webhook`
- Events à écouter : `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`.

### POC test mode V1
Aucun paiement réel. Le module reste désactivable via env vars vides (graceful degradation). User active explicitement quand prêt — chantier ops séparé.

### Cumul attendu après cascade
main avancera de **+3 lots** (55 → 58 squash PR cumulés).

## TODO PAY-2

- Brancher l'envoi email `payment-confirmed-to-buyer` dans `handlePaymentIntentSucceeded`.
- Pré-remplir page `/buyer/payments/checkout/[rfqId]` depuis RFQ details (suppression inputs offerId/amount manuels).
- Liste paiements buyer + seller (dashboard).
- Refunds (admin) + disputes (chargeback Stripe webhook).
- Reporting financier CSV export commissions IOX.
- Multi-currency (USD, MUR, KMF...).
- Webhook idempotency (Event.id stocké pour ignore replay).
- Activation prod : config env vars VPS + DNS + clé API live + smoke RFQ+pay end-to-end.
