# Méga-mandat 36 — handoff AUTH-FIX + I18N-5 + RESEND-PROD-PREP

## TL;DR
- **LOT 1 AUTH-FIX-LOCAL : 🟢 no-op (déjà fixé)** — 1 commit doc-only, 28/28 specs auth verts en local + 673/673 suite backend complète.
- **LOT 2 I18N-5 ph1 : ✅** — 1 commit, +52 clés EN (70 → 122), parity test 6/6 verts, fiche produit publique convertie à `getTranslations`.
- **LOT 3 RESEND-PROD-PREP : ✅** — 1 commit, doc 179 lignes + 2 scripts shell exec, syntax bash OK.
- main intact (`387c6c2`).
- 0 migration Prisma.
- 0 action ops effective (Resend pas activé tant que user n'exécute pas script).

## Branches livrées
- `chore-auth-specs-fix-local` (HEAD: `6259d0d`)
- `i18n-5-public-marketplace-en` (HEAD: `353b9d7`, basée sur LOT 1)
- `resend-prod-prep-doc-script` (HEAD: `9841b8a`, basée sur LOT 2)

Chaînage : LOT 2 et LOT 3 chaînés mais pas dépendants techniquement (rebase --onto main trivial).

## LOT 1 — preuves brutes

### git log

```
6259d0d docs(auth): document que specs auth backend passent en local sans config
```

### diff stat

```
 docs/dev/AUTH_LOCAL_TESTS.md | 61 ++++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 61 insertions(+)
```

### Tests auth

```
$ pnpm --filter @iox/backend test src/auth
PASS src/auth/dto/refresh.dto.spec.ts
PASS src/auth/auth.service.spec.ts
Test Suites: 2 passed, 2 total
Tests:       28 passed, 28 total
```

### Suite backend complète

```
Test Suites: 51 passed, 51 total
Tests:       673 passed, 673 total
Time:        17.307 s
```

### tsc backend

`pnpm --filter @iox/backend exec tsc --noEmit` → exit 0, no output.

### .env.test

Absent. Pas requis pour les specs unitaires actuels (mocks Prisma in-memory, pas de DB réelle).

### Doc

`docs/dev/AUTH_LOCAL_TESTS.md` créée — explique cause probable historique (mocks Prisma User pré-`preferredLocale`), résolu par PR I18N-3 #46/#47, procédure relance, checklist régression future.

---

## LOT 2 — preuves brutes

### git log

```
353b9d7 feat(i18n): I18N-5 phase 1 — frontend public marketplace EN ...
```

### diff stat

```
 apps/frontend/messages/en.json                     | 70 +++++++++++++++++-
 apps/frontend/messages/fr.json                     | 70 +++++++++++++++++-
 apps/frontend/src/app/marketplace/products/[slug]/page.tsx | 69 ++++++++++--------
 apps/frontend/src/lib/i18n-parity.test.ts          | 73 +++++++++++++++++++
 docs/marketplace/I18N_5_PUBLIC_MARKETPLACE_EN.md   | 82 ++++++++++++++++++++++
 5 files changed, 329 insertions(+), 35 deletions(-)
```

### Volume clés

```
$ node -e "..."
FR keys: 122
EN keys: 122
```

### Parity tests

```
✓ src/lib/i18n-parity.test.ts (6 tests) 2ms
Test Files  1 passed (1)
Tests  6 passed (6)
```

### tsc frontend

`pnpm --filter @iox/frontend exec tsc --noEmit` → exit 0, no output.

### Conversions strings produit

22 hardcoded strings FR remplacés par `t('marketplace.product.fields.*')` ou `t('marketplace.product.sections.*')` ou `tCommon('...')`. Page reste server component (RSC) avec `getTranslations` async.

---

## LOT 3 — preuves brutes

### git log

```
9841b8a chore(ops): RESEND-PROD-PREP — doc activation prod + scripts shell bascule
```

### diff stat

```
 deploy/scripts/activate-resend.sh      |  71 +++++++++++++
 deploy/scripts/smoke-resend.sh         |  67 ++++++++++++
 docs/marketplace/MP_NOTIF_2_PHASE_2.md |  14 +++
 docs/ops/RESEND_PROD_ACTIVATION.md     | 179 +++++++++++++++++++++++++++++++++
 4 files changed, 331 insertions(+)
```

### Permissions exec

```
$ ls -la deploy/scripts/
-rwxr-xr-x  activate-resend.sh
-rwxr-xr-x  smoke-resend.sh
```

### Syntax check shell

```
$ bash -n deploy/scripts/activate-resend.sh && echo "syntax OK"
syntax OK
$ bash -n deploy/scripts/smoke-resend.sh && echo "syntax OK"
syntax OK
```

### Doc taille

```
$ wc -l docs/ops/RESEND_PROD_ACTIVATION.md
179
```

### Sections doc

10 sections : pré-requis / DKIM+SPF+DMARC / test envoi / bascule env / smoke post / rollback / coût / monitoring / sécurité / liens.

---

## Blocages rencontrés

1. **LOT 1 prompt obsolète** : le mandat décrit un fail historique sur les specs auth en local (~25 specs rouges). Vérification du jour : 28/28 verts. Probablement résolu par PR I18N-3 #46/#47 qui ont aligné les mocks Prisma `User` avec `preferredLocale`. Livrable réduit à un `.md` documentaire.
2. **Aucun autre blocage**.

---

## Notes pour push cascade

### Ordre proposé
```
git push -u origin chore-auth-specs-fix-local
gh pr create --base main --head chore-auth-specs-fix-local --title "docs(auth): specs auth en local OK"
gh pr merge --squash --delete-branch && git pull --rebase origin main

git checkout i18n-5-public-marketplace-en
git rebase --onto main 6259d0d  # ou trivialement git rebase main
git push -u origin i18n-5-public-marketplace-en --force-with-lease
gh pr create --base main --head i18n-5-public-marketplace-en --title "feat(i18n): I18N-5 phase 1 — public marketplace EN"
gh pr merge --squash --delete-branch && git pull --rebase origin main

git checkout resend-prod-prep-doc-script
git rebase --onto main 353b9d7
git push -u origin resend-prod-prep-doc-script --force-with-lease
gh pr create --base main --head resend-prod-prep-doc-script --title "chore(ops): RESEND-PROD-PREP — doc + scripts"
gh pr merge --squash --delete-branch && git pull --rebase origin main
```

### Indépendance
- LOT 1 = doc-only, mergeable n'importe quand.
- LOT 2 = pur frontend i18n, indépendant.
- LOT 3 = ops scripts + doc, n'affecte aucun comportement runtime tant que user n'exécute pas `activate-resend.sh`.

### Aucune migration Prisma
Modèle DB inchangé.

### Aucune action ops effective
Resend reste en `mock` côté VPS. User exécute `activate-resend.sh` quand prêt (compte Resend créé, DNS DKIM/SPF/DMARC propagés).

### Smoke post-deploy à valider après merge
- Specs auth backend continuent de passer en CI (déjà cas).
- Parity FR/EN intacte (6 tests garde-fou en CI).
- Scripts shell visibles dans repo (`ls deploy/scripts/`).
- `/marketplace/products/[slug]` rendu OK avec cookie `NEXT_LOCALE=fr` ET `=en`.

---

## Cumul attendu après cascade

main avancera de **+3 lots** (52 → 55 squash PR cumulés au total). Aucun changement runtime VPS (LOT 1 doc-only, LOT 2 i18n strings, LOT 3 ops scripts inactifs).

User restera maître du timing Resend prod (chantier `RESEND-PROD-ACTIVATION` séparé une fois le compte Resend créé + DNS propagé).
