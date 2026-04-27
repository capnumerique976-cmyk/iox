# MP-FILTERS-1 — Plan d'exécution (LOT 3 mandate 11)

Branche : `mp-filters-1-catalog-public-rich` (depuis `fp-7-product-quality-attributes`).

## Objectif

Étendre les filtres publics du catalogue marketplace :
1. Exposer les filtres backend déjà présents (`categorySlug`, `originRegion`,
   `productionMethod`, `hasPublicDocs`) dans l'UI publique.
2. Ajouter **3 nouveaux filtres** côté backend pour exploiter les FP récents :
   - `qualityAttribute` (FP-7)
   - `temperatureRequirements` (FP-8)
   - `seasonalityMonth` (FP-1)
3. Câbler les 7 contrôles supplémentaires dans `CatalogFilters.tsx`.

## Commits prévus (atomiques)

1. `chore(notes): plan MP-FILTERS-1`
2. `feat(backend): MP-FILTERS-1 — DTO + buildCatalogWhere (qualityAttribute,
   temperatureRequirements, seasonalityMonth)` + 4 specs jest.
3. `feat(frontend): MP-FILTERS-1 — CatalogFilters expose 7 filtres
   supplémentaires (URL state)` + tests vitest dédiés.
4. `docs(marketplace): MP-FILTERS-1 — filtres catalog publique enrichis`.

## Backend

- DTO : `qualityAttribute?: ProductQualityAttribute`,
  `temperatureRequirements?: string @MaxLength(100)`,
  `seasonalityMonth?: SeasonalityMonth`.
- `buildCatalogWhere` :
  - `qualityAttribute` → `mpWhere.qualityAttributes = { has: q.qualityAttribute }`
  - `temperatureRequirements` → contains insensitive
  - `seasonalityMonth` → `mpWhere.AND.push({ OR: [{ isYearRound: true },
    { availabilityMonths: { has: q.seasonalityMonth } }] })` — additif pour
    ne pas écraser un éventuel `OR` de recherche texte.

## UI

`CatalogFilters` : ajout des contrôles, conservation du pattern
`URLSearchParams` (sérialisation/désérialisation, reset complet, soumission
single push).

Tests : nouveau fichier `CatalogFilters.test.tsx` (5–7 specs).

## Hors périmètre

- Pas de picker visuel pour les catégories (input texte slug).
- Pas de filtre certification (besoin join Certification — futur lot).
- Pas de filtre full-text (futur lot MP-SEARCH-1).
