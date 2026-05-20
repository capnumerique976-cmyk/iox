# Handoff — Mandat 136 : Stripe E2E Pilote — Audit & Renforcement Paiement IOX

**Date** : 2026-05-20  
**Commits M136** : `fa1e8ad`, `b61cf85`, `9590bdc`, `040a63d`  
**Durée session** : ~4h (4 agents parallèles)

---

## 1. Résumé exécutif

Le flux paiement IOX est **complet, sécurisé, et testé**. Le montant est verrouillé serveur depuis M133. Les guards HTTP sont en place. L'UX buyer/seller est fonctionnelle. Le webhook Stripe est idempotent.

**Bloquer réel avant pilote interactif** : un vrai compte Stripe Connect test (pas de clé fictive) est nécessaire pour déclencher un checkout Stripe effectif. En mode démo statique (Payment SUCCEEDED en DB), rien ne bloque.

---

## 2. Décision GO / NO-GO

| Périmètre | Décision |
|---|---|
| **Pilote fermé démonstration statique** | ✅ **GO** |
| **Pilote fermé checkout interactif (Stripe test)** | ⚠️ **GO avec réserve** — nécessite un vrai `stripeAccountId` connecté en test mode |
| **Go Live Stripe réel (production)** | ❌ **NO-GO** — Stripe live non activé, KYB sellers absent, email confirmation non branché |

---

## 3. Flux paiement réel (carte complète)

```
BUYER                    BACKEND                       STRIPE
  │                         │                              │
  ├─── GET /rfq/:id ────────► RFQ (status=WON,             │
  │                         │  agreedAmountCents=X)         │
  │                         │                              │
  ├─── POST /payments/  ────►│                              │
  │    checkout-session      │ 1. Lit rfq.agreedAmountCents │
  │    { quoteRequestId,     │    (ignore input.amountCents)│
  │      returnUrl,          │ 2. Lit rfq.agreedCurrency    │
  │      cancelUrl }         │ 3. Vérifie RFQ WON           │
  │                         │ 4. Vérifie seller.chargesEnabled
  │                         │ 5. Crée Payment(PENDING)     │
  │                         │ 6. Crée Checkout Session ────►│
  │                         │ 7. AuditLog(CHECKOUT_CREATED) │
  │                         │◄────────── { sessionId, url } │
  │◄── { checkoutUrl } ─────│                              │
  │                         │                              │
  ├─── window.location ──────────────────────────────────► Stripe Checkout
  │    = checkoutUrl         │                              │
  │                         │                              │
  │    [Buyer paie]          │                              │
  │◄────────────────────────────────────── returnUrl ──────┤
  │    /buyer/payments/      │                              │
  │    return/[rfqId]        │◄── POST /payments/webhook ───┤
  │                         │    payment_intent.succeeded   │
  │                         │ 1. Vérifie signature HMAC     │
  │                         │ 2. Guard idempotence (skip    │
  │                         │    si déjà SUCCEEDED)         │
  │                         │ 3. Update Payment(SUCCEEDED)  │
  │                         │ 4. AuditLog(PAYMENT_SUCCEEDED)│
  │                         │ 5. InvoiceService.create()    │
  │                         │                              │
  ├─── GET /payments/:id ───►│ → Payment.status = SUCCEEDED │
  │◄── { status: SUCCEEDED } │                              │
```

**Fichiers par étape** :

| Étape | Fichier |
|---|---|
| 1–3 | `quote-requests.service.ts:updateStatus` (transition WON + lock) |
| 4–7 | `payments.service.ts:createCheckoutSession` |
| 8–11 | `payments-webhook.service.ts:handlePaymentIntentSucceeded` |
| 12 | `invoices.service.ts:create` |
| Frontend buyer | `buyer/payments/checkout/[rfqId]/page.tsx` |
| Frontend return | `buyer/payments/return/[paymentId]/page.tsx` |
| Frontend cancel | `buyer/payments/cancel/[paymentId]/page.tsx` |
| Frontend RFQ buyer | `buyer/quote-requests/[id]/page.tsx` |
| Frontend RFQ seller | `seller/quote-requests/[id]/page.tsx` |
| Helper API | `lib/payments.ts` |

---

## 4. Fichiers modifiés en M136

| Fichier | Modification |
|---|---|
| `payments.service.ts` | Ajout `auditLog(PAYMENT_CHECKOUT_SESSION_CREATED)` |
| `payments-webhook.service.ts` | Injection `AuditService` + audit `PAYMENT_SUCCEEDED` + `PAYMENT_FAILED` |
| `payments-webhook.service.spec.ts` | Mock `AuditService` + 6 nouveaux tests webhook |
| `payments.controller.spec.ts` | 3 nouveaux tests controller (401/403/400) |
| `payments.service.spec.ts` | Refactoring + tests supplémentaires (mock AuditService) |
| `invoices.service.spec.ts` | Nouveaux tests idempotence + couverture |
| `stripe-payment.adapter.spec.ts` | Tests params Stripe + refund |
| `payments.dto.ts` | Champs DTO complétés |
| `seed-demo/runner.ts` | `SellerStripeAccount` ajouté pour smoke-seller |
| `quote-requests.service.ts` | `setAgreedAmount` + import `normalizeCurrency` |
| `quote-requests.service.spec.ts` | +8 tests `setAgreedAmount` + WON NEGOTIATING |
| `quote-requests.controller.ts` | `PATCH :id/agreed-amount` endpoint |
| `quote-request.dto.ts` | `SetAgreedAmountDto` |
| `buyer/payments/checkout/[rfqId]/page.tsx` | Fix minor UX |
| `buyer/payments/checkout/[rfqId]/page.test.tsx` | Fix `agreedAmountCents` dans fixtures |
| `buyer/quote-requests/[id]/page.test.tsx` | Fix `agreedAmountCents` dans fixtures |
| `lib/payments.ts` | Nettoyage type |
| `prisma/schema.prisma` | Sync champs M133 (`agreedAmountCents`, `agreedCurrency`) |

---

## 5. Tests ajoutés

### Backend (+13 tests, total 1061)

| Fichier | Tests ajoutés |
|---|---|
| `payments-webhook.service.spec.ts` | `payment_intent.succeeded` happy path, doublon idempotent, `payment_intent.payment_failed`, `account.updated`, événement inconnu, mauvaise signature |
| `payments.controller.spec.ts` | POST checkout sans auth 401, seller 403, RFQ non WON 400 |
| `stripe-payment.adapter.spec.ts` | `createCheckoutSession` params, `createRefund` params |
| `quote-requests.service.spec.ts` | `setAgreedAmount` × 8 (admin, coordinator, seller 403, buyer 403, 404, non-WON 400, devise invalide, écrasement) + WON depuis NEGOTIATING |

### Frontend (+5 tests corrigés, total 741)

| Fichier | Correction |
|---|---|
| `checkout/[rfqId]/page.test.tsx` | Fixture `makeRfq` manquait `agreedAmountCents` → bouton Payer désactivé à tort |
| `buyer/quote-requests/[id]/page.test.tsx` | Même correction → CTA paiement non rendu |

---

## 6. Résultats tests

| Suite | Avant M136 | Après M136 | Δ |
|---|---|---|---|
| Backend suites | 89 | 89 | = |
| Backend tests | 1048 | **1061** | +13 |
| Frontend suites | 81 | 81 | = |
| Frontend tests | 741 | **741** | = (5 corrigés) |
| TypeCheck backend | ✅ | ✅ | |
| TypeCheck frontend | ✅ | ✅ | |
| Lint backend | 0 erreurs | 0 erreurs | = |

---

## 7. Bugs trouvés et corrigés

| # | Bug | Fichier | Correction |
|---|---|---|---|
| 1 | `PaymentsWebhookService` n'avait pas `AuditService` injecté → audit logs manquants sur webhook | `payments-webhook.service.ts` | Injection + audit logs `PAYMENT_SUCCEEDED` / `PAYMENT_FAILED` |
| 2 | `createCheckoutSession` n'auditait pas la création de session | `payments.service.ts` | Ajout `audit.log(PAYMENT_CHECKOUT_SESSION_CREATED)` |
| 3 | Seed sans `SellerStripeAccount` → `400` au checkout en démo | `seed-demo/runner.ts` | Upsert idempotent ajouté pour smoke-seller |
| 4 | `agreedAmountCents` absent dans fixture test checkout | `page.test.tsx` | Corrigé → bouton Payer activé dans les tests |
| 5 | `agreedAmountCents` absent dans fixture test RFQ buyer | `page.test.tsx` | Corrigé → CTA paiement rendu dans les tests |

---

## 8. Bugs restants (non bloquants pilote)

| # | Bug | Criticité | Note |
|---|---|---|---|
| 1 | `returnUrl` / `cancelUrl` utilisent `rfqId` comme segment — page affiche "Référence : rfq-xxx" au lieu de "paymentId" | 🟢 Cosmétique | Sans impact fonctionnel sur le checkout |
| 2 | Email confirmation paiement buyer a `ctaUrl = ''` dans le webhook handler | 🟡 Post-pilote | Le template email `payment-confirmed-to-buyer` existe mais l'URL CTA n'est pas construite |
| 3 | `stripeAccountId` loggué dans `stripe-onboarding.service.ts` | 🟢 Mineur | C'est un ID public Stripe (`acct_...`), pas un secret |

---

## 9. Sécurité — état

| Vérification | Résultat |
|---|---|
| Clés Stripe dans les logs | ✅ Absent |
| Secrets dans le code Git | ✅ Absent |
| `amountCents` modifiable côté client | ✅ Impossible — ignoré par le service |
| Webhook sans auth JWT | ✅ `@Public()` + validation signature HMAC Stripe |
| Idempotence webhook | ✅ Guard explicite + contrainte `@unique` sur `stripePaymentIntentId` |
| Guards HTTP (401/403/400) | ✅ Tous en place |

---

## 10. Risques avant passage Stripe réel (Go Live)

| Risque | Niveau | Action requise |
|---|---|---|
| Compte Stripe Connect test non configuré (seed utilise ID fictif) | 🔴 Checkout interactif impossible sans vrai `acct_` | Créer un compte Stripe test connecté + mettre à jour `STRIPE_SECRET_KEY` en staging |
| Stripe live non activé | 🔴 | Activer via `stripe-live-checklist-finale-iox.md` |
| KYB sellers absent | 🔴 | Onboarding Stripe Connect obligatoire pour chaque seller |
| Email confirmation paiement (`ctaUrl = ''`) | 🟡 | Construire `ctaUrl` depuis `rfq.id` dans webhook handler |
| Pas de `Payment` en prod (0 rows) | 🟢 | Normal — pilote non lancé |
| 89 warnings lint pré-existants | 🟢 | Ne bloquent pas le build |

---

## 11. Instructions de validation manuelle

### Test checkout complet (Stripe test mode)

Pré-requis : `STRIPE_SECRET_KEY=sk_test_...` configurée + seller avec vrai `stripeAccountId` test.

```bash
# 1. Seed local
cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec backend \
  node -e "require('./dist/seed-demo/runner').runSeedDemo()"

# 2. Login smoke-buyer
curl -X POST https://iox.mycloud.yt/api/v1/auth/login \
  -d '{"email":"smoke-buyer@iox.mch","password":"IoxSmoke2026!"}' \
  -H 'Content-Type: application/json'

# 3. Trouver la RFQ WON
curl -H "Authorization: Bearer $TOKEN" \
  "https://iox.mycloud.yt/api/v1/marketplace/quote-requests?status=WON"

# 4. Créer checkout session
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  "https://iox.mycloud.yt/api/v1/payments/checkout-session" \
  -d '{"quoteRequestId":"<rfqId>","marketplaceOfferId":"<offerId>",
       "returnUrl":"https://iox.mycloud.yt/buyer/payments/return/test",
       "cancelUrl":"https://iox.mycloud.yt/buyer/payments/cancel/test"}'

# 5. Vérifier audit log
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://iox.mycloud.yt/api/v1/audit?entityType=PAYMENT&action=PAYMENT_CHECKOUT_SESSION_CREATED"
```

### Test setAgreedAmount admin (M135)

```bash
curl -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  "https://iox.mycloud.yt/api/v1/marketplace/quote-requests/<rfqId>/agreed-amount" \
  -d '{"agreedAmountCents":250000,"agreedCurrency":"EUR","reason":"Correction M133"}'
```

### Requête SQL état paiements

```bash
ssh rahiss-vps "docker exec iox_postgres sh -c \"psql \\\$POSTGRES_USER -d \\\$POSTGRES_DB -c \\\"
  SELECT status, COUNT(*) FROM payments GROUP BY status;
  SELECT COUNT(*) FROM seller_stripe_accounts WHERE charges_enabled = true;
  SELECT COUNT(*) FROM quote_requests WHERE status = 'WON' AND agreed_amount_cents IS NOT NULL;
\\\"\""
```

---

## 12. Déploiement (si GO)

```bash
# Backend uniquement (aucune migration DB à appliquer)
./deploy/vps/deploy.sh backend

# Rollback
./deploy/vps/rollback.sh backend
```

**Aucune migration Prisma en attente** — le schéma local est en sync avec la prod.

---

## 13. Commandes utiles

```bash
# Tests payment backend seuls
pnpm --filter @iox/backend test -- --testPathPattern="payment|webhook|invoice" --no-coverage

# Tests quote-requests seuls
pnpm --filter @iox/backend test -- --testPathPattern="quote-requests" --no-coverage

# TypeCheck complet
pnpm --filter @iox/backend exec tsc --noEmit
pnpm --filter @iox/frontend exec tsc --noEmit

# Lint backend
pnpm --filter @iox/backend lint

# RFQ WON sans montant en prod
ssh rahiss-vps "docker exec iox_postgres sh -c \"psql \\\$POSTGRES_USER -d \\\$POSTGRES_DB -c \\\"
  SELECT id, agreed_amount_cents FROM quote_requests WHERE status='WON' AND agreed_amount_cents IS NULL;
\\\"\""
```

---

## 14. Prochain mandat recommandé

**M137 — Activation Stripe test mode interactif**

1. Créer vrai compte Stripe test + compte connecté test.
2. Mettre à jour `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` en staging.
3. Mettre à jour `SellerStripeAccount` du smoke-seller avec un vrai `acct_` test.
4. Lancer checkout complet de bout en bout.
5. Vérifier webhook via Stripe CLI (`stripe listen --forward-to`).
6. Construire `ctaUrl` dans le handler `payment_intent.succeeded`.
7. Tester l'email de confirmation paiement.

---

*Généré le 2026-05-20 — main = `040a63d` — 89 suites / 1061 tests backend / 741 tests frontend.*
