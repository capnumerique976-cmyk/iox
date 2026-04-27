# FP-7 — Qualité structurée (qualityAttributes) — plan

## Objectif

Ajouter à `MarketplaceProduct` un champ **enum-array** fermé
`qualityAttributes: ProductQualityAttribute[] @default([])` permettant au
seller de cocher des attributs qualité (Bio, Non-OGM, Récolte manuelle, etc.)
au-delà du texte libre `technicalSpecifications`.

MVP : enum fermé Prisma 18 valeurs (pas de table polymorphe — peut évoluer
plus tard). Strictement additif, jamais bloquant.

## Modèle (additif)

- Enum Prisma `ProductQualityAttribute` (18 valeurs : NON_GMO, ORGANIC,
  HANDMADE, TRADITIONAL, HAND_HARVESTED, GLUTEN_FREE, LACTOSE_FREE, VEGAN,
  VEGETARIAN, KOSHER, HALAL, WILD_HARVESTED, SMALL_BATCH, COLD_PRESSED, RAW,
  FAIR_TRADE, ARTISANAL, OTHER).
- Colonne `quality_attributes ProductQualityAttribute[] @default([])`.
- Migration : `CREATE TYPE` + `ALTER TABLE ADD COLUMN ... DEFAULT ARRAY[]`.

## Backend

- DTO Create + Update : `qualityAttributes?: ProductQualityAttribute[]`,
  `@IsArray() @IsEnum(..., { each: true }) @ArrayMaxSize(10)`.
- Service `create()` propage le tableau (défaut `[]`).
- Vitrine : ajouter `qualityAttributes` à la liste `vitrine` (patch
  APPROVED|PUBLISHED → IN_REVIEW).
- Catalog projection `ProductDetail` : exposer `qualityAttributes`.
- Specs jest : 2 (propagation create + transition IN_REVIEW sur patch).

## Frontend

- `marketplace-products.ts` helper : ajouter `qualityAttributes` à
  `SellerMarketplaceProduct` + `UpdateMarketplaceProductInput`.
- Page seller `[id]/page.tsx` : section "Qualité structurée" avec
  checkboxes/tags togglables pour les 18 valeurs (libellés FR), max 10.
- Page publique `[slug]/page.tsx` : carte glass "Qualité" avec badges
  (no-op si tableau vide).
- `marketplace/types.ts` : ajouter `qualityAttributes: string[]` à
  `ProductDetail`.
- Tests vitest : 2 (hydratation depuis produit, PATCH diff envoie tableau).

## Doc

`docs/marketplace/MARKETPLACE_PRODUCT_QUALITY.md` : modèle, libellés,
sémantique, limites.

## Hors périmètre

- Pas de structuration `technicalSpecifications`.
- Pas de filtre catalog public (LOT 3 MP-FILTERS-1).
- Pas d'i18n EN (FR + slug enum brut en fallback).

## Ordre des commits

1. `chore(notes): plan FP-7`
2. `feat(prisma): FP-7 — enum + colonne quality_attributes (additif)`
3. `feat(backend): FP-7 — DTO + service + projection qualityAttributes`
4. `feat(frontend): FP-7 — section seller qualité structurée`
5. `feat(frontend): FP-7 — badges qualité fiche publique`
6. `docs(marketplace): FP-7 — qualité structurée (enum + UI + tests)`
