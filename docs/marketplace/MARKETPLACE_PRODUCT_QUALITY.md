# FP-7 — Qualité structurée (qualityAttributes)

Lot **strictement additif** : 1 enum Prisma + 1 colonne array sur
`MarketplaceProduct`, hydratée par le seller via multi-select, projetée
publiquement sous forme de badges.

## Modèle

- **Enum** Prisma `ProductQualityAttribute` — 18 valeurs MVP :
  `NON_GMO, ORGANIC, HANDMADE, TRADITIONAL, HAND_HARVESTED, GLUTEN_FREE,
  LACTOSE_FREE, VEGAN, VEGETARIAN, KOSHER, HALAL, WILD_HARVESTED,
  SMALL_BATCH, COLD_PRESSED, RAW, FAIR_TRADE, ARTISANAL, OTHER`.
- **Colonne** `quality_attributes ProductQualityAttribute[] @default([])`.

Migration : `20260427020000_add_marketplace_product_quality_attributes`
(`CREATE TYPE` + `ALTER TABLE ADD COLUMN ... DEFAULT ARRAY[]`).

### Politique d'évolution de l'enum

- **Ajouter une valeur** : la mettre dans le schéma Prisma + le miroir
  TypeScript (`@iox/shared` + `apps/frontend/src/lib/marketplace/types.ts` +
  les deux maps de libellés FR), puis générer la migration via
  `pnpm db:migrate -- --name extend_quality_attributes_with_xxx`.
- **NE JAMAIS supprimer** une valeur — créer une nouvelle valeur si la
  sémantique évolue, et désactiver la sélection de l'ancienne dans l'UI.

## Backend

- DTO Create + Update (`marketplace-product.dto.ts`) :
  ```ts
  @IsArray() @IsEnum(ProductQualityAttribute, { each: true })
  @ArrayUnique() @ArrayMaxSize(10)
  qualityAttributes?: ProductQualityAttribute[];
  ```
- Service `create()` : propage `dto.qualityAttributes ?? []`.
- Service `update()` : `qualityAttributes` ajouté à la liste **vitrine** —
  un patch sur un produit `APPROVED|PUBLISHED` flippe en `IN_REVIEW`.
- `marketplace-catalog.service.ts → ProductDetail` : expose
  `qualityAttributes: product.qualityAttributes ?? []`.

## UI seller

Page `/seller/marketplace-products/[id]` — section **« Qualité structurée
(FP-7) »** :

- 18 boutons-tags togglables (`data-testid="quality-attr-<ENUM>"`,
  `data-selected="true|false"`), libellés FR locaux.
- Compteur `n / 10` (`data-testid="quality-count"`).
- Au-delà de 10 sélectionnés, les autres tags sont `disabled` (atribut HTML
  + classe gris). Le serveur renforce via `@ArrayMaxSize(10)`.
- Diff par **contenu** (ordre indifférent) — `qualityAttributesEqual` —
  pour ne pas envoyer le tableau si l'utilisateur clique puis re-clique le
  même tag.

## UI publique

Page `/marketplace/products/[slug]` — carte glass **« Qualité »** placée
après "Volumes et capacités" :

- Badges cyan tour cohérent design system
  (`data-testid="quality-badge-<ENUM>"`).
- Carte **non rendue** si tableau vide (no-op total).
- Libellé FR via map locale `QUALITY_ATTRIBUTE_LABEL_FR`, fallback au
  slug brut.

## Tests

- Backend : 2 specs jest dans `marketplace-products.service.spec.ts`
  (propagation create + transition `PUBLISHED → IN_REVIEW` sur patch
  `qualityAttributes`).
- Frontend seller : 3 specs vitest dans `[id]/page.test.tsx`
  (hydration depuis le produit, toggle + PATCH par contenu, désactivation
  à 10/10).

## Hors périmètre

- Pas de structuration de `technicalSpecifications` (texte libre conservé).
- Pas de filtre catalog public (LOT 3 — MP-FILTERS-1).
- Pas d'i18n EN — fallback slug brut côté UI publique si traduction absente.
- Pas de relation entre `qualityAttributes` produit et `certifications`
  (un attribut "FAIR_TRADE" peut overlap avec une certif `FAIRTRADE` —
  c'est OK : attribut produit ≠ certification structurée).
