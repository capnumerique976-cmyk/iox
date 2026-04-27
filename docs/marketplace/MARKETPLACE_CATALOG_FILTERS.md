# MP-FILTERS-1 — Filtres catalog publique enrichis

Lot **strictement additif** : 3 nouveaux paramètres backend + exposition UI
de 4 filtres déjà existants dans le DTO mais non câblés en façade publique.

## Filtres disponibles (catalog `/marketplace`)

| Param query                | Type / valeurs                          | Source       |
| -------------------------- | --------------------------------------- | ------------ |
| `q`                        | string (OR multi-champs)                | existant     |
| `originCountry`            | code ISO upper                          | existant     |
| `originRegion`             | string contains insensitive             | existant DTO, **nouveau UI** |
| `categorySlug`             | string                                  | existant DTO, **nouveau UI** |
| `productionMethod`         | string contains insensitive             | existant DTO, **nouveau UI** |
| `qualityAttribute`         | enum `ProductQualityAttribute` (FP-7)   | **nouveau** |
| `seasonalityMonth`         | enum `SeasonalityMonth` (FP-1)          | **nouveau** |
| `temperatureRequirements`  | string contains insensitive (FP-8)      | **nouveau** |
| `hasPublicDocs`            | `true|false`                            | nouveau (DTO existait, service ignorait) |
| `readiness`                | enum `ExportReadinessStatus`            | existant    |
| `priceMode`                | enum `MarketplacePriceMode`             | existant    |
| `moqMax`                   | number                                  | existant    |
| `availableOnly`            | `true|false`                            | existant    |
| `sellerSlug`               | string                                  | existant DTO (non exposé UI ce lot) |
| `sort`                     | enum `CatalogSort`                      | existant    |

## Sémantique des nouveaux filtres

### `qualityAttribute` (FP-7)

```ts
mpWhere.qualityAttributes = { has: q.qualityAttribute }
```

Match strict d'un attribut dans le tableau du produit. Pas d'OR multiple
(un seul attribut filtré à la fois — si l'utilisateur veut OR, il refait
plusieurs requêtes).

### `seasonalityMonth` (FP-1)

```ts
mpWhere.AND.push({
  OR: [
    { isYearRound: true },
    { availabilityMonths: { has: q.seasonalityMonth } },
  ],
});
```

Un produit `isYearRound = true` matche **tous les mois** ; sinon, le mois
demandé doit être présent dans `availabilityMonths`. Utilisation d'un AND
additif pour ne pas écraser l'éventuel `OR` de recherche texte (`q.q`).

### `temperatureRequirements` (FP-8)

```ts
mpWhere.temperatureRequirements = { contains: q.temperatureRequirements, mode: 'insensitive' }
```

### `hasPublicDocs`

Implémentation : pré-requête sur `MarketplaceDocument` (PUBLIC + VERIFIED +
`validUntil` null ou futur) restreinte aux `eligibleProductIds` puis
intersection. Polymorphique côté schéma → pas de back-relation Prisma sur
`MarketplaceProduct`.

## UI

`apps/frontend/src/components/marketplace/CatalogFilters.tsx` —
formulaire glass sticky `data-testid="catalog-filters"`, chaque contrôle
porte un `data-testid="catalog-filter-<name>"`.

- **Catégorie (slug)** : input texte, lowercase à la saisie.
- **Région d'origine** : input texte.
- **Méthode de production** : input texte.
- **Qualité structurée** : select 18 valeurs FP-7 + option vide.
- **Disponible en (mois)** : select 12 mois + option vide « Toute l'année ».
- **Température** : input texte (maxLength 100).
- **Documents publics requis** : checkbox.

URL state : tous les paramètres sont sérialisés dans `URLSearchParams`,
hydratés à l'ouverture, vidés au reset.

## Tests

- Backend : 5 specs jest dans `marketplace-catalog.service.spec.ts`
  (qualityAttribute, temperatureRequirements, seasonalityMonth, combo,
  hasPublicDocs intersection).
- Frontend : 6 specs vitest dans `CatalogFilters.test.tsx` (hydration,
  soumission URL, count d'options FP-7, count des 12 mois, reset, lowercase
  catégorie).

## Hors périmètre

- Pas de picker visuel pour les catégories (besoin d'un endpoint backend
  `GET /marketplace/categories` — futur lot).
- Pas de filtre certification (besoin de joindre `Certification` — futur lot).
- Pas de full-text avancé (`tsvector`, Meilisearch — candidat MP-SEARCH-1).
- Pas de filtre OR multi-attributs sur `qualityAttribute`.
- Pas de filtre `sellerSlug` exposé en UI (utilisé par les pages seller).
- Pas de SEO sur les pages filtrées.
