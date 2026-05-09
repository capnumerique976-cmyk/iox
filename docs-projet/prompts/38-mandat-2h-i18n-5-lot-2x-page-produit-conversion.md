# Mandat 2h LOCAL-ONLY — I18N-5 LOT 2.x (page produit conversion + e2e selectors stables)

> Coller dans Claude Code pour run autonome ~2h. **Aucun push, deploy, gh, ssh, envoi externe.**
>
> Reprend la conversion `getTranslations` reportée en cascade #37 (PR #55 reverted page) + update e2e P13-C + P13-E avec selectors `data-testid` stables.

## Pré-requis (STOP si non remplis)

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git rev-parse main                                              # → 48120ebcf8beee0cf06ab1ad624057603511017e
git stash list                                                   # → vide
git branch | wc -l                                               # → 2
pnpm install --frozen-lockfile 2>&1 | tail -3
pnpm --filter @iox/backend exec prisma generate 2>&1 | tail -3
```

Si pas vert → STOP + `notes/handoff-mandat-38-stop.md`.

---

## Garde-fous anti-hallucination

User absent ~2h. Toute invention détectée par grep / git log / pnpm test à retour.

1. Toujours vérifier disque (`ls`, `cat`, `git status`) avant marquer fini.
2. Jamais inventer output / test / fichier. Erreur brute si commande échoue.
3. Fin lot, recopier output réel des preuves dans handoff.
4. Si tu détectes invention → STOP, revert, doc.

---

## Contexte

- main = `48120eb` (54 lots cumulés).
- next-intl câblé : `messages/{fr,en}.json` à 170 lignes chacun (parity OK depuis I18N-5 phase 1 #55).
- Cascade #37 PR #55 a livré +52 clés EN + parity test 6/6 mais a **revert** la conversion `page.tsx` produit après e2e P13-C + P13-E rouge sur literals "Documents publics" / "Pas d'image".
- E2E selectors actuels (rouges si conversion appliquée) :
  - `apps/frontend/e2e/marketplace-global.spec.ts:338` : `getByText('Documents publics')` (P13-C)
  - `apps/frontend/e2e/marketplace-global.spec.ts:592` : `getByText('Documents publics')` (P13-E)
  - `apps/frontend/e2e/marketplace-global.spec.ts:617` : `getByText(/Pas d'image/)` (P13-E)
- Clé i18n `noImage` existe déjà dans `messages/{fr,en}.json`. Vérifier si `publicDocuments` existe sinon ajouter.

**Manque** : page produit toujours en literals FR. Conversion + e2e safe à faire en parallèle.

---

## Périmètre

**Branche unique** : `i18n-5-lot-2x-page-produit-conversion` à partir de main `48120eb`.

**Hors scope** :
- Autres pages publiques (sellers index, seller detail, catalog) → I18N-6 mandat séparé.
- Auth pages, buyer dashboard, admin → V2.

---

## Règles absolues

- AUCUN `git push`, `gh`, `git fetch origin`, `git pull`.
- AUCUN merge sur main local. Main reste `48120eb`.
- AUCUN deploy / ssh / VPS.
- AUCUN force-push.
- AUCUNE migration Prisma.

## Exigences techniques

- Conventional commits.
- TypeScript strict.
- Tests : vitest + Playwright e2e. Cible verts intégral.
- Controlled state : pas de react-hook-form.

---

## Étapes

### 1. Audit clés i18n existantes

```
grep -nE "publicDocuments|noImage|product\." apps/frontend/messages/fr.json | head -20
grep -nE "publicDocuments|noImage|product\." apps/frontend/messages/en.json | head -20
```

Confirmer présence ou absence des clés requises. Ajouter si manquant :
- `marketplace.product.publicDocuments` : "Documents publics" / "Public documents"
- `marketplace.product.noImage` : "Pas d'image" / "No image" (probablement existe déjà)
- Toutes autres clés literals présentes dans `page.tsx` à externaliser.

Update parity test : `pnpm --filter @iox/frontend test i18n-parity` → 6/6 verts (devrait passer si parity respectée).

### 2. Convertir `page.tsx` à `getTranslations`

`apps/frontend/src/app/marketplace/products/[slug]/page.tsx` :

- Server component → utiliser `getTranslations` :
  ```typescript
  import { getTranslations } from 'next-intl/server';
  
  export default async function Page({ params }: Props) {
    const t = await getTranslations('marketplace.product');
    // ...
    return <div>{t('publicDocuments')}</div>;
  }
  ```

- Identifier TOUS les literals FR dans le JSX (grep "Documents publics" / "Pas d'image" / autres) et remplacer par `t('clé')`.
- Ajouter `data-testid` STABLES sur les sections clés (indépendantes de la langue) :
  - `<section data-testid="public-documents-section">` (sur le bloc "Documents publics")
  - `<div data-testid="image-placeholder">` (sur le placeholder "Pas d'image")
  - Autres testids selon besoin pour autres assertions e2e.

### 3. Update e2e P13-C + P13-E

`apps/frontend/e2e/marketplace-global.spec.ts` :

- Ligne 338 (P13-C) :
  ```typescript
  // AVANT
  await expect(page.getByText('Documents publics')).toBeVisible();
  // APRÈS
  await expect(page.getByTestId('public-documents-section')).toBeVisible();
  ```

- Ligne 592 (P13-E "no leakage") :
  ```typescript
  // AVANT
  await expect(page.getByText('Documents publics')).toHaveCount(0);
  // APRÈS
  await expect(page.getByTestId('public-documents-section')).toHaveCount(0);
  ```

- Ligne 617 (P13-E "placeholder") :
  ```typescript
  // AVANT
  await expect(page.getByText(/Pas d'image/)).toBeVisible();
  // APRÈS
  await expect(page.getByTestId('image-placeholder')).toBeVisible();
  ```

Selectors `data-testid` = stables, indépendants i18n (FR + EN passent même tests).

### 4. Vérifier `CatalogFilters.tsx` (hors scope mais signaler)

`grep "Documents publics"` retourne aussi `CatalogFilters.tsx:335` — appartient à un autre composant non scopé ce mandat. **Ne pas convertir maintenant** (pourrait casser d'autres e2e), juste noter pour I18N-6.

### 5. Tests vitest page (si présent)

```
ls apps/frontend/src/app/marketplace/products/\[slug\]/page.test.tsx 2>/dev/null
```

Si présent → vérifier que les snapshots ne testent pas les literals FR (sinon update à `t('clé')`).

### 6. Smoke local

```
pnpm --filter @iox/frontend test 2>&1 | tail -10
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

Cible : 0 régression vitest + tsc clean.

**E2E Playwright** : si infra dispo localement, lancer les 2 tests P13 :

```
cd apps/frontend && npx playwright test e2e/marketplace-global.spec.ts -g "P13-C\|P13-E" 2>&1 | tail -20
```

Si infra Playwright pas dispo en local (DB ephemeral, services not booted), **skip** et noter dans handoff que les tests e2e seront validés par CI au moment de la cascade.

### 7. Documentation

Mettre à jour `docs/marketplace/I18N_5_PUBLIC_MARKETPLACE_EN.md` (existant) :
- Section "LOT 2.x — page produit conversion" :
  - Conversion `getTranslations` appliquée.
  - 3 e2e selectors migrés vers `data-testid` stables.
  - Pattern recommandé pour futures conversions (testid > literal).
- TODO mis à jour : `CatalogFilters.tsx:335` "Documents publics requis" reste à convertir (I18N-6).

### 8. Preuves anti-hallucination

```
git log --oneline main..i18n-5-lot-2x-page-produit-conversion
git diff main..i18n-5-lot-2x-page-produit-conversion --stat
grep -nE "getTranslations\|t\(" apps/frontend/src/app/marketplace/products/\[slug\]/page.tsx | head -10
grep -nE "Documents publics|Pas d'image" apps/frontend/src/app/marketplace/products/\[slug\]/page.tsx 2>&1 || echo "(no match — literals retirés)"
grep -nE "data-testid=\"public-documents-section\"|data-testid=\"image-placeholder\"" apps/frontend/src/app/marketplace/products/\[slug\]/page.tsx
grep -nE "getByTestId\(\"public-documents-section\"\)|getByTestId\(\"image-placeholder\"\)" apps/frontend/e2e/marketplace-global.spec.ts
grep -nE "getByText\\('Documents publics'\\)|getByText\\(/Pas d'image/\\)" apps/frontend/e2e/marketplace-global.spec.ts 2>&1 || echo "(no match — selectors literal retirés)"
pnpm --filter @iox/frontend test 2>&1 | tail -10
pnpm --filter @iox/frontend exec tsc --noEmit 2>&1 | tail -3
```

---

## Pre-flight checks

```
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox
git status --short
git log --oneline -1 main                                        # → 48120eb
git stash list                                                   # → vide
git branch | wc -l                                               # → 2
pnpm install --frozen-lockfile 2>&1 | tail -3
```

Tout vert → démarrer. Sinon STOP + handoff.

---

## Format rapport final attendu (`notes/handoff-mandat-38.md`)

```
# Mandat 38 — handoff I18N-5 LOT 2.x (page produit + e2e testids)

## TL;DR
- Statut : ✅ / 🟡 / ❌
- N commits, M nouveaux specs / fixes
- main intact (48120eb)
- 0 migration Prisma
- branche `i18n-5-lot-2x-page-produit-conversion` (HEAD: ...)

## Périmètre livré
- Conversion page produit getTranslations
- 3 e2e selectors migrés vers data-testid stables
- Doc i18n mise à jour

## Preuves brutes
[recopier sortie 9 commandes anti-hallucination]

## Blocages rencontrés
[liste exhaustive + e2e infra dispo ou pas localement]

## Notes pour push cascade
- branche prête à push
- 0 migration Prisma → cascade safe
- e2e P13-C + P13-E doivent passer en CI (testids stables)
- TODO I18N-6 : CatalogFilters.tsx + autres pages publiques
```

---

## TL;DR pour Claude Code

1 lot, ~2h, 1 branche, 0 migration Prisma, conversion + 3 testids e2e. Si doute, STOP + doc.

Caveman resume off pour ce livrable car prompt opérationnel.
