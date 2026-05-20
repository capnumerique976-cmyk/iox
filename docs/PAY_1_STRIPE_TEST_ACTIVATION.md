# PAY-1 — Guide d'activation Stripe test mode interactif

**Mandat** : M137  
**Statut** : Prêt à exécuter — nécessite un compte Stripe real (test mode)  
**Durée estimée** : 30–60 min (setup Stripe Dashboard)

---

## Contexte

Le flux paiement IOX est complet et testé en mode mock. Pour déclencher un checkout Stripe réel (mode test), il faut :

1. Une clé secrète Stripe test (`sk_test_...`)
2. Une clé webhook (`whsec_...`) pour valider les signatures
3. Un compte Stripe Connect connecté (`acct_test_...`) pour le smoke-seller
4. La Stripe CLI pour relayer les webhooks en local / staging

---

## Étape 1 — Créer un compte Stripe test

> ⚠️ Utiliser **exclusivement le mode test** (basculer "Test mode" dans le Dashboard Stripe).

### 1.1 Récupérer les clés API test

1. Aller sur [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. Copier :
   - **Secret key** : `sk_test_...` → `STRIPE_SECRET_KEY`
   - **Publishable key** : `pk_test_...` → `STRIPE_PUBLISHABLE_KEY` (frontend, non utilisé V1)

### 1.2 Créer un compte Connect test (pour le smoke-seller)

1. Aller sur [dashboard.stripe.com/test/connect/accounts](https://dashboard.stripe.com/test/connect/accounts)
2. Créer un compte Express test (pays : FR ou autre)
3. Activer manuellement `charges_enabled` via Dashboard (test mode bypass)
4. Copier l'ID : `acct_...` → utilisé dans le seed

---

## Étape 2 — Configurer les variables d'environnement

### Local (`.env` dans `apps/backend/`)

```env
STRIPE_SECRET_KEY="sk_test_51..."
STRIPE_WEBHOOK_SECRET="whsec_..."   # généré à l'étape 3
STRIPE_PUBLISHABLE_KEY="pk_test_51..."
```

### VPS (`/opt/apps/iox/apps/backend/.env`)

```bash
ssh rahiss-vps "nano /opt/apps/iox/apps/backend/.env"
# Ajouter les 3 variables ci-dessus
```

> **Ne jamais committer ces clés** — `.env` est dans `.gitignore`.

---

## Étape 3 — Configurer le webhook Stripe

### Option A : Stripe CLI (local / staging)

```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Relayer vers le backend local
stripe listen --forward-to http://localhost:3001/api/v1/payments/webhook

# La CLI affiche :
# > Ready! Your webhook signing secret is whsec_... (^C to quit)
# Copier cette valeur → STRIPE_WEBHOOK_SECRET dans .env
```

### Option B : Webhook endpoint dans le Dashboard (VPS staging)

1. Aller sur [dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
2. Ajouter endpoint : `https://iox.mycloud.yt/api/v1/payments/webhook`
3. Sélectionner les événements :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated`
4. Copier le "Signing secret" → `STRIPE_WEBHOOK_SECRET`

---

## Étape 4 — Mettre à jour le seed demo

Dans `apps/backend/src/seed-demo/runner.ts`, remplacer l'ID fictif par le vrai `acct_` test :

```typescript
// Remplacer :
stripeAccountId: 'acct_demo_stripe_test_001',

// Par le vrai ID test Stripe :
stripeAccountId: 'acct_VOTRE_ID_TEST_ICI',
```

Ou passer via une variable d'environnement :

```typescript
stripeAccountId: process.env.SEED_STRIPE_ACCOUNT_ID ?? 'acct_demo_stripe_test_001',
```

Relancer le seed :

```bash
# Local
pnpm --filter @iox/backend seed:demo

# VPS
ssh rahiss-vps "docker compose -f /opt/apps/iox/docker-compose.vps.yml exec backend \
  node -e \"require('./dist/seed-demo/runner').runSeedDemo()\""
```

---

## Étape 5 — Vérifier `isConfigured()` backend

```bash
# Après redémarrage du backend, vérifier que Stripe est chargé :
curl -s https://iox.mycloud.yt/api/v1/payments/checkout-session \
  -X POST -H "Authorization: Bearer INVALID" | jq .statusCode
# Doit retourner 401, pas 400 "Stripe non configuré"
```

---

## Étape 6 — Checkout complet de bout en bout

### Pré-requis

- `STRIPE_SECRET_KEY` configurée + backend redémarré
- Smoke-seller avec vrai `stripeAccountId` (Stripe test, `charges_enabled: true`)
- Stripe CLI en écoute (option A) OU webhook endpoint configuré (option B)

### Séquence de test

```bash
# 1. Login buyer
TOKEN=$(curl -sX POST https://iox.mycloud.yt/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke-buyer@iox.mch","password":"IoxSmoke2026!"}' \
  | jq -r '.accessToken')

# 2. Trouver RFQ WON
RFQ_ID=$(curl -sH "Authorization: Bearer $TOKEN" \
  "https://iox.mycloud.yt/api/v1/marketplace/quote-requests?status=WON" \
  | jq -r '.data[0].id')

echo "RFQ WON: $RFQ_ID"

# 3. Créer checkout session
OFFER_ID=$(curl -sH "Authorization: Bearer $TOKEN" \
  "https://iox.mycloud.yt/api/v1/marketplace/quote-requests/$RFQ_ID" \
  | jq -r '.marketplaceOfferId')

SESSION=$(curl -sX POST "https://iox.mycloud.yt/api/v1/payments/checkout-session" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"quoteRequestId\":\"$RFQ_ID\",
    \"marketplaceOfferId\":\"$OFFER_ID\",
    \"returnUrl\":\"https://iox.mycloud.yt/buyer/payments/return/test\",
    \"cancelUrl\":\"https://iox.mycloud.yt/buyer/payments/cancel/test\"
  }")

echo "Checkout URL: $(echo $SESSION | jq -r '.checkoutUrl')"
# → Ouvrir l'URL dans le navigateur
```

### Carte de test Stripe (mode test)

| Scénario | Numéro carte | CVC | Expiry |
|---|---|---|---|
| Paiement réussi | `4242 4242 4242 4242` | Quelconque | Date future |
| Carte refusée | `4000 0000 0000 0002` | Quelconque | Date future |
| 3D Secure | `4000 0025 0000 3155` | Quelconque | Date future |

---

## Étape 7 — Vérifier le webhook reçu

```bash
# Stripe CLI affiche les events en temps réel
# OU vérifier via audit logs :
ADMIN_TOKEN=...
curl -sH "Authorization: Bearer $ADMIN_TOKEN" \
  "https://iox.mycloud.yt/api/v1/audit?entityType=PAYMENT&action=PAYMENT_SUCCEEDED" \
  | jq '.data[0]'
```

---

## Étape 8 — Vérifier l'email de confirmation

Après paiement réussi, l'email `payment-confirmed-to-buyer` doit être envoyé avec :
- `ctaUrl` = `https://iox.mycloud.yt/buyer/payments` ✅ (fixé en M137)
- `offerTitle` = titre de l'offre
- `amountFormatted` = montant en EUR/USD

---

## Checklist finale avant go-live Stripe réel

- [ ] `STRIPE_SECRET_KEY` test configurée + backend sain
- [ ] Smoke-seller avec vrai `acct_` Stripe test + `charges_enabled: true`
- [ ] Webhook endpoint configuré (Dashboard ou CLI)
- [ ] Checkout complet testé avec carte `4242...` → `SUCCEEDED`
- [ ] Checkout testé avec carte refusée `4000...0002` → `FAILED`
- [ ] Email confirmation reçu avec `ctaUrl` non-vide
- [ ] Audit logs `PAYMENT_SUCCEEDED` + `PAYMENT_CHECKOUT_SESSION_CREATED` présents
- [ ] Vérifier que Telemante / Agora / Vavo toujours up (`docker ps` sur VPS)

---

## Problèmes connus

| Symptôme | Cause | Solution |
|---|---|---|
| `400 Stripe non configuré` | `STRIPE_SECRET_KEY` absente | Configurer `.env` + restart backend |
| `400 Le vendeur n'est pas configuré` | `SellerStripeAccount.chargesEnabled = false` | Mettre à jour le seed ou activer via Dashboard |
| Webhook non reçu | `STRIPE_WEBHOOK_SECRET` incorrecte | Régénérer via CLI ou Dashboard |
| `Payment PENDING` après paiement | Webhook non relayé | Vérifier Stripe CLI écoute / endpoint Dashboard |
| `acct_demo_stripe_test_001` → erreur Stripe | ID fictif dans seed | Remplacer par vrai `acct_` test |

---

*Rédigé dans M137 — main = `chore/m137-stripe-test-interactive` — 2026-05-20*
