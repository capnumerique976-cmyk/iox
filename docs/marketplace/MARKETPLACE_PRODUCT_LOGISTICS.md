# FP-8 — Logistique structurée produit marketplace

Lot **FP-8** — Date : 2026-04-27.

## Objectif

Exposer dans la fiche produit marketplace les informations logistiques
structurées attendues par les acheteurs export :

| Champ                     | Type             | Limites                    |
| ------------------------- | ---------------- | -------------------------- |
| `packagingFormats`        | `string[]`       | ≤ 12, chaque ≤ 80 chars    |
| `temperatureRequirements` | `string \| null` | ≤ 100 chars                |
| `grossWeight` (kg)        | `Decimal(10,3)`  | ≥ 0, ≤ 100 000             |
| `netWeight` (kg)          | `Decimal(10,3)`  | ≥ 0, ≤ 100 000             |
| `palletization`           | `string \| null` | ≤ 500 chars                |

Tous les champs sont **optionnels** et **additifs** — aucune ligne
existante n'est touchée par la migration.

## Migration

`prisma/migrations/20260427000000_add_marketplace_product_logistics/`
ajoute les 5 colonnes côté Postgres :

```sql
ALTER TABLE "marketplace_products" ADD COLUMN "packaging_formats" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "marketplace_products" ADD COLUMN "temperature_requirements" TEXT;
ALTER TABLE "marketplace_products" ADD COLUMN "gross_weight" DECIMAL(10, 3);
ALTER TABLE "marketplace_products" ADD COLUMN "net_weight" DECIMAL(10, 3);
ALTER TABLE "marketplace_products" ADD COLUMN "palletization" TEXT;
```

Pas d'index — données vitrine, non requêtables au MVP.

## Backend

- `Create/UpdateMarketplaceProductDto` : 5 champs validés
  (`@IsArray @ArrayMaxSize(12) @MaxLength(80,each)` pour
  `packagingFormats`, `@IsNumber @Min(0) @Max(100000)` pour les poids).
- `MarketplaceProductsService.create()` : mapping explicite des 5
  champs au `prisma.marketplaceProduct.create({ data })`.
- `MarketplaceProductsService.update()` : propagation via spread `...dto`.
  Les 5 champs sont ajoutés à la liste `vitrine` qui déclenche la
  re-revue (`PUBLISHED|APPROVED → IN_REVIEW`) si modifiés — cohérent
  avec `packagingDescription` (donnée affichée côté acheteur).

`SCORED_FIELDS` (algorithme `completionScore`) **n'est pas modifié**
dans ce lot pour préserver la stabilité du score. Une éventuelle
pondération logistique sera traitée dans un lot scoring dédié.

## Frontend

Nouvelle section « Logistique (FP-8) » sur la page d'édition seller
`/seller/marketplace-products/[id]` :

- `packagingFormats` saisi en CSV (« 1kg, 5kg, carton 10kg »), parsé
  + dédoublonné à l'envoi.
- Poids brut / poids net en `<input type="number" step="0.001">`
  (kg, 3 décimales, miroir Decimal(10,3) backend).
- `palletization` en `<textarea rows={2}>`.

Tous les champs respectent le pattern diff PATCH minimal : seul le
delta initial → courant est envoyé.

## Tests

- **Backend (jest)** : +2 tests dans
  `marketplace-products.service.spec.ts` :
  - propagation des 5 champs au create
  - patch `packagingFormats` sur PUBLISHED ⇒ IN_REVIEW
  - 35/35 verts.

- **Frontend (vitest)** : +3 tests dans `[id]/page.test.tsx` :
  - hydratation CSV + Decimal en string
  - PATCH diff `packagingFormats` parsé + dédoublonné
  - validation client > 12 entrées
  - 18/18 verts (page détail) — 176/176 verts (frontend complet).

## Smoke après déploiement

1. Connecté seller → ouvrir un produit existant. Section « Logistique »
   présente, vide.
2. Saisir « 1kg, 5kg, 5kg, carton 10kg » → enregistrer. Vérifier que
   la valeur persistée est `["1kg", "5kg", "carton 10kg"]` (3 entrées,
   doublons retirés).
3. Saisir poids brut/net + palettisation → enregistrer → vérifier
   round-trip.
4. Sur produit PUBLISHED, modifier `packagingFormats` → bandeau
   re-revue affiché → submit → statut bascule IN_REVIEW.
5. Saisir 13 entrées CSV → bandeau `validation-error` côté UI ; pas
   d'appel API.
