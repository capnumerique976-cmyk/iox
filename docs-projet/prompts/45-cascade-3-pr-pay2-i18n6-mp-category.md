# Cascade 3 PR — PAY-2 + I18N-6 + MP-CATEGORY-1 (mandat 43)

> Push + PR + merge + deploy de 3 branches chaînées du mandat 43. ~1h total.
>
> **À exécuter après** mandat 43 livré + cascade PR #61 mergée (mandat 42 phase 1).

## Branches à push

| PR | Branche | Parent | Description |
|---|---|---|---|
| #62 | `pay-2-refunds-and-email-and-invoices` | main (post-#61) | LOT 1 mandat 43 |
| #63 | `i18n-6-public-extension` | LOT 1 | LOT 2 |
| #64 | `mp-category-1-admin` | LOT 2 | LOT 3 |

⚠️ **PR #62 contient 1 migration Prisma additive** : `Invoice` table. Surveillance prisma-drift CI.

⚠️ **PR #64 peut contenir 1 migration Prisma additive** si MarketplaceCategory pas existant.

---

## Pré-requis

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                         # → post-PR #61
git rev-parse --short pay-2-refunds-and-email-and-invoices  # → SHA livré mandat 43
git rev-parse --short i18n-6-public-extension              # → SHA livré
git rev-parse --short mp-category-1-admin                  # → SHA livré
git stash list                                             # → vide
which gh && gh auth status                                 # → OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'               # → ok (ControlMaster)
```

Si pas vert → STOP + `notes/handoff-cascade-45-stop.md`.

---

## Garde-fous

- 0 force-push main, force-with-lease feature.
- 0 `gh pr merge --admin` sauf CI rouge.
- ControlMaster SSH actif → sleep 60s entre 3 deploys.
- Surveillance `prisma-drift` CI sur #62 (et #64 si migration).
- Stripe activé prod (mandat 42 phase 1 mergée + activate-stripe.sh exécuté) → webhook PAY-2 fonctionnel post-merge.

---

## Étapes

### 1. Pre-flight + sync

```
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3
```

Capturer SHA actuel main (post-#61).

### 2. Push #62 PAY-2

```
git checkout pay-2-refunds-and-email-and-invoices
git push -u origin pay-2-refunds-and-email-and-invoices

gh pr create \
  --title "feat(payments): PAY-2 — refunds + webhook→email branchement + factures basiques" \
  --body "$(cat <<'EOF'
## Résumé

Mandat 43 LOT 1 — extension PAY-1 phase 1 avec refunds, branchement webhook→email send, factures basiques.

### Périmètre
- **Backend refunds** : endpoint `POST /payments/:id/refund` + DTO `RefundPaymentDto` (full ou partial via amountCents) + service appelle Stripe `refunds.create` via factory + audit log + ownership.
- **Backend webhook→email** : `payments-webhook.service.ts` étendu pour appeler `NotifEmailService.send` template `payment-confirmed-to-buyer` sur `payment_intent.succeeded`. Pattern safeNotify.
- **Migration Prisma additive** : table `invoices` + enum `InvoiceStatus` (DRAFT/ISSUED/PAID/CANCELED) + indexes sellerProfileId + buyerCompanyId.
- **Service `InvoicesService`** : generateForPayment + getByPaymentId + listMine + invoiceNumber `IOX-YYYY-NNNNNN` séquentiel.
- **4 endpoints invoices** : list, get, issue (DRAFT→ISSUED), pdf (V1 stub 501).
- **Frontend invoices** : pages buyer + seller (list + detail). Bouton PDF V1 affiche "Pas encore disponible".

### Tests
- 5 specs refunds, 3 specs webhook email, 6 specs invoices, 4 specs frontend.
- TypeScript strict ✅.

### Hors scope (PAY-3)
- Vrai PDF (pdfkit ou puppeteer).
- Disputes/chargebacks UI.
- Multi-currency.
- Module factures admin.
EOF
)" \
  --base main \
  --head pay-2-refunds-and-email-and-invoices

gh pr checks --watch
```

⚠️ Surveille `prisma-drift` job (migration Invoice).

### 3. Merge #62 + sync + deploy + sleep

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"

# Vérif table invoices créée
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\dt invoices'"

sleep 60
```

### 4. Rebase #63 + push + PR I18N-6

```
git checkout i18n-6-public-extension
git rebase --onto main pay-2-refunds-and-email-and-invoices i18n-6-public-extension

pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push -u origin i18n-6-public-extension --force-with-lease

gh pr create \
  --title "feat(i18n): I18N-6 — autres pages publiques marketplace EN" \
  --body "$(cat <<'EOF'
## Résumé

Mandat 43 LOT 2 — étend i18n EN à toutes pages publiques restantes après I18N-5 (page produit déjà couverte).

### Périmètre
- Pages cibles : `/marketplace`, `/marketplace/sellers`, `/marketplace/sellers/[slug]`, header public, footer public, landing.
- Composant `CatalogFilters.tsx` (incl. "Documents publics requis" ligne 335).
- +60 nouvelles clés EN (cumul ~230).
- Convention namespacing : `marketplace.catalog.*`, `marketplace.sellers.*`, `marketplace.seller.*`, `common.*`.
- Pattern data-testid stables sur composants à e2e.

### Tests
- Helper `validateLocaleParity` 6/6 verts.
- 1-2 specs vitest pages cible (rendu FR + EN).
- TypeScript strict ✅.

### Hors scope (V2)
- Auth pages, buyer/seller dashboard.
- Multi-currency, RTL.
EOF
)" \
  --base main \
  --head i18n-6-public-extension

gh pr checks --watch
```

### 5. Merge #63 + sync + deploy + sleep

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
sleep 60
```

### 6. Rebase #64 + push + PR MP-CATEGORY-1

```
git checkout mp-category-1-admin
git rebase --onto main i18n-6-public-extension mp-category-1-admin

pnpm --filter @iox/backend exec tsc --noEmit 2>&1 | tail -3
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
git push -u origin mp-category-1-admin --force-with-lease

gh pr create \
  --title "feat(marketplace): MP-CATEGORY-1 — gestion catégories produit admin (CRUD + tree UI)" \
  --body "$(cat <<'EOF'
## Résumé

Mandat 43 LOT 3 — gestion catégories produit côté admin avec UI tree + drag-reorder + soft delete.

### Périmètre
- **Migration Prisma** (additive si MarketplaceCategory absent, sinon extension admin endpoints uniquement).
- **Backend module `marketplace-categories`** : 4 endpoints admin (GET tree, POST create, PATCH update, DELETE soft).
- **Frontend `/admin/marketplace/categories`** : tree view parent→children + drag-reorder HTML5 + boutons add/edit/disable + modal FR+EN + soft delete protection (404 si products attachés).

### Tests
- 8 specs backend (CRUD + tree + delete protection + reorder).
- 6 specs frontend.
- TypeScript strict ✅.

### Hors scope (V2)
- Catégories internationales avec hiérarchies multi-pays.
- Auto-suggestion via NLP sur nom produit.
EOF
)" \
  --base main \
  --head mp-category-1-admin

gh pr checks --watch
```

### 7. Merge #64 + sync + deploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -7 origin/main
./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

### 8. Smoke combiné

```
echo "=== 1. Tables Prisma post-cascade ==="
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\dt invoices marketplace_categories'"

echo "=== 2. Endpoint refund répond 401 sans auth ==="
curl -sS -w "\nHTTP %{http_code}\n" -X POST "https://iox.mycloud.yt/api/v1/payments/00000000-0000-0000-0000-000000000000/refund" | head -c 200

echo "=== 3. Endpoint invoices list 401 sans auth ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/invoices" | head -c 200

echo "=== 4. Endpoint admin categories tree 401 sans auth ==="
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/admin/marketplace/categories" | head -c 200

echo "=== 5. Page admin categories ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/admin/marketplace/categories"

echo "=== 6. Page publique sellers EN ==="
curl -sS -o /dev/null -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/marketplace/sellers" -H "Cookie: NEXT_LOCALE=en"
```

### 9. Validations finales

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

## Preuves anti-hallucination

```
for n in 62 63 64; do
  echo "--- PR #$n ---"
  gh pr view $n --json state,mergedAt,statusCheckRollup -q '"state:" + .state, (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'
done

git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -7

curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['data']['status'])"

ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c '\\dt invoices marketplace_categories'"

curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/invoices" | head -c 200
curl -sS -w "\nHTTP %{http_code}\n" "https://iox.mycloud.yt/api/v1/admin/marketplace/categories" | head -c 200

git branch | grep -E "pay-2|i18n-6|mp-category-1" || echo "OK aucune"
git stash list
git status --short
```

---

## TL;DR rapport attendu

```
Cascade 3 PR (PAY-2 + I18N-6 + MP-CATEGORY-1) — livrée ✅
- PR #62 + #63 + #64 mergées dans l'ordre. CI vert sur les 3.
- 3 deploys VPS OK + healthchecks 3/3.
- Tables `invoices` + `marketplace_categories` (si migration) appliquées.
- Smoke endpoints PAY-2 + invoices + admin categories répondent 401 sans auth.
- Pages publiques EN HTTP 200 (cookie NEXT_LOCALE=en).
- main = <SHA_FINAL>, 62 lots cumulés (59 + 3).
- 0 branche feature résiduelle, working tree propre.
```

Caveman resume off pour ce livrable car prompt opérationnel.
