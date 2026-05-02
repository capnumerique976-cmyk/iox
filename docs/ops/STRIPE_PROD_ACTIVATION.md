# Activation Stripe Connect Express en production

> Doc de bascule du module `payments` du mode dégradé (Stripe non configuré) vers Stripe Connect Express **en test mode** (sk_test_...). À exécuter par l'ops user.

## TL;DR

1. Créer compte Stripe + activer Connect Express (test mode).
2. Configurer webhook côté dashboard Stripe (URL + 3 events).
3. Récupérer 3 clés Stripe.
4. Lancer `deploy/scripts/activate-stripe.sh` (bascule env VPS + restart).
5. Lancer `deploy/scripts/smoke-stripe-onboarding.sh` (vérifie pipeline post-bascule).
6. Test UI manuel `/seller/payments` → onboarding flow Stripe Express.
7. Si problème → rollback en 30 sec via revert env vars + restart.

---

## 1. Pré-requis Stripe

- [ ] Compte Stripe créé : https://dashboard.stripe.com/register (mode test par défaut).
- [ ] Connect Express activé : Dashboard → Connect → Get started → Express.
- [ ] Profil plateforme rempli : nom plateforme `IOX Marketplace`, business type, country, support email.
- [ ] Test mode enclenché (toggle haut-droit dashboard).

---

## 2. Webhook côté Stripe

Dashboard Stripe → Developers → Webhooks → Add endpoint.

### URL endpoint

```
https://iox.mycloud.yt/api/v1/payments/webhook
```

### Events à écouter (3 minimum V1)

- `payment_intent.succeeded` — Payment row passe à SUCCEEDED + email confirmation buyer.
- `payment_intent.payment_failed` — Payment row passe à FAILED + errorCode/Message.
- `account.updated` — Sync flags charges/payouts/details + status SellerStripeAccount.

### Signing secret

Récupérer après création endpoint : `whsec_...` (visible une seule fois côté Stripe — stocker en sécurité).

---

## 3. 3 clés à récupérer

| Variable env | Source | Format |
|---|---|---|
| `STRIPE_SECRET_KEY` | Dashboard → Developers → API keys → Secret key | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | Dashboard → Developers → API keys → Publishable key | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Dashboard → Developers → Webhooks → endpoint → Signing secret | `whsec_...` |

**JAMAIS** committer ces clés dans le repo. Stocker dans `.env` VPS (root-only) ou secret manager.

---

## 4. Bascule env VPS

### Variables à set dans `.env` VPS

```
STRIPE_SECRET_KEY=sk_test_xxx_secret
STRIPE_WEBHOOK_SECRET=whsec_xxx_secret
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### Script automatisé

```bash
# Local : exporter les 3 vars avant exécution
export STRIPE_SECRET_KEY=sk_test_xxx
export STRIPE_WEBHOOK_SECRET=whsec_xxx
export STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Lance bascule via SSH
./deploy/scripts/activate-stripe.sh
```

Le script :
1. Backup `.env` actuel (`.env.backup-stripe-YYYYMMDD-HHMMSS`).
2. Update les 3 vars dans `.env` VPS.
3. Restart container backend (Docker Compose).
4. Healthcheck `/api/v1/health`.
5. Vérifie que `/api/v1/payments/connect/account-status` répond 401 (auth requise) au lieu d'erreur 500 (Stripe non configuré).

---

## 5. Smoke post-bascule

```bash
./deploy/scripts/smoke-stripe-onboarding.sh
```

Le script :
1. Login `smoke-seller@iox.mch`.
2. POST `/api/v1/payments/connect/onboarding-link` avec returnUrl/refreshUrl factices.
3. Vérifie response `{ url, expiresAt }` avec URL Stripe Express valide (`https://connect.stripe.com/express/...`).
4. Query DB : `SellerStripeAccount` créé avec status `PENDING_ONBOARDING` + `stripeAccountId=acct_...`.

Validation manuelle additionnelle :
- Login UI seller → `/seller/payments` → bouton "Démarrer l'onboarding".
- Click bouton → redirect vers Stripe Express (page hosted Stripe avec form KYC).
- Stripe test mode : remplir avec données fictives validées (cf. https://stripe.com/docs/connect/testing).
- Au retour `/seller/payments/return` → status passe à `ONBOARDING_INCOMPLETE` ou `CHARGES_ENABLED` selon avancement.

---

## 6. Smoke E2E test mode (Playwright)

```bash
cd apps/frontend
npx playwright test e2e/payments-onboarding-smoke.spec.ts -g "@stripe-prod"
```

Test taggé `@stripe-prod` skippé par défaut en CI normale. Active si `STRIPE_SECRET_KEY` présent dans env CI.

---

## 7. Rollback

Si problème (onboarding KO, webhook signature error, etc.) :

```bash
ssh rahiss-vps
cd /opt/apps/iox
# Option A : revert via backup horodaté
ls -t .env.backup-stripe-* | head -1   # → trouve le plus récent
cp .env.backup-stripe-YYYYMMDD-HHMMSS .env
docker compose -f docker-compose.vps.yml restart backend

# Option B : retirer juste les vars Stripe (graceful degradation)
sed -i 's/^STRIPE_SECRET_KEY=.*//' .env
sed -i 's/^STRIPE_WEBHOOK_SECRET=.*//' .env
docker compose -f docker-compose.vps.yml restart backend
```

Comportement V0 immédiat : factory `STRIPE_CLIENT.isConfigured()` retourne false, endpoints throw clair (`BadRequestException`). Données existantes (Payment rows + SellerStripeAccount) conservées en DB.

---

## 8. Coût Stripe (info)

| Phase | Coût |
|---|---|
| Test mode (sk_test_...) | Gratuit, illimité |
| Live mode | 1.4% + 0.25 EUR par paiement EUR (Connect 0.25%) |
| Refunds | Gratuit (Stripe rembourse les fees originaux) |
| Disputes (chargebacks) | 15 EUR par dispute (gagnée OU perdue) |

V1 reste en test mode. Bascule live mode = doc séparée future (chantier `STRIPE-LIVE-ACTIVATE`).

---

## 9. Monitoring post-bascule

- Dashboard Stripe → onglet "Payments" : volumes, success rate, errors.
- Dashboard Stripe → onglet "Connect" : accounts onboardés, capabilities.
- Backend `/admin/notif-email/logs` : audit trail emails confirmation paiement.
- Backend logs `[PaymentsController]` + `[PaymentsWebhookService]` : debug niveau request.

---

## 10. Sécurité

- Clés Stripe : **jamais** dans le repo. `.env` VPS root-only.
- Webhook signature : vérification obligatoire (`STRIPE_WEBHOOK_SECRET` requis sinon endpoint throw 400).
- Rotation recommandée : tous les 6 mois (regenerate dashboard).
- Rate limiting nginx : webhook endpoint déjà protégé via `limit_req zone=webhook` (cf. nginx.conf).

---

## 11. Liens

- Stripe Connect Express docs : https://stripe.com/docs/connect/express-accounts
- Test data : https://stripe.com/docs/connect/testing
- Webhook signature verification : https://stripe.com/docs/webhooks/signatures
