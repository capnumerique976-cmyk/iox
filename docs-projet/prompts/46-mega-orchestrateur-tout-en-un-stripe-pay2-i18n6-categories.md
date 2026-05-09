# Méga-orchestrateur tout-en-un — Stripe activation + cascade #61 + mandat 13h (PAY-2 + I18N-6 + MP-CATEGORY-1) + cascade 3 PR

> **Coller dans Claude Code en un seul bloc.** ~16h total (1.5h ops user + 13h Claude Code autonome + 1.5h cascades).
>
> 5 phases enchaînées. **STOP volontaire entre phase 0 et 1** (activation Stripe = action user manuelle dashboard).
>
> Pre-state : main = `3423eca`, branche `stripe-activate-prep-scripts-and-smoke` (`f8d031c`) en attente push.

---

## ⚠️ Garde-fous transverses (toutes phases)

- AUCUN `git push`/`gh`/`git fetch origin`/`git pull` SAUF phases cascades (#61, #62-64).
- AUCUN `gh pr merge --admin` sauf CI rouge.
- AUCUN deploy hors phases cascades.
- AUCUN appel Stripe réel hors test-mode.
- AUCUN force-push sur main. Force-with-lease feature branches OK après rebase.
- ControlMaster SSH actif → `sleep 60` entre deploys (≥3 deploys consécutifs).
- Anti-hallucination strict : vérifier disque (`ls`, `cat`, `git log`) avant marquer fini, recopier preuves brutes par phase, STOP+revert+doc si invention détectée.

---

## PHASE 0 — Activation Stripe Connect dashboard (action user manuelle, ~5-10 min)

**STOP volontaire — Claude Code attend confirmation user "stripe activated"** avant phases suivantes.

### Étapes user (hors Claude Code)

1. Browser : `https://dashboard.stripe.com/test/settings/connect`
2. Si "Sign up for Connect" / "Get started" affiché → click
3. Form :
   - Use case : "Marketplace"
   - Account type : "Express"
   - Business website : `https://iox.mycloud.yt`
   - Submit
4. Activation OK → page Connect affiche dashboard analytics au lieu de "Get started".
5. Lance smoke depuis mac local :
   ```
   cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
   ./deploy/scripts/smoke-stripe-onboarding.sh
   ```
6. Doit retourner URL `https://connect.stripe.com/express/...` valide.
7. Si OK → écris `notes/stripe-activated.txt` avec contenu "OK $(date)" puis dis "stripe activated" à Claude Code.

### Si bloqué Phase 0

Capture page `/test/settings/connect` + erreur smoke + colle dans chat.

---

## PHASE 1 — Cascade PR #61 (push stripe-activate-prep-scripts-and-smoke) — ~30 min

**Démarrer SEULEMENT après confirmation user "stripe activated".**

### 1.1 Pre-flight + sync

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3
```

Confirmer `origin/main = main = 3423eca`. Si pas → STOP + handoff.

### 1.2 Push + PR #61

```
git checkout stripe-activate-prep-scripts-and-smoke
git push -u origin stripe-activate-prep-scripts-and-smoke

gh pr create \
  --title "chore(ops): STRIPE-ACTIVATE-PREP — doc activation Stripe Connect Express + scripts shell + e2e smoke" \
  --body "$(cat <<'EOF'
## Résumé

Mandat 42 phase 1 — préparation activation Stripe en prod. Doc complète + scripts shell + e2e smoke. Activation manuelle effectuée par user (compte Stripe + Connect Express + webhook + env vars VPS).

### Périmètre
- Doc \`docs/ops/STRIPE_PROD_ACTIVATION.md\` (179 lignes / 11 sections).
- Script \`deploy/scripts/activate-stripe.sh\` : bascule SSH ControlMaster, backup .env, update 3 vars Stripe, restart backend, healthcheck.
- Script \`deploy/scripts/smoke-stripe-onboarding.sh\` : login smoke-seller + POST onboarding-link + vérif URL Stripe Express + check SellerStripeAccount DB.
- E2E \`apps/frontend/e2e/payments-onboarding-smoke.spec.ts\` (tag @stripe-prod, skip si STRIPE_SECRET_KEY absent).
- Section "Activation production" ajoutée à PAY_1_PHASE_1_LOT_1_SCHEMA_ONBOARDING.md.

### Tests
- TypeScript strict ✅. Bash syntax check ✅. Aucune migration Prisma.

### Activation effectuée user (hors PR)
Connect Express activé + webhook créé + env vars VPS configurées. Smoke vert.
EOF
)" \
  --base main \
  --head stripe-activate-prep-scripts-and-smoke

gh pr checks --watch
```

Si CI rouge → STOP + capturer logs.

### 1.3 Merge + sync + deploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

### 1.4 Smoke final post-merge

```
./deploy/scripts/smoke-stripe-onboarding.sh 2>&1 | tail -10
```

Doit toujours retourner URL Stripe Express. Capturer SHA squash main pour suite.

### 1.5 Preuves Phase 1

```
gh pr view 61 --json state,mergedAt,statusCheckRollup -q '"state:" + .state, (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'
git rev-parse main && git rev-parse origin/main
git log --oneline origin/main | head -3
git branch | grep "stripe-activate-prep" || echo "OK aucune"
git stash list
```

---

## PHASE 2 — Mandat 13h LOCAL-only (PAY-2 + I18N-6 + MP-CATEGORY-1) — 3 LOTs chaînés

**Démarrer après cascade PR #61 mergée. Main avancé.**

```
git checkout main
git pull --rebase origin main
NEW_MAIN_SHA=$(git rev-parse --short main)
echo "main avancé : $NEW_MAIN_SHA"
```

### LOT 1 — PAY-2 (refunds + email branchement + factures basiques) — ~5h

**Branche** : `pay-2-refunds-and-email-and-invoices` à partir de main.

```
git checkout main
git checkout -b pay-2-refunds-and-email-and-invoices
```

#### LOT 1.1 — Backend refunds workflow

Endpoint `POST /api/v1/payments/:id/refund` :
- Roles ADMIN, COORDINATOR, SELLER (ownership).
- DTO `RefundPaymentDto` : `{ amountCents?: number, reason?: string }`.
- Service `PaymentsService.refund(id, dto, actor)` : valide Payment status=SUCCEEDED, appelle Stripe `refunds.create({ payment_intent: payment.stripePaymentIntentId, amount?, reason? })` via factory, update Payment status=REFUNDED + metadata.refundId, audit log `PAYMENT_REFUNDED`.
- 5 specs (full refund, partial, ownership rejet, payment pas SUCCEEDED → 400, Stripe error propagée).

#### LOT 1.2 — Backend webhook → email send

Étendre `payments-webhook.service.ts` :
- Sur `payment_intent.succeeded` → appeler `NotifEmailService.send` template `payment-confirmed-to-buyer` (existant FR + EN).
- Pattern `safeNotify` (try/catch + log warn, ne casse pas webhook).
- 3 specs (succeeded → email envoyé, send échoue → webhook 200, locale buyer respectée).

#### LOT 1.3 — Backend module factures

Migration Prisma additive `pay_2_invoices` :
```prisma
enum InvoiceStatus {
  DRAFT
  ISSUED
  PAID
  CANCELED
}

model Invoice {
  id              String        @id @default(uuid())
  paymentId       String        @unique @map("payment_id")
  sellerProfileId String        @map("seller_profile_id")
  buyerCompanyId  String        @map("buyer_company_id")
  invoiceNumber   String        @unique @map("invoice_number")
  amountCents     Int           @map("amount_cents")
  currency        String        @default("EUR")
  status          InvoiceStatus @default(DRAFT)
  pdfStorageKey   String?       @map("pdf_storage_key")
  issuedAt        DateTime?     @map("issued_at")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@index([sellerProfileId, createdAt])
  @@index([buyerCompanyId, createdAt])
  @@map("invoices")
}
```

```
pnpm --filter @iox/backend exec prisma migrate dev --name pay_2_invoices
```

Service `InvoicesService` :
- `generateForPayment(paymentId)` — appelé sur `payment_intent.succeeded` après email send.
- `getByPaymentId(paymentId, actor)` (ownership).
- `listMine(filters, actor)` paginated.
- Format invoiceNumber `IOX-YYYY-NNNNNN` séquentiel par année.
- PDF V1 = stub (pas vrai PDF).

4 endpoints :
- `GET /api/v1/invoices` (listMine).
- `GET /api/v1/invoices/:id`.
- `POST /api/v1/invoices/:id/issue` (DRAFT → ISSUED, set issuedAt).
- `GET /api/v1/invoices/:id/pdf` → V1 retourne 501.

6 specs (generate sur succeeded, getById ownership, listMine pagination, issue transition, pdf 501, invoiceNumber unique).

#### LOT 1.4 — Frontend pages invoices

- `/buyer/invoices` (list) + `/buyer/invoices/[id]` (detail).
- `/seller/invoices` (list) + `/seller/invoices/[id]` (detail).
- Bouton "Télécharger PDF" → "Pas encore disponible (V2)".
- Helper API `apps/frontend/src/lib/invoices.ts`.
- 4 specs vitest.

#### LOT 1.5 — Doc + commit

`docs/marketplace/PAY_2_REFUNDS_INVOICES_EMAIL_BRANCHEMENT.md` : refunds, email branchement, factures V1.

#### LOT 1.6 — Preuves LOT 1

```
git log --oneline main..pay-2-refunds-and-email-and-invoices
git diff main..pay-2-refunds-and-email-and-invoices --stat
ls prisma/migrations/ | tail -3
grep -nE "model Invoice|enum InvoiceStatus" prisma/schema.prisma
grep -nE "@Post.*refund|safeNotify" apps/backend/src/payments/ -r 2>&1 | head -5
ls apps/frontend/src/app/\(dashboard\)/{buyer,seller}/invoices/
pnpm --filter @iox/backend test src/payments src/notif-email 2>&1 | tail -10
pnpm --filter @iox/frontend test invoices 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

### LOT 2 — I18N-6 (autres pages publiques EN) — ~3.5h

**Branche** : `i18n-6-public-extension` à partir de `pay-2-refunds-and-email-and-invoices`.

```
git checkout pay-2-refunds-and-email-and-invoices
git checkout -b i18n-6-public-extension
```

#### LOT 2.1 — Externalisation strings

Pages cibles :
- `/marketplace` (catalog public + filtres + facets)
- `/marketplace/sellers` (annuaire)
- `/marketplace/sellers/[slug]` (fiche seller)
- Composant `CatalogFilters.tsx` (incl. "Documents publics requis" ligne 335)
- Header public + footer public + landing si présents

Convention namespacing : `marketplace.catalog.*`, `marketplace.sellers.*`, `marketplace.seller.*`, `common.*`.

Cible : +60 nouvelles clés EN (cumul ~230 lignes fr.json/en.json).

Pattern : utiliser `getTranslations` (server components) ou `useTranslations` (client components). Ajouter `data-testid` stables sur composants à e2e (testid > literal).

#### LOT 2.2 — Tests + parity

- Helper `validateLocaleParity` (existant) doit rester vert (parity 6/6).
- 1-2 specs vitest sur pages cible (rendu FR + EN).
- E2E inchangé (testids stables).

#### LOT 2.3 — Doc

Étend `docs/marketplace/I18N_5_PUBLIC_MARKETPLACE_EN.md` avec section "I18N-6 extension" — pages couvertes + volume +60 clés.

#### LOT 2.4 — Preuves LOT 2

```
git log --oneline pay-2-refunds-and-email-and-invoices..i18n-6-public-extension
wc -l apps/frontend/messages/fr.json apps/frontend/messages/en.json
grep -rn "useTranslations\|getTranslations" apps/frontend/src/app/marketplace/ --include="*.tsx" | wc -l
pnpm --filter @iox/frontend test i18n-parity 2>&1 | tail -5
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

### LOT 3 — MP-CATEGORY-1 (gestion catégories admin) — ~4.5h

**Branche** : `mp-category-1-admin` à partir de `i18n-6-public-extension`.

```
git checkout i18n-6-public-extension
git checkout -b mp-category-1-admin
```

#### LOT 3.1 — Vérifier model existant

Vérifier `MarketplaceCategory` :
```
grep -nE "model MarketplaceCategory" prisma/schema.prisma
```

Si absent → ajouter (migration additive `mp_category_1`) :
```prisma
model MarketplaceCategory {
  id              String                @id @default(uuid())
  slug            String                @unique
  nameFr          String                @map("name_fr")
  nameEn          String                @map("name_en")
  descriptionFr   String?               @map("description_fr")
  descriptionEn   String?               @map("description_en")
  parentId        String?               @map("parent_id")
  parent          MarketplaceCategory?  @relation("CategoryTree", fields: [parentId], references: [id], onDelete: Restrict)
  children        MarketplaceCategory[] @relation("CategoryTree")
  iconKey         String?               @map("icon_key")
  sortOrder       Int                   @default(0) @map("sort_order")
  isActive        Boolean               @default(true) @map("is_active")
  createdAt       DateTime              @default(now()) @map("created_at")
  updatedAt       DateTime              @updatedAt @map("updated_at")

  products        MarketplaceProduct[]

  @@index([parentId, sortOrder])
  @@map("marketplace_categories")
}
```

```
pnpm --filter @iox/backend exec prisma migrate dev --name mp_category_1
```

Si déjà présent → étendre admin endpoints uniquement (pas de migration).

#### LOT 3.2 — Backend CRUD admin

Module `marketplace-categories` (vérifier existant).

Endpoints :
- `GET /api/v1/admin/marketplace/categories` (admin only, tree-structured response).
- `POST /api/v1/admin/marketplace/categories` (create avec parent_id optionnel).
- `PATCH /:id` (update name/desc/parent/sortOrder/isActive).
- `DELETE /:id` (404 si products attached, sinon soft delete via isActive=false).

8 specs (CRUD + tree + delete protection + reorder).

#### LOT 3.3 — Frontend admin

Page `/admin/marketplace/categories` :
- Tree view parent → children avec drag-reorder HTML5 native.
- Boutons "Ajouter catégorie" + "Modifier" + "Désactiver" par row.
- Modal create/edit avec champs FR + EN.

6 specs vitest.

#### LOT 3.4 — Doc

`docs/marketplace/MP_CATEGORY_1_ADMIN.md` : modèle, endpoints, UI tree, workflow soft delete.

#### LOT 3.5 — Preuves LOT 3

```
git log --oneline i18n-6-public-extension..mp-category-1-admin
ls prisma/migrations/ | tail -3
grep -nE "model MarketplaceCategory|@Controller.*admin/marketplace/categories" prisma/schema.prisma apps/backend/src/marketplace-categories/ -r 2>&1 | head -5
ls apps/frontend/src/app/\(dashboard\)/admin/marketplace/categories/
pnpm --filter @iox/backend test src/marketplace-categories 2>&1 | tail -10
pnpm --filter @iox/frontend test categories 2>&1 | tail -10
pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

### Format handoff Phase 2

Écrire `notes/handoff-mandat-46-phase-2.md` avec preuves brutes des 3 LOTs.

---

## PHASE 3 — Cascade 3 PR (mandat 13h livré) — ~1h

**Démarrer après LOT 1 + 2 + 3 verts en local.**

### 3.1 Pre-flight + sync

```
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3
```

Capturer SHA actuel main (post-#61).

### 3.2 Push #62 PAY-2

```
git checkout pay-2-refunds-and-email-and-invoices
git push -u origin pay-2-refunds-and-email-and-invoices

gh pr create \
  --title "feat(payments): PAY-2 — refunds + webhook→email branchement + factures basiques" \
  --body "$(cat <<'EOF'
## Résumé

Mandat 46 LOT 1 — extension PAY-1 phase 1 avec refunds, branchement webhook→email send, factures basiques.

### Périmètre
- Backend refunds : endpoint POST /payments/:id/refund + DTO + service Stripe refunds.create + audit + ownership.
- Backend webhook→email : payment_intent.succeeded → NotifEmailService.send template payment-confirmed-to-buyer (safeNotify).
- Migration Prisma additive : table invoices + enum InvoiceStatus.
- Service InvoicesService : generateForPayment + getByPaymentId + listMine + invoiceNumber IOX-YYYY-NNNNNN.
- 4 endpoints invoices (list, get, issue, pdf stub 501).
- Frontend pages buyer + seller invoices + helper API.

### Tests
- 5 specs refunds, 3 specs webhook email, 6 specs invoices, 4 specs frontend.
- TypeScript strict ✅.
EOF
)" \
  --base main \
  --head pay-2-refunds-and-email-and-invoices

gh pr checks --watch
```

⚠️ Surveille `prisma-drift` job (migration Invoice).

Si CI rouge → STOP.

### 3.3 Merge #62 + sync + deploy + sleep

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"

ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\dt invoices'"

sleep 60
```

### 3.4 Rebase #63 + push + PR I18N-6

```
git checkout i18n-6-public-extension
git rebase --onto main pay-2-refunds-and-email-and-invoices i18n-6-public-extension

pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push -u origin i18n-6-public-extension --force-with-lease

gh pr create \
  --title "feat(i18n): I18N-6 — autres pages publiques marketplace EN" \
  --body "Mandat 46 LOT 2 — étend i18n EN à pages publiques restantes (catalog, sellers index/detail, CatalogFilters, header/footer). +60 clés EN cumul ~230. Parity 6/6 verts." \
  --base main \
  --head i18n-6-public-extension

gh pr checks --watch
```

### 3.5 Merge #63 + sync + deploy + sleep

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
sleep 60
```

### 3.6 Rebase #64 + push + PR MP-CATEGORY-1

```
git checkout mp-category-1-admin
git rebase --onto main i18n-6-public-extension mp-category-1-admin

pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push -u origin mp-category-1-admin --force-with-lease

gh pr create \
  --title "feat(marketplace): MP-CATEGORY-1 — gestion catégories produit admin (CRUD + tree UI)" \
  --body "Mandat 46 LOT 3 — gestion catégories admin (tree + drag-reorder + soft delete). Migration Prisma additive si MarketplaceCategory absent. 4 endpoints admin + page UI." \
  --base main \
  --head mp-category-1-admin

gh pr checks --watch
```

### 3.7 Merge #64 + sync + deploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -7 origin/main
./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

### 3.8 Smoke combiné

```
echo "=== 1. Tables Prisma post-cascade ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\dt invoices marketplace_categories'"

echo "=== 2. Refund 401 sans auth ==="
curl -sS -w "\nHTTP %{http_code}\n" -X POST "https://iox.mycloud.yt/api/v1/payments/00000000-0000-0000-0000-000000000000/refund" | head -c 200

echo "=== 3. Invoices list 401 sans auth ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/invoices" | head -c 200

echo "=== 4. Admin categories tree 401 sans auth ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/admin/marketplace/categories" | head -c 200

echo "=== 5. Page admin categories ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/admin/marketplace/categories"

echo "=== 6. Page sellers EN ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/marketplace/sellers" -H "Cookie: NEXT_LOCALE=en"
```

### 3.9 Validations finales

```
git status --short
git log --oneline origin/main | head -7
git branch | grep -E "pay-2|i18n-6|mp-category-1" || echo "OK aucune"
echo "Total squash PR cumulés:"
git log --oneline main --grep="(#" | wc -l
```

```
git branch -D pay-2-refunds-and-email-and-invoices i18n-6-public-extension mp-category-1-admin 2>/dev/null
```

---

## Preuves anti-hallucination globales (recopier en fin de handoff)

```
# Phase 1 cascade
gh pr view 61 --json state,mergedAt,statusCheckRollup -q '"state:" + .state, (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'

# Phase 3 cascade — 3 PR
for n in 62 63 64; do
  echo "--- PR #$n ---"
  gh pr view $n --json state,mergedAt,statusCheckRollup -q '"state:" + .state, (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'
done

# main local + remote
git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -7

# Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['data']['status'])"

# Tables Prisma post-cascade
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\dt invoices marketplace_categories seller_stripe_accounts payments'"

# Smoke endpoints
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/invoices" | head -c 200
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/admin/marketplace/categories" | head -c 200
./deploy/scripts/smoke-stripe-onboarding.sh 2>&1 | tail -5

# Branches résiduelles
git branch | grep -E "pay-2|i18n-6|mp-category|stripe-activate" || echo "OK aucune"

# Stash list vide
git stash list

# Working tree propre
git status --short
```

---

## Format rapport final attendu (`notes/handoff-mandat-46.md`)

```
# Méga-mandat 46 orchestrateur — handoff

## TL;DR
- Phase 0 STRIPE ACTIVATION : ✅ user manual (Connect activé + smoke OK)
- Phase 1 cascade #61 : ✅ / 🟡 / ❌
- Phase 2 mandat 13h LOT 1+2+3 : ✅ / 🟡 / ❌
- Phase 3 cascade 3 PR (#62 #63 #64) : ✅ / 🟡 / ❌
- main = <SHA_FINAL>, 62 lots cumulés (58 + 4)
- 1-2 migrations Prisma additives (Invoice + potentiellement MarketplaceCategory)
- 0 push refusé, 0 force-push main, 0 envoi email externe (mock seul si Resend pas activé)

## Phases preuves brutes
[recopier sortie ~25 commandes anti-hallucination]

## Blocages rencontrés
[liste exhaustive, notamment STOP volontaire phase 0 si activation Stripe pas faite]

## Notes opérationnelles
- Stripe Connect Express activé test mode + webhook configuré dashboard
- 3 env vars STRIPE_* dans .env VPS + docker-compose.vps.yml environment block (gitignored, opérator-only)
- Resend reste désactivé (NOTIF_EMAIL_TRANSPORT=mock) — chantier ops futur
- Webhook PAY-2 fonctionnel (payment_intent.succeeded → email-payment-confirmed mocked)
- Factures V1 = stub PDF (V2 = vrai PDF via pdfkit)
- Categories admin = soft delete (V2 = catégories internationales hiérarchiques)
```

---

## TL;DR pour Claude Code

5 phases enchaînées :
1. **Phase 0 STOP** : user active Stripe Connect dashboard manuellement (~5-10 min). Confirme "stripe activated".
2. **Phase 1 cascade #61** : push stripe-activate-prep + merge + deploy. ~30 min.
3. **Phase 2 mandat 13h** : 3 LOTs locaux PAY-2 + I18N-6 + MP-CATEGORY-1. ~13h.
4. **Phase 3 cascade 3 PR** : push #62 #63 #64 chaînés rebase --onto main + 3 deploys. ~1h.
5. **Total** : ~16h cumul, +4 PR mergées, **62 lots cumulés**.

Si doute, STOP + doc. À retour user vérifie via grep / git log / pnpm test.

Caveman resume off pour ce livrable car prompt opérationnel.
