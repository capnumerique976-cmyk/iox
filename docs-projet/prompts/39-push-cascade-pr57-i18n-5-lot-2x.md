# Cascade PR #57 — push I18N-5 LOT 2.x (page produit conversion + e2e testids)

> Push + PR + merge + deploy de la branche `i18n-5-lot-2x-page-produit-conversion`. ~30 min total.

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                                       # → 48120ebcf8beee0cf06ab1ad624057603511017e
git rev-parse --short i18n-5-lot-2x-page-produit-conversion               # → 9b2ea25
git stash list                                                            # → vide
which gh && gh auth status                                                # → gh OK
ssh -o ConnectTimeout=5 rahiss-vps 'echo ok'                              # → ok (ControlMaster actif)
```

Si pas vert → STOP + `notes/handoff-cascade-pr57-stop.md`.

---

## Garde-fous

- ❌ Pas de force-push sur main.
- ❌ Pas de `gh pr merge --admin` sauf CI rouge.
- ✅ ControlMaster SSH actif → 1 deploy seul, pas de sleep nécessaire.
- ❌ 0 migration Prisma.
- ⚠️ E2E P13-C + P13-E avec testids = doivent passer cette fois (vs PR #55 qui avait revert).

---

## Étapes

### 1. Pre-flight + sync remote

```
git checkout main
git fetch origin --prune
git status --short
git log --oneline origin/main | head -3
```

Confirmer `origin/main = main = 48120eb`. Si avancé → STOP + signaler.

### 2. Push + PR #57

Pas de rebase requis (main pas avancé depuis création branche).

```
git checkout i18n-5-lot-2x-page-produit-conversion
git push -u origin i18n-5-lot-2x-page-produit-conversion

gh pr create \
  --title "feat(i18n): I18N-5 LOT 2.x — page produit getTranslations + e2e selectors data-testid stables" \
  --body "$(cat <<'EOF'
## Résumé

Reprise de la conversion `getTranslations` page produit publique reportée en cascade #37 PR #55 (reverted après e2e P13 rouge sur literals "Documents publics" / "Pas d'image"). Cette PR livre la conversion **plus** la migration des e2e selectors vers `data-testid` stables, indépendants de la langue.

### Périmètre
- **Page produit** `apps/frontend/src/app/marketplace/products/[slug]/page.tsx` :
  - Import `getTranslations` from `next-intl/server`.
  - 24 strings FR migrés vers `t('clé')` / `tCommon('clé')`.
  - 2 testids stables ajoutés : `data-testid="public-documents-section"` (ligne 313) + `data-testid="image-placeholder"` (ligne 108).
- **E2E `marketplace-global.spec.ts`** :
  - `getByText('Documents publics')` (ligne 339, P13-C) → `getByTestId('public-documents-section')`.
  - `getByText('Documents publics')` (ligne 594, P13-E count=0) → `getByTestId('public-documents-section')`.
  - `getByText(/Pas d'image/)` (ligne 620, P13-E placeholder) → `getByTestId('image-placeholder')`.

### Pattern recommandé pour futures conversions i18n
**testid > literal** : sélecteurs `data-testid` survivent aux changements de langue + reformulations sans casser e2e.

### Tests
- Frontend : 49/49 suites, 313/313 verts. i18n-parity 6/6.
- TypeScript strict ✅.
- E2E Playwright non lancé localement (infra non bootée) — validé en CI.

### Migration Prisma
Aucune.

### Doc
`docs/marketplace/I18N_5_PUBLIC_MARKETPLACE_EN.md` mise à jour : section LOT 2.x + Pattern e2e + TODO I18N-6 (`CatalogFilters.tsx:335` "Documents publics requis" + autres pages publiques).
EOF
)" \
  --base main \
  --head i18n-5-lot-2x-page-produit-conversion

gh pr checks --watch
```

⚠️ Surveille particulièrement les checks E2E (Playwright). Si rouge → STOP, capturer logs.

Si CI verte → continuer.

### 3. Merge + sync + deploy

```
gh pr merge --squash --delete-branch
git checkout main
git pull --rebase origin main
git log --oneline -3 origin/main

./deploy/vps/deploy.sh all
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print('status:',d['data']['status'])"
```

Capturer SHA squash. Confirmer `status: ok`.

### 4. Smoke fonctionnels

```
echo "=== 1. Page publique fiche produit FR HTTP 200 ==="
curl -sS -o /tmp/_fr -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/marketplace/products/demo-vanille-poudre"

echo "=== 2. Page publique fiche produit EN HTTP 200 ==="
curl -sS -o /tmp/_en -w "HTTP %{http_code}\n" "https://iox.mycloud.yt/marketplace/products/demo-vanille-poudre" -H "Cookie: NEXT_LOCALE=en"

echo "=== 3. Testids présents dans HTML rendu (FR) ==="
grep -ic "public-documents-section\|image-placeholder" /tmp/_fr 2>&1 || echo "(0 — markup peut être minifié, vérif visuel browser)"

echo "=== 4. Strings traduits FR vs EN diffèrent ==="
diff <(grep -oE "[A-ZÀ-Ÿ][a-zà-ÿ]+" /tmp/_fr | sort -u | head -20) <(grep -oE "[A-Z][a-z]+" /tmp/_en | sort -u | head -20) | head -10 || echo "(diff non concluant)"

echo "=== 5. Health backend ==="
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"
```

Attendus :
- FR + EN HTTP 200.
- Testids présents si non minifié (sinon vérif manuelle navigateur).
- Diff strings FR/EN visible (Documents vs Public, etc.).

### 5. Validations finales

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline origin/main | head -5

echo "=== aucune branche i18n-5-lot-2x résiduelle ==="
git branch | grep "i18n-5-lot-2x" || echo "OK aucune"

echo "=== bilan ==="
echo "main = $(git rev-parse --short origin/main)"
echo "Total squash PR cumulés:"
git log --oneline main --grep="(#" | wc -l
```

```
git branch -D i18n-5-lot-2x-page-produit-conversion 2>/dev/null || echo "(déjà nettoyée)"
```

---

## Preuves anti-hallucination obligatoires

```
# 1. PR #57 mergée
gh pr view 57 --json state,mergedAt,statusCheckRollup -q '"state:" + .state + " mergedAt:" + .mergedAt, "checks:", (.statusCheckRollup[] | "  " + .name + " → " + (.conclusion // .status))'

# 2. main local + remote
git rev-parse main
git rev-parse origin/main
git log --oneline origin/main | head -3

# 3. Health VPS
curl -s https://iox.mycloud.yt/api/v1/health | python3 -c "import json,sys;d=json.load(sys.stdin);print(d)"

# 4. Page publique FR + EN HTTP 200
curl -sS -o /dev/null -w "FR HTTP %{http_code}\n" "https://iox.mycloud.yt/marketplace/products/demo-vanille-poudre"
curl -sS -o /dev/null -w "EN HTTP %{http_code}\n" "https://iox.mycloud.yt/marketplace/products/demo-vanille-poudre" -H "Cookie: NEXT_LOCALE=en"

# 5. Branche supprimée
git branch | grep "i18n-5-lot-2x" || echo "OK aucune"

# 6. Stash list vide
git stash list

# 7. Working tree propre
git status --short

# 8. E2E P13-C + P13-E status (depuis statusCheckRollup PR ci-dessus)
gh pr view 57 --json statusCheckRollup -q '.statusCheckRollup[] | select(.name | contains("E2E") or contains("Playwright")) | .name + " → " + (.conclusion // .status)'
```

---

## TL;DR rapport attendu

```
Cascade PR #57 — livrée ✅
- PR #57 mergée. CI vert (incl. E2E Playwright P13-C + P13-E avec testids stables).
- Deploy VPS OK.
- main = <SHA_FINAL> (était 48120eb), 55 lots cumulés.
- Page produit publique FR + EN HTTP 200.
- 0 branche i18n-5-lot-2x résiduelle.
- 0 migration Prisma appliquée.
- Pattern testid > literal validé en CI.
```

Caveman resume off pour ce livrable car prompt opérationnel.
