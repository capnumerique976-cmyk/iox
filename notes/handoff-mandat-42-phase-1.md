# Méga-mandat 42 phase 1 — STRIPE-ACTIVATE-PREP — STOP volontaire

## TL;DR

- **Phase 1 livrée ✅** — commit `f8d031c` sur branche `stripe-activate-prep-scripts-and-smoke`.
- **STOP volontaire** : action user requise (Stripe + DNS + env VPS) AVANT phase 2.
- main intact (`3423eca`).
- 0 migration Prisma. 0 push, deploy, ssh.

## Branche livrée

`stripe-activate-prep-scripts-and-smoke` (HEAD `f8d031c`, depuis main `3423eca`).

## Périmètre

| Item | Statut |
|---|---|
| `docs/ops/STRIPE_PROD_ACTIVATION.md` (11 sections) | ✅ |
| `deploy/scripts/activate-stripe.sh` (exec, validation 3 vars) | ✅ |
| `deploy/scripts/smoke-stripe-onboarding.sh` (exec) | ✅ |
| `apps/frontend/e2e/payments-onboarding-smoke.spec.ts` (tag `@stripe-prod`) | ✅ |
| Update `docs/marketplace/PAY_1_PHASE_1_LOT_1_SCHEMA_ONBOARDING.md` | ✅ |

## Preuves brutes

```
$ git log --oneline main..stripe-activate-prep-scripts-and-smoke
f8d031c chore(ops): STRIPE-ACTIVATE-PREP — doc activation Stripe Connect Express + scripts shell + e2e smoke

$ git diff main..stripe-activate-prep-scripts-and-smoke --stat
 5 files changed, 420 insertions(+)

$ ls -la deploy/scripts/activate-stripe.sh deploy/scripts/smoke-stripe-onboarding.sh
-rwxr-xr-x  deploy/scripts/activate-stripe.sh        (3.2K)
-rwxr-xr-x  deploy/scripts/smoke-stripe-onboarding.sh (2.4K)

$ bash -n deploy/scripts/activate-stripe.sh && echo OK
syntax OK activate
$ bash -n deploy/scripts/smoke-stripe-onboarding.sh && echo OK
syntax OK smoke

$ ls docs/ops/STRIPE_PROD_ACTIVATION.md
docs/ops/STRIPE_PROD_ACTIVATION.md

$ wc -l docs/ops/STRIPE_PROD_ACTIVATION.md
189 docs/ops/STRIPE_PROD_ACTIVATION.md

$ ls apps/frontend/e2e/payments-onboarding-smoke.spec.ts
apps/frontend/e2e/payments-onboarding-smoke.spec.ts
```

---

## ACTION USER REQUISE AVANT PHASE 2

Ordre :

### 1. Créer compte Stripe (test mode)

- https://dashboard.stripe.com/register
- Toggle "Test mode" enclenché.
- Activer Connect Express (Dashboard → Connect → Get started → Express).

### 2. Configurer webhook côté Stripe

Dashboard → Developers → Webhooks → Add endpoint :

- **URL** : `https://iox.mycloud.yt/api/v1/payments/webhook`
- **Events** :
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `account.updated`
- Copier signing secret `whsec_...` (visible 1 seule fois).

### 3. Récupérer 3 clés

- `STRIPE_SECRET_KEY` (Developers → API keys → Secret key) : `sk_test_...`
- `STRIPE_WEBHOOK_SECRET` : `whsec_...` (du webhook créé étape 2)
- `STRIPE_PUBLISHABLE_KEY` (Developers → API keys → Publishable key) : `pk_test_...`

### 4. Bascule env VPS

```bash
# En local, exporter les 3 clés
export STRIPE_SECRET_KEY=sk_test_xxx
export STRIPE_WEBHOOK_SECRET=whsec_xxx
export STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Lance bascule
./deploy/scripts/activate-stripe.sh
```

### 5. Smoke post-bascule

```bash
./deploy/scripts/smoke-stripe-onboarding.sh
```

Attendu :
- Login smoke-seller OK.
- POST onboarding-link retourne URL `https://connect.stripe.com/express/...`.
- DB `seller_stripe_accounts` contient 1 row avec `stripeAccountId=acct_...` + status `PENDING_ONBOARDING`.

### 6. Validation manuelle UI

- Login UI seller smoke-seller@iox.mch (password IoxSmoke2026!).
- Navigate `/seller/payments`.
- Click "Démarrer l'onboarding" → redirect Stripe Express avec form KYC.
- Test mode : utiliser cartes test https://stripe.com/docs/connect/testing.
- Au retour `/seller/payments/return` → status évolue.

### 7. Confirmation

Une fois validation OK, dire "stripe activated" ou similaire pour démarrer **phase 2 PAY-2** (refunds + webhook → email + factures basiques).

---

## Phases 2-3-4 attendues après confirmation user

- **Phase 2 PAY-2** (~5h) : branche `pay-2-refunds-and-email-and-invoices` sur main. Refunds workflow + branchement webhook → email send + module factures basique (1 migration Prisma additive).
- **Phase 3 I18N-6** (~3.5h) : branche `i18n-6-public-extension`. +60 clés EN catalog + sellers + composants partagés.
- **Phase 4 MP-CATEGORY-1** (~5h) : branche `mp-category-1-admin`. CRUD admin catégories + tree view UI (1 migration Prisma additive éventuelle si modèle absent).

Total cumul phases 2-4 : ~13.5h.

## Notes pour push cascade phase 1

Branche `stripe-activate-prep-scripts-and-smoke` peut être pushée et mergée séparément (doc + scripts uniquement, aucun runtime change). Aucun risque deploy. Ordre cascade :

```
git push -u origin stripe-activate-prep-scripts-and-smoke
gh pr create --base main --head stripe-activate-prep-scripts-and-smoke --title "chore(ops): STRIPE-ACTIVATE-PREP — doc + scripts"
gh pr checks --watch
gh pr merge --squash --delete-branch
git pull --rebase origin main
./deploy/vps/deploy.sh all  # déploie scripts dans repo VPS, aucun runtime change
```

Après merge, scripts `deploy/scripts/activate-stripe.sh` et `smoke-stripe-onboarding.sh` accessibles côté VPS via `/opt/apps/iox/deploy/scripts/`.
