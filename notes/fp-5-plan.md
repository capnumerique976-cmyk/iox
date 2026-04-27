# FP-5 — Plan

Branche : `fp-5-product-volumes-and-capacities`. Base : `main` à `441cc46`.

## Périmètre

Ajout de 5 champs structurés sur `MarketplaceProduct` pour exposer
volumes/capacités de production. Tous **optionnels**, **additifs**.

| Champ                       | Prisma                | Validation              |
| --------------------------- | --------------------- | ----------------------- |
| `annualProductionCapacity`  | `Decimal? (14, 3)`    | `[0, 1e9]`              |
| `capacityUnit`              | `String?` ≤ 20        | string                  |
| `availableQuantity`         | `Decimal? (14, 3)`    | `[0, 1e9]`              |
| `availableQuantityUnit`     | `String?` ≤ 20        | string                  |
| `restockFrequency`          | `String?` ≤ 30        | string libre            |

`availableQuantity` produit ≠ `MarketplaceOffer.availableQuantity` :
- Product : stock total dispo, agrégé seller-side (vitrine).
- Offer : qté disponible par offre commerciale (transaction).
Pas de validation de cohérence — flexibilité métier (unités potentiellement
différentes : capacité en T/an, stock en kg).

## Fichiers à toucher

1. `prisma/schema.prisma` — 5 colonnes sur `MarketplaceProduct`.
2. `prisma/migrations/2026XXXX_add_marketplace_product_volumes_and_capacities/migration.sql`
   — 5 `ALTER TABLE ADD COLUMN`. Strictement additif.
3. `apps/backend/src/marketplace-products/dto/marketplace-product.dto.ts`
   — 5 champs sur Create + Update.
4. `apps/backend/src/marketplace-products/marketplace-products.service.ts`
   — mapping create explicite, ajout des 5 champs à la liste `vitrine`.
5. `apps/backend/src/marketplace-products/marketplace-products.service.spec.ts`
   — 2-3 tests (création, update PUBLISHED → IN_REVIEW si touche).
6. `apps/backend/src/marketplace-catalog/marketplace-catalog.service.ts`
   — `ProductDetail` expose les 5 champs (avec `Number(...)` pour les
   Decimal). **+ rattrapage** : FP-8 n'a pas étendu cette projection,
   ses 5 champs sont aussi absents — ajout dans le même commit.
7. `apps/frontend/src/lib/marketplace-products.ts`
   — étendre `SellerMarketplaceProduct` + `UpdateMarketplaceProductInput`.
8. `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx`
   — section "Volumes et capacités" (5 inputs).
9. `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.test.tsx`
   — 2-3 tests (rendu, dirty, payload).
10. `apps/frontend/src/app/marketplace/products/[slug]/page.tsx` — section
    "Volumes et capacités" sur la fiche publique (si ≥ 1 champ rempli).
11. `docs/marketplace/MARKETPLACE_PRODUCT_VOLUMES.md` — runbook.

## Ordre d'exécution (commits atomiques)

1. plan (ce fichier).
2. `feat(prisma): FP-5 — colonnes volumes & capacités (additif)`.
3. `feat(backend): FP-5 — DTO + service volumes & capacités + projection catalog`
   (intègre le rattrapage FP-8 dans la projection — mentionné dans le
   message de commit).
4. `feat(frontend): FP-5 — section volumes & capacités côté seller +
   fiche publique`.
5. `docs: FP-5 — runbook volumes et capacités`.

## Hors périmètre

- Refacto `defaultUnit` / `minimumOrderQuantity` (lot séparé).
- Validation de cohérence d'unités.
- Mise à jour du dataset seed-demo (futur SEED-DEMO-FIX-2).
- Modification de `SCORED_FIELDS` (stabilité du score, comme FP-8).
- Pondération scoring logistique/volumes (lot scoring dédié).
