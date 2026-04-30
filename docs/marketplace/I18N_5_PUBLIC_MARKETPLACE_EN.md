# I18N-5 phase 1 — Frontend public marketplace EN

## TL;DR

Étend la couverture i18n EN du frontend public marketplace (catalog déjà couvert depuis I18N-2) avec la **fiche produit publique** + namespaces seller, et ajoute un test de parité FR ↔ EN garde-fou.

Résultat :
- **+52 nouvelles clés** (70 → 122 total).
- Test `i18n-parity.test.ts` (6 tests) vérifie chaque clé FR a son pendant EN et inversement.
- ✅ **LOT 2.x** : conversion `/marketplace/products/[slug]` à `getTranslations` appliquée + e2e P13-C/P13-E migrés vers selectors `data-testid` stables (indépendants locale).

## Périmètre couvert

| Page | Statut | Notes |
|---|---|---|
| `/marketplace` | ✅ déjà couvert (I18N-2) | catalog + filtres + facets |
| `/marketplace/products/[slug]` | ✅ **LOT 2.x** | conversion `getTranslations` + 2 testids stables (`public-documents-section`, `image-placeholder`) |
| `/marketplace/sellers` | ✅ déjà couvert (I18N-2) | annuaire + filtres |
| `/marketplace/sellers/[slug]` | 🟡 keys ajoutées, page à convertir V2 | namespace `marketplace.seller.*` prêt |

## LOT 2.x — Pattern e2e selectors stables

Pour éviter le piège des e2e qui testent des literals FR (régressent dès que la traduction change), convention adoptée :

- **Selectors data-testid** > selectors literal. Ex : `getByTestId('public-documents-section')` au lieu de `getByText('Documents publics')`.
- Testids ajoutés sur les sections clés : `public-documents-section`, `image-placeholder`.
- Pattern recommandé pour futures pages convertibles.

## Convention namespacing

```
common.actions.* — boutons génériques (save, cancel, share, viewAll)
common.states.*  — états UI (loading, empty, error, noImage)
common.breadcrumb.label
common.language.*
nav.*             — navigation header public
marketplace.catalog.*  — catalog public (déjà I18N-2)
marketplace.sellers.*  — annuaire (déjà I18N-2)
marketplace.product.sections.* — h2 fiche produit (description, characteristics, ...)
marketplace.product.fields.*   — labels dl/dt fiche produit (moq, leadTime, variety, ...)
marketplace.seller.sections.*  — h2 fiche seller (story, products, certifications)
marketplace.seller.fields.*    — labels fiche seller (country, region, incoterms, ...)
footer.*
```

## Helper parity

`apps/frontend/src/lib/i18n-parity.test.ts` :
- `collectKeys(obj)` walk récursif → liste plate de toutes les clés (notation pointée).
- 6 tests :
  - Toutes clés FR existent en EN.
  - Toutes clés EN existent en FR.
  - Compte total identique FR vs EN.
  - Compte total ≥ 70 (baseline I18N-1).
  - Compte total ≥ 120 (LOT 2 I18N-5).
  - Présence des namespaces clés (`marketplace.product.sectionsdescription`, `marketplace.seller.sections.story`, etc.).

Cette spec sert de garde-fou pour les futures PR : ajouter une clé dans un seul des deux fichiers casse la CI.

## LocaleSwitcher

Composant `LocaleSwitcher` existant (depuis I18N-1 phase 1 #36) déjà câblé dans le dashboard topbar. Pas d'exposition supplémentaire dans le header public V1 (à ajouter dans une phase ultérieure si trafic EN significatif).

## Tests

```
$ pnpm --filter @iox/frontend test -- i18n --run
✓ src/lib/i18n-parity.test.ts (6 tests) 2ms
Test Files  1 passed (1)
Tests  6 passed (6)
```

Frontend tsc clean.

## Volume

| Avant LOT 2 | Après LOT 2 |
|---|---|
| 70 clés FR + 70 EN | 122 clés FR + 122 EN |

## TODO V2

- Convertir `/marketplace/sellers/[slug]` à `getTranslations` (keys déjà prêtes).
- Convertir `apps/frontend/src/components/marketplace/CatalogFilters.tsx:335` (literal "Documents publics requis") — chantier I18N-6.
- Auth pages (`/login`, `/signup`) — V1 FR only.
- Buyer dashboard `/buyer/*` — V2.
- Admin / seller dashboards — restent FR pro V1.
- Multi-currency display selon locale (EUR vs USD).
- RTL support (arabe, hébreu) — V3+.
- Locales ES / AR / ZH / JA — chantier dédié I18N-6+.
- LocaleSwitcher dans header public marketplace.
