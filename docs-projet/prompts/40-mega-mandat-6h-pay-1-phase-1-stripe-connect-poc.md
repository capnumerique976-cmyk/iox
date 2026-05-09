# Méga-mandat 6h LOCAL-ONLY — PAY-1 phase 1 (POC Stripe Connect Express, test mode)

> Coller dans Claude Code pour run autonome ~6h. **Aucun push, deploy, gh, ssh, envoi externe, paiement réel.**
>
> Implémente le POC Stripe Connect Express en test mode. Aucun appel Stripe réel — tout mocké en LOCAL. User configurera `STRIPE_SECRET_KEY_TEST` côté VPS séparément en chantier ops.

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                              # → f902287714517009ca91009a741f0585055c4bb0
git stash list                                                   # → vide
git branch | wc -l                                               # → 2
pnpm install --frozen-lockfile 2>&1 | tail -3
pnpm --filter @iox/backend exec prisma generate 2>&1 | tail -3
docker compose ps 2>&1 | head -5
```

Si pas vert → STOP + `notes/handoff-megamandat-40-stop.md`.

---

## Garde-fous anti-hallucination

User absent ~6h. Toute invention détectée par grep / git log / pnpm test.

1. Toujours vérifier disque (`ls`, `cat`, `git status`) avant marquer fini.
2. Jamais inventer output / test / fichier. Erreur brute si commande échoue.
3. Fin chaque lot, recopier output réel des preuves dans handoff.
4. Si tu détectes invention → STOP, revert, doc, passe au suivant.

---

## Contexte canonique IOX

Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js App Router, controlled state, conventional commits, migrations Prisma additives.

5 invariants : Product ≠ Offer ≠ SellerProfile / projection publique filtrée / statuts marketplace ≠ MCH / FP ≠ Lot ≠ MP / Seller = `MARKETPLACE_SELLER`.

---

## État avant ce mandat

- main = `f902287` (55 lots cumulés).
- PAY-1 ph0 livré (#31) — cadrage juridique + 10 décisions reco dans `docs/marketplace/PAY_1_PHASE_0_CADRAGE.md`.
- Reco validée : Stripe Connect Express + split à la source + commission 5% gross + EUR only V1 + Direct (pas d'escrow).
- Quote/RFQ existant (workflow NEW → QUALIFIED → QUOTED → NEGOTIATING → WON/LOST).
- **Aucun model Payment / SellerStripeAccount** au schema Prisma.
- **Aucun module backend `payments`**.
- **Aucune dépendance `stripe`** dans `apps/backend/package.json`.

---

## Mandat global

3 LOTs branches chaînées sur main.

```
main (f902287, intact)
   │
   ▼
pay-1-ph1-schema-and-onboarding-backend       ← LOT 1 (~2h)
   │
   ▼
pay-1-ph1-seller-onboarding-frontend          ← LOT 2 (~2h)
   │
   ▼
pay-1-ph1-payment-intent-buyer                ← LOT 3 (~2h)
```

Si LOT capote → garder, passer suivant.

---

## Règles absolues

- AUCUN `git push`, `gh`, `git fetch origin`, `git pull`.
- AUCUN merge sur main local. Main reste à `f902287`.
- AUCUN deploy / ssh / VPS.
- AUCUN appel Stripe API réel. **Mock SDK Stripe via DI (`STRIPE_CLIENT_FACTORY` token)**.
- AUCUNE clé Stripe live en code (env vars TEST seulement).
- AUCUN paiement test exécuté en local (testing mode = unit tests uniquement, pas d'appel réseau).
- AUCUN force-push.
- ⚠️ **Migration Prisma additive obligatoire** LOT 1 (table `seller_stripe_accounts` + `payments` + enum `PaymentStatus`).

## Exigences techniques

- Conventional commits.
- TypeScript strict : pas de `any`, casts justifiés.
- DTOs class-validator.
- Tests : `.spec.ts` jest backend + `.test.tsx` vitest frontend. Cible verts.
- Logs : `Logger` Nest, jamais `console.log`.
- Controlled state : pas de react-hook-form.
- i18n : textes UI FR (EN possible si pattern next-intl déjà câblé sur la page).
- Stripe SDK injecté via factory token DI (mock en tests).

---

## LOT 1 — Schéma Prisma + onboarding backend — ~2h

**Branche** : `pay-1-ph1-schema-and-onboarding-backend` à partir de `main`.

**Objectif** : poser les modèles Prisma + module backend `payments` + endpoint onboarding Stripe Connect Express + webhook stub.

### 1.1 Migration Prisma additive

Ajouter dans `prisma/schema.prisma` :

```prisma
enum SellerStripeAccountStatus {
  PENDING_ONBOARDING
  ONBOARDING_INCOMPLETE
  CHARGES_ENABLED
  PAYOUTS_ENABLED
  RESTRICTED
}

model SellerStripeAccount {
  id                  String                    @id @default(uuid())
  sellerProfileId     String                    @unique @map("seller_profile_id")
  stripeAccountId     String                    @unique @map("stripe_account_id")
  status              SellerStripeAccountStatus @default(PENDING_ONBOARDING)
  chargesEnabled      Boolean                   @default(false) @map("charges_enabled")
  payoutsEnabled      Boolean                   @default(false) @map("payouts_enabled")
  detailsSubmitted    Boolean                   @default(false) @map("details_submitted")
  capabilitiesJson    Json?                     @map("capabilities_json")
  requirementsJson    Json?                     @map("requirements_json")
  createdAt           DateTime                  @default(now()) @map("created_at")
  updatedAt           DateTime                  @updatedAt @map("updated_at")

  sellerProfile SellerProfile @relation(fields: [sellerProfileId], references: [id], onDelete: Cascade)

  @@index([status])
  @@map("seller_stripe_accounts")
}

enum PaymentStatus {
  PENDING
  REQUIRES_ACTION
  PROCESSING
  SUCCEEDED
  FAILED
  CANCELED
  REFUNDED
}

model Payment {
  id                          String        @id @default(uuid())
  quoteRequestId              String?       @map("quote_request_id")
  marketplaceOfferId          String?       @map("marketplace_offer_id")
  sellerProfileId             String        @map("seller_profile_id")
  buyerCompanyId              String        @map("buyer_company_id")
  buyerUserId                 String        @map("buyer_user_id")

  amountCents                 Int           @map("amount_cents")
  currency                    String        @default("EUR")
  applicationFeeCents         Int           @map("application_fee_cents") // commission IOX
  
  status                      PaymentStatus @default(PENDING)

  stripePaymentIntentId       String?       @unique @map("stripe_payment_intent_id")
  stripeCheckoutSessionId     String?       @unique @map("stripe_checkout_session_id")
  stripeChargeId              String?       @map("stripe_charge_id")
  stripeTransferId            String?       @map("stripe_transfer_id")

  errorCode                   String?       @map("error_code")
  errorMessage                String?       @map("error_message")
  metadataJson                Json?         @map("metadata_json")

  createdAt                   DateTime      @default(now()) @map("created_at")
  updatedAt                   DateTime      @updatedAt @map("updated_at")

  @@index([status, createdAt])
  @@index([sellerProfileId, createdAt])
  @@index([buyerCompanyId, createdAt])
  @@index([quoteRequestId])
  @@map("payments")
}
```

Lancer :
```
pnpm --filter @iox/backend exec prisma migrate dev --name pay_1_ph1_payments_and_stripe_accounts
```

Vérifier strict additif : CREATE TABLE / CREATE INDEX / CREATE TYPE uniquement, aucun ALTER existant.

### 1.2 Dépendance Stripe SDK

```
pnpm --filter @iox/backend add stripe
```

Vérifier version (^14 ou récente).

### 1.3 Module backend `payments`

Créer `apps/backend/src/payments/` :

- `payments.module.ts` — `@Module` exposant `PaymentsService`, `StripeOnboardingService`.
- `payments.service.ts` — méthodes `getPaymentById(id)`, `listPaymentsBySeller(sellerId, filters)`.
- `stripe-onboarding.service.ts` — méthodes :
  - `createOrGetStripeAccount(sellerProfileId, actor)` — crée Stripe Express account si pas existe, sinon retourne existant.
  - `generateOnboardingLink(sellerProfileId, actor, returnUrl, refreshUrl)` — génère AccountLink Stripe (mode `account_onboarding`).
  - `syncAccountStatus(sellerProfileId)` — appelle Stripe API pour récupérer status + persist en DB.
- `stripe.factory.ts` — token DI `STRIPE_CLIENT_FACTORY` qui retourne instance `Stripe` (config réelle si env présente, sinon throw clair pour tests).
- `payments.controller.ts` — endpoints :
  - `POST /api/v1/payments/connect/onboarding-link` — body `{ returnUrl, refreshUrl }`, role SELLER, retourne `{ url, expiresAt }`.
  - `POST /api/v1/payments/connect/refresh-status` — sync status compte, retourne nouveau status.
  - `GET /api/v1/payments/connect/account-status` — retourne status courant.
  - `POST /api/v1/payments/webhook` — webhook stub V1 (vérif signature + log + return 200, traitement réel LOT 3).

### 1.4 Env vars

Étendre `apps/backend/src/common/config/env.validation.ts` :

```typescript
@IsOptional() @IsString() STRIPE_SECRET_KEY?: string;
@IsOptional() @IsString() STRIPE_WEBHOOK_SECRET?: string;
@IsOptional() @IsString() STRIPE_PUBLISHABLE_KEY?: string;  // exposé au frontend si besoin
```

Toutes optionnelles V1 (pas requises au boot — graceful degradation si absentes, endpoints throw clair).

### 1.5 Tests

- `payments.service.spec.ts` : 4 specs (getPaymentById happy, 404, listPaymentsBySeller pagination, ownership scoping).
- `stripe-onboarding.service.spec.ts` : 6 specs (createOrGetStripeAccount nouveau, existant, generateOnboardingLink mock SDK, syncAccountStatus charges_enabled, payouts_enabled, restricted).
- `payments.controller.spec.ts` : 4 specs (POST onboarding-link OK, GET account-status OK, webhook signature invalid → 400, webhook OK → 200).
- Mock `stripe` SDK via factory `STRIPE_CLIENT_FACTORY` retournant un mock object dans tests.

### 1.6 Documentation

Créer `docs/marketplace/PAY_1_PHASE_1_LOT_1_SCHEMA_ONBOARDING.md` :
- Modèles Prisma + diagramme.
- Endpoints onboarding + flow Stripe Connect Express.
- Pattern factory Stripe SDK.
- TODO LOT 2 (frontend onboarding) + LOT 3 (payment intent buyer).

### 1.7 Preuves anti-hallucination LOT 1

```
git log --oneline main..pay-1-ph1-schema-and-onboarding-backend
git diff main..pay-1-ph1-schema-and-onboarding-backend --stat
ls prisma/migrations/ | tail -3
grep -nE "model Payment|model SellerStripeAccount|enum PaymentStatus|enum SellerStripeAccountStatus" prisma/schema.prisma
ls apps/backend/src/payments/
grep -n "stripe" apps/backend/package.json
grep -n "STRIPE" apps/backend/src/common/config/env.validation.ts
pnpm --filter @iox/backend test src/payments 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
ls docs/marketplace/PAY_1_PHASE_1_LOT_1_SCHEMA_ONBOARDING.md
```

---

## LOT 2 — Frontend onboarding seller — ~2h

**Branche** : `pay-1-ph1-seller-onboarding-frontend` à partir de `pay-1-ph1-schema-and-onboarding-backend`.

**Objectif** : permettre au seller d'onboarder son compte bancaire via Stripe Connect Express depuis le dashboard.

### 2.1 Helper API frontend

Créer `apps/frontend/src/lib/payments.ts` :
- `getOnboardingLink(returnUrl, refreshUrl, token)` → `POST /payments/connect/onboarding-link`.
- `refreshAccountStatus(token)` → `POST /payments/connect/refresh-status`.
- `getAccountStatus(token)` → `GET /payments/connect/account-status`.
- Types TS : `SellerStripeAccountStatus`, `OnboardingLink`.

### 2.2 Pages frontend

`apps/frontend/src/app/(dashboard)/seller/payments/`

```
seller/payments/
├── page.tsx                    # /seller/payments — status onboarding + bouton démarrer/poursuivre
├── page.test.tsx
├── setup/
│   ├── page.tsx                # /seller/payments/setup — redirect vers Stripe Connect
│   └── page.test.tsx
├── return/
│   ├── page.tsx                # /seller/payments/return — Stripe redirige ici après onboarding
│   └── page.test.tsx
└── refresh/
    ├── page.tsx                # /seller/payments/refresh — Stripe redirige si link expiré
    └── page.test.tsx
```

Comportement :
- `/seller/payments` : affiche status courant (PENDING_ONBOARDING, ONBOARDING_INCOMPLETE, CHARGES_ENABLED, etc.) + 4 badges (charges_enabled / payouts_enabled / details_submitted / status général). Bouton "Démarrer l'onboarding" ou "Poursuivre l'onboarding" selon status.
- `/seller/payments/setup` : POST onboarding-link puis redirect window.location vers `url` Stripe.
- `/seller/payments/return` : appelle `refresh-status` au mount → display nouveau status + lien vers `/seller/payments`.
- `/seller/payments/refresh` : appelle `setup` flow à nouveau → nouveau onboarding-link.

### 2.3 Tests

5 specs `page.test.tsx` (status display + bouton démarrer + bouton poursuivre + refresh). 2 specs setup. 2 specs return. 2 specs refresh.

### 2.4 Documentation

`docs/marketplace/PAY_1_PHASE_1_LOT_2_FRONTEND_ONBOARDING.md` :
- Pages seller + flow utilisateur.
- Status mapping UI.
- TODO LOT 3 (buyer checkout).

### 2.5 Preuves LOT 2

```
git log --oneline pay-1-ph1-schema-and-onboarding-backend..pay-1-ph1-seller-onboarding-frontend
git diff pay-1-ph1-schema-and-onboarding-backend..pay-1-ph1-seller-onboarding-frontend --stat
ls apps/frontend/src/app/\(dashboard\)/seller/payments/
ls apps/frontend/src/lib/payments.ts
pnpm --filter @iox/frontend test seller/payments 2>&1 | tail -10
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
ls docs/marketplace/PAY_1_PHASE_1_LOT_2_FRONTEND_ONBOARDING.md
```

---

## LOT 3 — Payment Intent + Checkout buyer-side + Webhook handler — ~2h

**Branche** : `pay-1-ph1-payment-intent-buyer` à partir de `pay-1-ph1-seller-onboarding-frontend`.

**Objectif** : permettre au buyer de payer une RFQ acceptée via Stripe Checkout. Webhook handler gère `payment_intent.succeeded`.

### 3.1 Backend — endpoint checkout-session

Étendre `payments.controller.ts` :

- `POST /api/v1/payments/checkout-session` — body `{ quoteRequestId, marketplaceOfferId, amountCents, returnUrl, cancelUrl }`, role BUYER. Crée :
  - `Payment` row status=PENDING.
  - Stripe Checkout Session avec `payment_intent_data` + `application_fee_amount` (5% de amountCents) + `transfer_data.destination = sellerStripeAccount.stripeAccountId`.
  - Retourne `{ checkoutUrl, sessionId }`.

Service `PaymentsService.createCheckoutSession(input, actor)` avec :
- Validation : RFQ existe + status WON, seller a SellerStripeAccount avec charges_enabled=true.
- Sinon `BadRequestException("Seller pas onboardé Stripe")` ou `BadRequestException("RFQ pas WON")`.
- Application fee = `Math.floor(amountCents * 0.05)` (5%).

Tests : 6 specs (happy path, RFQ pas WON → 400, seller pas charges_enabled → 400, application fee correct, currency EUR par défaut, ownership buyer scoping).

### 3.2 Backend — webhook handler

Étendre `payments.controller.ts` :

- `POST /api/v1/payments/webhook` — body brut (raw), header `stripe-signature` :
  - Vérif signature avec `STRIPE_WEBHOOK_SECRET` (Stripe SDK `webhooks.constructEvent`).
  - Si `payment_intent.succeeded` → update Payment status=SUCCEEDED + stripePaymentIntentId + stripeChargeId.
  - Si `payment_intent.payment_failed` → update Payment status=FAILED + errorCode + errorMessage.
  - Si `account.updated` (Stripe Connect) → update SellerStripeAccount status + capabilities.
  - Autres events → log et ignore.
  - Return 200 quel que soit le résultat (Stripe expect 2xx pour ne pas retry).

Tests : 5 specs (signature invalide → 400, payment_intent.succeeded → DB updated, payment_intent.payment_failed → DB updated, account.updated → SellerStripeAccount updated, event inconnu → 200 ignored).

### 3.3 Frontend — page buyer checkout

Créer `apps/frontend/src/app/(dashboard)/buyer/payments/checkout/[rfqId]/page.tsx` :
- Server component qui :
  - Charge la RFQ + offer + seller.
  - Vérifie status=WON.
  - Si pas onboardé seller → erreur "Seller pas configuré pour paiement".
  - Sinon affiche bouton "Payer {amount} EUR via Stripe" → POST checkout-session → redirect window.location vers checkoutUrl.
- Page `/buyer/payments/return/[paymentId]` — display Payment status après redirect Stripe.
- Page `/buyer/payments/cancel/[paymentId]` — display annulation.

3 specs frontend (checkout button render, redirect on click, status display).

### 3.4 EmailLog confirmation paiement

Étendre webhook handler : sur `payment_intent.succeeded`, appeler `NotifEmailService.send` avec template `payment-confirmed-to-buyer` (créer template stub FR + EN au passage). Notification non-bloquante (try/catch + warn).

Templates :
- `apps/backend/src/notif-email/templates/payment-confirmed-to-buyer.template.ts` (FR)
- `apps/backend/src/notif-email/templates/payment-confirmed-to-buyer.en.template.ts` (EN)
- Specs minimales (sujet + body + footer).

Registry étendu.

### 3.5 Documentation

`docs/marketplace/PAY_1_PHASE_1_LOT_3_PAYMENT_INTENT_BUYER.md` :
- Flow checkout buyer end-to-end.
- Webhook events handled.
- Application fee 5% calculation.
- Templates email confirmation.
- TODO LOT 4+ (refunds, disputes, Reporting, Multi-currency).

### 3.6 Preuves LOT 3

```
git log --oneline pay-1-ph1-seller-onboarding-frontend..pay-1-ph1-payment-intent-buyer
git diff pay-1-ph1-seller-onboarding-frontend..pay-1-ph1-payment-intent-buyer --stat
grep -n "checkout-session\|webhook" apps/backend/src/payments/payments.controller.ts | head -10
grep -n "application_fee_amount\|transfer_data" apps/backend/src/payments/ -r 2>&1 | head -5
ls apps/frontend/src/app/\(dashboard\)/buyer/payments/
ls apps/backend/src/notif-email/templates/payment-confirmed*
pnpm --filter @iox/backend test src/payments 2>&1 | tail -10
pnpm --filter @iox/backend test src/notif-email 2>&1 | tail -10
pnpm --filter @iox/frontend test buyer/payments 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
ls docs/marketplace/PAY_1_PHASE_1_LOT_3_PAYMENT_INTENT_BUYER.md
```

---

## Pre-flight checks (avant LOT 1)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline -1 main                                        # → f902287
git stash list                                                   # → vide
git branch | wc -l                                               # → 2
pnpm install --frozen-lockfile 2>&1 | tail -3
pnpm --filter @iox/backend exec prisma generate 2>&1 | tail -3
docker compose ps 2>&1 | head -5
```

Tout vert → démarrer LOT 1. Sinon STOP + handoff.

---

## Format rapport final attendu (`notes/handoff-megamandat-40.md`)

```
# Méga-mandat 40 — handoff PAY-1 phase 1 POC Stripe Connect

## TL;DR
- LOT 1 schema+onboarding backend : ✅ / 🟡 / ❌ — N commits, M specs
- LOT 2 frontend onboarding seller : ✅ / 🟡 / ❌
- LOT 3 payment intent buyer + webhook : ✅ / 🟡 / ❌
- main intact (f902287)
- 1 migration Prisma additive (pay_1_ph1_payments_and_stripe_accounts)
- 0 push, deploy, ssh, appel Stripe réel

## Branches livrées
- pay-1-ph1-schema-and-onboarding-backend (HEAD: ...)
- pay-1-ph1-seller-onboarding-frontend (HEAD: ...)
- pay-1-ph1-payment-intent-buyer (HEAD: ...)

## LOT 1 — preuves brutes
[recopier sortie 10 commandes]

## LOT 2 — preuves brutes
[recopier sortie 7 commandes]

## LOT 3 — preuves brutes
[recopier sortie 11 commandes]

## Blocages rencontrés
[liste exhaustive]

## Notes pour push cascade
- ordre : schema → frontend → buyer (chaînés)
- 1 migration Prisma additive → cascade safe (vérifier prisma migrate diff CI vert)
- env vars VPS à configurer post-merge LOT 1 :
  - STRIPE_SECRET_KEY (test mode `sk_test_...`)
  - STRIPE_WEBHOOK_SECRET (`whsec_...`)
  - STRIPE_PUBLISHABLE_KEY (`pk_test_...`)
- webhook URL Stripe à configurer côté dashboard : https://iox.mycloud.yt/api/v1/payments/webhook
- POC test mode uniquement V1, pas de paiement réel
```

---

## TL;DR pour Claude Code

3 LOTs, ~6h, branches chaînées locales, **1 migration Prisma additive**, ~30+ nouveaux specs jest+vitest, aucun appel Stripe réel (mock SDK via factory DI). Si doute, STOP + doc.

Caveman resume off pour ce livrable car prompt opérationnel.
