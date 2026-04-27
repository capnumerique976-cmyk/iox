# SEED-DEMO-FIX-2 — Plan

Branche : `seed-demo-fix-2-quality-and-logistics` depuis `main` à `0c2a385`.

## Objectif

Hydrater les 8 produits demo avec les champs FP-7 (qualityAttributes),
FP-8 (temperatureRequirements / packagingFormats / grossWeight / netWeight /
palletization) et FP-5 (annualProductionCapacity / capacityUnit /
availableQuantity / availableQuantityUnit / restockFrequency).

## Mapping par produit (à incarner dans `dataset.ts`)

| Slug | qualityAttributes | temperatureRequirements | packagingFormats | restockFrequency |
|------|-------------------|-------------------------|------------------|------------------|
| demo-vanille-bourbon-grade-a | ORGANIC, FAIR_TRADE, HAND_HARVESTED, TRADITIONAL | Cool 4-15°C, dry | 250g vacuum, 500g vacuum, carton 1kg | seasonal |
| demo-vanille-poudre | ORGANIC, FAIR_TRADE, SMALL_BATCH | Cool 4-15°C, dry | 100g aluminium pouch, carton x12 | seasonal |
| demo-thon-jaune-iqf | WILD_HARVESTED, RAW | Frozen ≤ -18°C | filet 1kg vacuum, carton 5kg vacuum | weekly |
| demo-thon-conserve-huile | WILD_HARVESTED, TRADITIONAL | Ambient | boîte 200g, carton 24 unités | monthly |
| demo-ylang-extra | HANDMADE, ARTISANAL, COLD_PRESSED, SMALL_BATCH | Cool 4-20°C, dark | 100mL flacon ambré, 1L bidon inox | monthly |
| demo-ylang-complete | HANDMADE, ARTISANAL, TRADITIONAL | Cool 4-20°C, dark | 5kg bidon inox, 25kg bidon inox | monthly |
| demo-mangue-maya | ORGANIC, HAND_HARVESTED, SMALL_BATCH | Cool 8-12°C | plateau 4kg, carton 10kg | seasonal |
| demo-fruit-passion | ORGANIC, HAND_HARVESTED | Cool 8-12°C | cagette 4kg réutilisable, carton 8kg | seasonal |

`grossWeight`, `netWeight`, `palletization`, `annualProductionCapacity`,
`capacityUnit`, `availableQuantity`, `availableQuantityUnit` cohérents avec
le packagingDescription existant.

## Commits

1. `chore(notes): plan SEED-DEMO-FIX-2`
2. `feat(seed-demo): SEED-DEMO-FIX-2 — hydrate FP-5/FP-7/FP-8 sur les produits demo` (dataset + runner)
3. `test(seed-demo): SEED-DEMO-FIX-2 — couverture hydratation FP-5/FP-7/FP-8`
4. `docs(marketplace): SEED-DEMO-FIX-2 — table d'hydratation`
