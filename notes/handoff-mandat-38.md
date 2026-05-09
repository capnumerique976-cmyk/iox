# Mandat 38 — handoff I18N-5 LOT 2.x (page produit + e2e testids)

## TL;DR
- **Statut : ✅**
- 1 commit `9b2ea25`, 3 fichiers, 59 insertions / 38 deletions.
- main intact (`48120eb`).
- 0 migration Prisma.
- Branche : `i18n-5-lot-2x-page-produit-conversion` (HEAD `9b2ea25`).

## Périmètre livré
- Conversion `/marketplace/products/[slug]/page.tsx` à `getTranslations` (24 strings FR remplacées).
- 2 nouveaux `data-testid` stables : `public-documents-section`, `image-placeholder`.
- 3 e2e selectors P13-C/P13-E migrés vers `getByTestId(...)` (indépendants locale).
- Doc i18n mise à jour : section "Pattern e2e selectors stables" + TODO V2 étendue (CatalogFilters.tsx hors scope).

## Preuves brutes

### git log

```
9b2ea25 feat(i18n): I18N-5 LOT 2.x — page produit getTranslations + e2e selectors data-testid stables
```

### diff stat

```
 apps/frontend/e2e/marketplace-global.spec.ts       |  9 ++-
 apps/frontend/src/app/marketplace/products/[slug]/page.tsx | 75 ++++++++++++----------
 docs/marketplace/I18N_5_PUBLIC_MARKETPLACE_EN.md   | 13 +++-
 3 files changed, 59 insertions(+), 38 deletions(-)
```

### getTranslations usage page

```
3:import { getTranslations } from 'next-intl/server';
61:  const t = await getTranslations('marketplace.product');
62:  const tCommon = await getTranslations('common');
74:        aria-label={tCommon('breadcrumb.label')}
112:                <span className="text-sm">{tCommon('states.noImage')}</span>
177:                {t('sellerLabel')}
227,239,...:        <dt>{t('fields.moq|leadTime|...')}</dt>
```

### Literals retirés du JSX

```
$ grep -nE "Documents publics|Pas d'image" apps/frontend/src/app/marketplace/products/[slug]/page.tsx
311:          {/* Documents publics */}        ← commentaire seul, pas de literal JSX
```

### Testids présents

```
108: data-testid="image-placeholder"
313: data-testid="public-documents-section"
```

### E2E selectors migrés

```
339: await expect(page.getByTestId('public-documents-section')).toBeVisible();
594: await expect(page.getByTestId('public-documents-section')).toHaveCount(0);
620: await expect(page.getByTestId('image-placeholder')).toBeVisible();
```

### E2E literals retirés

```
$ grep -nE "getByText\('Documents publics'\)|getByText\(/Pas d'image/\)" apps/frontend/e2e/marketplace-global.spec.ts
(no match)
```

### Tests verts

```
$ pnpm --filter @iox/frontend test -- i18n --run
✓ src/lib/i18n-parity.test.ts (6 tests) 3ms
Test Files  1 passed (1)
Tests  6 passed (6)

$ pnpm --filter @iox/frontend test -- --run
Test Files  49 passed (49)
Tests  313 passed (313)
```

### tsc

`pnpm --filter @iox/frontend exec tsc --noEmit` → exit 0, no output.

## Blocages rencontrés

Aucun.

E2E Playwright **non lancé localement** — infra (DB seedée + services bootés) demanderait un setup lourd. La validation des selectors `data-testid` se fera côté CI au moment de la cascade. Risque très faible : les selectors sont précis et alignés avec les `data-testid` ajoutés à la page.

## Notes pour push cascade

### Ordre
```
git push -u origin i18n-5-lot-2x-page-produit-conversion
gh pr create --base main --head i18n-5-lot-2x-page-produit-conversion --title "feat(i18n): I18N-5 LOT 2.x — page produit getTranslations + e2e testids stables"
gh pr checks --watch    # CI doit valider P13-C + P13-E avec nouveaux testids
gh pr merge --squash --delete-branch
```

### Aucune migration Prisma
Pure modification frontend (page.tsx + e2e + doc).

### CI attendue verte
- Backend : trivialement vert (pas de modif).
- Frontend typecheck + lint + test + build : vert (validé localement, 313/313).
- E2E Playwright : doit être vert grâce aux selectors stables (P13-C ligne 339, P13-E lignes 594 + 620).
- Prisma drift : trivialement vert.

### TODO I18N-6 (mandat suivant)
- Convertir `apps/frontend/src/components/marketplace/CatalogFilters.tsx:335` (literal "Documents publics requis"). Hors scope mandat 38 — pourrait casser d'autres e2e si conversion isolée.
- Convertir `/marketplace/sellers/[slug]` à `getTranslations` (keys déjà prêtes depuis I18N-5 phase 1).
- LocaleSwitcher dans header public marketplace.
