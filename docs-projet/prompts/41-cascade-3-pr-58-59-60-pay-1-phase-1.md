# Cascade 3 PR — #58 PAY-1 LOT 1 + #59 LOT 2 + #60 LOT 3

> Push + PR + merge + deploy de 3 branches chaînées (mandat 40 PAY-1 ph1 POC Stripe Connect). ~1h total.

## Branches à push

| PR | Branche | Parent | SHA |
|---|---|---|---|
| #58 | `pay-1-ph1-schema-and-onboarding-backend` | main `f902287` | `bf1edd1` |
| #59 | `pay-1-ph1-seller-onboarding-frontend` | LOT 1 | `73e9b6f` |
| #60 | `pay-1-ph1-payment-intent-buyer` | LOT 2 | `8f9cb76` |

3 branches chaînées. Rebase `--onto main` après chaque merge.

⚠️ **PR #58 contient 1 migration Prisma additive** : `20260430175711_pay_1_ph1_payments_and_stripe_accounts`. CI prisma-drift doit valider. Si rouge → STOP + investigate.

---

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                                       # → f902287714517009ca91009a741f0585055c4bb0
git rev-parse --short pay-1-ph1-schema-and-onboarding-backend             # → bf1edd1
git rev-parse --short pay-1-ph1-seller-onboarding-frontend                # → 73e9b6f
git rev-parse --short pay-1-ph1-payment-intent-buyer                      # → 8f9cb76
git stash list                                                            # → vide
git status --short                                                        # → propre côté trackés
which gh && gh auth status                                                # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                              # → ok (ControlMaster actif)
```

Si pas vert → STOP + `notes/handoff-cascade-41-stop.md`.

⚠️ Si `git status` montre `M prisma/migrations/migration_lock.toml` → vient de la branche LOT 3 active. Faire `git checkout main` d'abord (étape 1 le fera).

---

## Garde-fous

- ❌ Pas de force-push sur main.
- ❌ Pas de `gh pr merge --admin` sauf CI rouge.
- ✅ ControlMaster SSH actif → fail2ban couvert.
- ✅ Sleep 60s entre deploys.
- ⚠️ Migration Prisma additive PR #58 : surveillance CI `prisma-drift` job.
- ❌ Aucun appel Stripe réel (env vars STRIPE_* absentes côté VPS = graceful degradation au boot).

---

## Étapes

### 1. Pre-flight + sync remote

```
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3
```

Confirmer `origin/main = main = f902287`. Si avancé → STOP + signaler.

### 2. Push #58 (LOT 1 schema + onboarding backend)

```
git checkout pay-1-ph1-schema-and-onboarding-backend
git push -u origin pay-1-ph1-schema-and-onboarding-backend

gh pr create \
  --title "feat(payments): PAY-1 phase 1 LOT 1 — schema + onboarding backend Stripe Connect Express" \
  --body "$(cat <<'EOF'
## Résumé

LOT 1 du chantier PAY-1 phase 1 (POC Stripe Connect Express test mode). Pose le schéma Prisma + module backend `payments` + onboarding seller.

### Périmètre
- **Migration Prisma additive** `pay_1_ph1_payments_and_stripe_accounts` :
  - Enum `SellerStripeAccountStatus` (PENDING_ONBOARDING / ONBOARDING_INCOMPLETE / CHARGES_ENABLED / PAYOUTS_ENABLED / RESTRICTED).
  - Model `SellerStripeAccount` (1 par seller, FK SellerProfile, capabilities + requirements JSON).
  - Enum `PaymentStatus` (PENDING / REQUIRES_ACTION / PROCESSING / SUCCEEDED / FAILED / CANCELED / REFUNDED).
  - Model `Payment` (FK QuoteRequest + Offer + Seller + Buyer, amount + currency + applicationFee, stripe IDs unique, métadonnées JSON, indexes status/seller/buyer/quoteRequest).
- **Dépendance** : `stripe ^22.1.0` ajoutée au backend.
- **Module backend `payments`** :
  - `payments.service.ts` (CRUD + filtres + ownership).
  - `stripe-onboarding.service.ts` (createOrGet account, generateOnboardingLink, syncAccountStatus).
  - `payments-webhook.service.ts` (stub V1, traitement réel LOT 3).
  - 4 endpoints : `POST /connect/onboarding-link`, `POST /connect/refresh-status`, `GET /connect/account-status`, `POST /webhook` (stub).
  - Factory DI `STRIPE_CLIENT` (mock en tests, instance réelle si env présent).
- **Env vars optionnelles** : `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PUBLISHABLE_KEY` (graceful degradation absent).

### Tests
- Backend `payments` : 24 specs verts.
- TypeScript strict ✅.
- Migration additive (CREATE TABLE / INDEX / TYPE only).

### Reco PAY-1 ph0 appliquée
- Stripe Connect Express ✓
- Application fee 5% (LOT 3)
- EUR only V1 ✓
- Pas d'escrow ✓

### Hors scope
- LOT 2 frontend onboarding seller (PR #59).
- LOT 3 payment intent buyer + webhook complet (PR #60).
EOF
)" \
  --base main \
  --head pay-1-ph1-schema-and-onboarding-backend

gh pr checks --watch
```

⚠️ Surveille `prisma-drift` job. Si rouge → STOP + capturer logs migrate diff.

Si CI verte → continuer.

### 3. Merge #58 + sync + deploy + sleep

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

Vérifier migration appliquée :
```
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\dt payments seller_stripe_accounts'"
```

```
echo "💤 sleep 60 ..."
sleep 60
```

Capturer SHA squash.

### 4. Rebase #59 + push + PR (LOT 2 frontend onboarding)

```
git checkout pay-1-ph1-seller-onboarding-frontend
git rebase --onto main pay-1-ph1-schema-and-onboarding-backend pay-1-ph1-seller-onboarding-frontend
```

Conflits attendus : 0 (LOT 1 backend, LOT 2 frontend disjoint).

```
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push -u origin pay-1-ph1-seller-onboarding-frontend --force-with-lease

gh pr create \
  --title "feat(payments): PAY-1 phase 1 LOT 2 — frontend seller onboarding Stripe Connect Express" \
  --body "$(cat <<'EOF'
## Résumé

LOT 2 du chantier PAY-1 phase 1. Permet au seller d'onboarder son compte bancaire via Stripe Connect Express depuis le dashboard.

### Périmètre
- Helper API `apps/frontend/src/lib/payments.ts` : `getOnboardingLink`, `refreshAccountStatus`, `getAccountStatus`.
- Pages `/seller/payments/{,setup,return,refresh}` :
  - `/seller/payments` : status display 5 valeurs enum + bouton démarrer/poursuivre.
  - `/seller/payments/setup` : POST onboarding-link → redirect window.location vers Stripe.
  - `/seller/payments/return` : appelle refresh-status au mount → display nouveau status.
  - `/seller/payments/refresh` : relance flow setup si link expiré.

### Tests
- Frontend : 5 specs verts.
- TypeScript strict ✅.

### Hors scope
- LOT 3 buyer checkout (PR #60).
EOF
)" \
  --base main \
  --head pay-1-ph1-seller-onboarding-frontend

gh pr checks --watch
```

### 5. Merge #59 + sync + deploy + sleep

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"

echo "💤 sleep 60 ..."
sleep 60
```

### 6. Rebase #60 + push + PR (LOT 3 payment intent buyer)

```
git checkout pay-1-ph1-payment-intent-buyer
git rebase --onto main pay-1-ph1-seller-onboarding-frontend pay-1-ph1-payment-intent-buyer
```

Conflits attendus : 0.

```
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push -u origin pay-1-ph1-payment-intent-buyer --force-with-lease

gh pr create \
  --title "feat(payments): PAY-1 phase 1 LOT 3 — payment intent buyer + webhook handler complet + email confirmation" \
  --body "$(cat <<'EOF'
## Résumé

LOT 3 du chantier PAY-1 phase 1 (clôture). Permet au buyer de payer une RFQ WON via Stripe Checkout. Webhook handler gère 3 events. Template email confirmation FR + EN.

### Périmètre
- **Backend** :
  - Endpoint `POST /api/v1/payments/checkout-session` : crée Stripe Checkout Session avec `application_fee_amount` (5% gross) + `transfer_data.destination` (sellerStripeAccount).
  - Validation : RFQ status WON + seller charges_enabled=true sinon BadRequestException.
  - Webhook handler complet : `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated` (Stripe Connect).
- **Frontend** :
  - `/buyer/payments/checkout/[rfqId]` : server component, charge RFQ + offer + seller, affiche bouton paiement → POST checkout-session → redirect window.location.
  - `/buyer/payments/return/[paymentId]` : display Payment status post-redirect.
  - `/buyer/payments/cancel/[paymentId]` : display annulation.
- **Email** : Template `payment-confirmed-to-buyer` FR + EN (registry étendu, branchement webhook **reporté en PAY-2** = templates créés mais pas encore envoyés au webhook).

### Tests
- Backend payments + webhook : couverture étendue.
- Frontend : 3 specs nouveaux.
- Templates payment-confirmed : specs minimales.
- TypeScript strict ✅.

### Migration Prisma
Aucune (modèles déjà créés LOT 1).

### Application fee
5% gross (round down via `Math.floor(amountCents * 0.05)`).

### Hors scope (PAY-2)
- Branchement webhook → email send (templates posés, branchement réel reporté).
- Refunds workflow.
- Disputes / chargebacks UI.
- Multi-currency (EUR only V1).
- Module factures dédié.
EOF
)" \
  --base main \
  --head pay-1-ph1-payment-intent-buyer

gh pr checks --watch
```

### 7. Merge #60 + sync + deploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -7 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

Capturer SHA final.

### 8. Smoke fonctionnels combinés

```
echo "=== 1. Tables payments + seller_stripe_accounts présentes ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\dt payments seller_stripe_accounts'"

echo "=== 2. Endpoint /payments/connect/account-status (auth requise → 401 attendu) ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/payments/connect/account-status" | head -c 200

echo "=== 3. Endpoint /payments/checkout-session (auth requise → 401) ==="
curl -sS -w "\nHTTP %{http_code}\n" -X POST "https://iox.mycloud.yt/api/v1/payments/checkout-session" -H "Content-Type: application/json" -d '{}' | head -c 200

echo "=== 4. Webhook endpoint répond 400 sur signature manquante ==="
curl -sS -w "\nHTTP %{http_code}\n" -X POST "https://iox.mycloud.yt/api/v1/payments/webhook" -H "Content-Type: application/json" -d '{}' | head -c 200

echo "=== 5. Pages frontend ==="
curl -sS -o /dev/null -w "/seller/payments HTTP %{http_code}\n" "https://iox.mycloud.yt/seller/payments"
curl -sS -o /dev/null -w "/buyer/payments/checkout HTTP %{http_code}\n" "https://iox.mycloud.yt/buyer/payments/checkout/00000000-0000-0000-0000-000000000000"

echo "=== 6. STRIPE_SECRET_KEY env var (doit être unset par défaut) ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend printenv STRIPE_SECRET_KEY 2>/dev/null || echo 'unset (graceful degradation)'"

echo "=== 7. Templates email payment-confirmed dans dist ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend find /app/apps/backend/dist/notif-email/templates -name 'payment-confirmed*' 2>/dev/null"
```

Attendus :
- Tables `payments` + `seller_stripe_accounts` présentes.
- `/connect/account-status` HTTP 401 (auth requise).
- `/checkout-session` HTTP 401.
- Webhook 400 sur signature manquante.
- Pages frontend HTTP 200/302/404 selon session/RFQ.
- `STRIPE_SECRET_KEY` unset (graceful degradation).
- 2 templates payment-confirmed dans dist.

### 9. Validations finales

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline origin/main | head -7

echo "=== aucune branche pay-1-ph1 résiduelle ==="
git branch | grep "pay-1-ph1" || echo "OK aucune"

echo "=== bilan ==="
echo "main = $(git rev-parse --short origin/main)"
echo "Total squash PR cumulés:"
git log --oneline main --grep="(#" | wc -l
```

```
git branch -D pay-1-ph1-schema-and-onboarding-backend pay-1-ph1-seller-onboarding-frontend pay-1-ph1-payment-intent-buyer 2>/dev/null || echo "(déjà nettoyées)"
```

---

## Preuves anti-hallucination obligatoires

```
# 1. Les 3 PR mergées
for n in 58 59 60; do
  echo "--- PR #$n ---"
  gh pr view $n --json state,mergedAt,statusCheckRollup -q '"state:" + .state + " mergedAt:" + .mergedAt, "checks:", (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'
done

# 2. main local + remote
git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -7

# 3. Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"

# 4. Tables Prisma appliquées
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\dt payments seller_stripe_accounts'"

# 5. Endpoints payments protégés
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/payments/connect/account-status" | head -c 200
curl -sS -w "\nHTTP %{http_code}\n" -X POST "https://iox.mycloud.yt/api/v1/payments/webhook" -H "Content-Type: application/json" -d '{}' | head -c 200

# 6. STRIPE_SECRET_KEY unset (mode dégradé V1)
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend printenv STRIPE_SECRET_KEY 2>/dev/null || echo 'unset'"

# 7. Templates email payment dans dist
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend find /app/apps/backend/dist/notif-email/templates -name 'payment-confirmed*' 2>/dev/null"

# 8. Branches pay-1 supprimées
git branch | grep "pay-1-ph1" || echo "OK aucune"

# 9. Stash list vide
git stash list

# 10. Working tree propre
git status --short
```

---

## TL;DR rapport attendu

```
Cascade 3 PR PAY-1 ph1 — livrée ✅
- PR #58 + #59 + #60 mergées dans l'ordre. CI vert sur les 3 (incl. prisma-drift sur #58).
- 3 deploys VPS OK + healthchecks 3/3.
- Migration `pay_1_ph1_payments_and_stripe_accounts` appliquée prod (tables payments + seller_stripe_accounts).
- Endpoints payments protégés (401 sans auth, 400 webhook sans signature).
- STRIPE_SECRET_KEY unset (graceful degradation V1).
- 2 templates email payment-confirmed déployés (FR + EN).
- main = <SHA_FINAL> (était f902287), 58 lots cumulés (55 + 3).
- 0 branche pay-1-ph1 résiduelle, working tree propre.
- POC Stripe Connect prêt pour activation user (configurer STRIPE_SECRET_KEY test mode + webhook URL côté dashboard Stripe).
```

---

## Notes de sortie — activation Stripe par user

Après cascade, user doit (chantier ops séparé) :

1. Créer compte Stripe (test mode).
2. Activer Stripe Connect Express dans dashboard.
3. Récupérer :
   - `STRIPE_SECRET_KEY` (test) : `sk_test_...`
   - `STRIPE_PUBLISHABLE_KEY` (test) : `pk_test_...`
4. Configurer webhook côté dashboard Stripe :
   - URL : `https://iox.mycloud.yt/api/v1/payments/webhook`
   - Events : `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`
   - Récupérer signing secret : `STRIPE_WEBHOOK_SECRET=whsec_...`
5. Ajouter env vars VPS :
   ```
   ssh rahiss-vps "cd /opt/apps/iox && \
     sed -i 's/^STRIPE_SECRET_KEY=.*/STRIPE_SECRET_KEY=sk_test_xxx/' .env || echo 'STRIPE_SECRET_KEY=sk_test_xxx' >> .env"
   ```
6. Restart backend : `docker compose restart backend`.
7. Test onboarding seller via UI `/seller/payments` → suit redirect Stripe Connect.

Caveman resume off pour ce livrable car prompt opérationnel.
