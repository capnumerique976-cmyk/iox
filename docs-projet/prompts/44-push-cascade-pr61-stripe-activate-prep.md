# Cascade PR #61 — push STRIPE-ACTIVATE-PREP (mandat 42 phase 1)

> Push + PR + merge + deploy de la branche `stripe-activate-prep-scripts-and-smoke`. ~30 min.
>
> **À exécuter SEULEMENT après** activation Stripe Connect dashboard + smoke onboarding vert (URL `connect.stripe.com/express/...` retournée).

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                              # → 3423eca199c6356bb58184e1d5d40b3655e7de01
git rev-parse --short stripe-activate-prep-scripts-and-smoke     # → f8d031c
git stash list                                                   # → vide
which gh && gh auth status                                       # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                     # → ok

# Vérif Stripe vraiment activé (smoke doit retourner URL)
./deploy/scripts/smoke-stripe-onboarding.sh
# Doit afficher URL connect.stripe.com/express/...
```

Si smoke 500 → STOP. Active Connect dashboard d'abord.
Si smoke OK → continue.

---

## Garde-fous

- 0 force-push main.
- 0 `gh pr merge --admin` sauf CI rouge.
- ControlMaster SSH actif → 1 deploy seul, pas de sleep.
- 0 migration Prisma cette PR.
- Branches mandat 43 (à venir) doivent rester intactes (vérifier rev-parse).

---

## Étapes

### 1. Pre-flight + sync

```
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3
```

Confirmer `origin/main = main = 3423eca`.

### 2. Push + PR #61

```
git checkout stripe-activate-prep-scripts-and-smoke
git push -u origin stripe-activate-prep-scripts-and-smoke

gh pr create \
  --title "chore(ops): STRIPE-ACTIVATE-PREP — doc activation Stripe Connect Express + scripts shell + e2e smoke" \
  --body "$(cat <<'EOF'
## Résumé

Mandat 42 phase 1 — préparation activation Stripe en prod. Doc complète + scripts shell + e2e smoke. Activation manuelle effectuée par user (compte Stripe + Connect Express + webhook + env vars VPS).

### Périmètre
- **Doc `docs/ops/STRIPE_PROD_ACTIVATION.md`** (179 lignes / 11 sections) : pré-requis, DKIM/SPF/DMARC pas requis Stripe (Resend), test envoi initial, bascule env VPS, smoke post-bascule, rollback, coûts.
- **Script `deploy/scripts/activate-stripe.sh`** : bascule SSH ControlMaster, backup `.env`, update 3 vars Stripe, restart backend, healthcheck. Validation format vars (sk_test_*, whsec_*, pk_test_*).
- **Script `deploy/scripts/smoke-stripe-onboarding.sh`** : login smoke-seller + POST `/payments/connect/onboarding-link` + vérif URL Stripe Express + check SellerStripeAccount DB.
- **E2E `apps/frontend/e2e/payments-onboarding-smoke.spec.ts`** (tag `@stripe-prod`, skip si STRIPE_SECRET_KEY absent).
- Section "Activation production" ajoutée à `docs/marketplace/PAY_1_PHASE_1_LOT_1_SCHEMA_ONBOARDING.md`.

### Tests
- TypeScript strict ✅.
- Bash syntax check ✅ sur les 2 scripts.
- E2E Playwright skip par défaut (gated tag).

### Migration Prisma
Aucune.

### Activation effectuée user (hors PR)
1. Compte Stripe créé.
2. Connect Express activé.
3. Webhook créé (URL prod, 3 events).
4. 3 env vars VPS configurées via `activate-stripe.sh`.
5. Patch `docker-compose.vps.yml` ajout `environment:` pour STRIPE_* (à intégrer en autre PR ou inline ici).
6. Smoke vert : URL onboarding Stripe Express retournée.
EOF
)" \
  --base main \
  --head stripe-activate-prep-scripts-and-smoke

gh pr checks --watch
```

Si CI rouge → STOP.

### 3. Merge + sync + deploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

### 4. Smoke final

Re-confirme smoke après merge :
```
./deploy/scripts/smoke-stripe-onboarding.sh
```

Doit toujours retourner URL Stripe Express.

### 5. Validations finales

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline origin/main | head -3
git branch | grep "stripe-activate-prep" || echo "OK aucune"

# Vérif branches mandat 43 si livrées (si déjà tournées entre-temps)
for b in pay-2-refunds-and-email-and-invoices i18n-6-public-extension mp-category-1-admin; do
  printf "%-50s : %s\n" "$b" "$(git rev-parse --short "$b" 2>&1 || echo 'absent (pas encore livré mandat 43)')"
done
```

---

## Preuves anti-hallucination

```
# 1. PR #61 mergée
gh pr view 61 --json state,mergedAt,statusCheckRollup -q '"state:" + .state, (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'

# 2. main local + remote
git rev-parse main
git rev-parse origin/main

# 3. Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['data']['status'])"

# 4. Scripts Stripe dans repo VPS
ssh rahiss-vps "cd /opt/apps/iox && ls -la deploy/scripts/activate-stripe.sh deploy/scripts/smoke-stripe-onboarding.sh"

# 5. Doc Stripe activation
ssh rahiss-vps "cd /opt/apps/iox && wc -l docs/ops/STRIPE_PROD_ACTIVATION.md"

# 6. Smoke onboarding final OK
./deploy/scripts/smoke-stripe-onboarding.sh 2>&1 | tail -5

# 7. Branche supprimée
git branch | grep "stripe-activate-prep" || echo "OK"

# 8. Stash list vide
git stash list

# 9. Working tree propre
git status --short
```

---

## TL;DR rapport attendu

```
Cascade PR #61 — livrée ✅
- PR #61 mergée. CI vert. Deploy OK.
- main = <SHA_FINAL> (était 3423eca), 59 lots cumulés.
- Scripts Stripe activation déployés sur VPS.
- Smoke onboarding URL Stripe Express OK.
- 0 branche stripe-activate-prep résiduelle.
```

Caveman resume off pour ce livrable car prompt opérationnel.
