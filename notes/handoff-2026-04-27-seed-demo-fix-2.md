# Handoff — SEED-DEMO-FIX-2 — Hydratation FP-5 / FP-7 / FP-8

Date : 2026-04-27. Branche locale, **non poussée**.

## TL;DR

- Branche : `seed-demo-fix-2-quality-and-logistics` depuis `main` à `0c2a385`.
- 4 commits atomiques (notes plan + dataset/runner + tests + doc).
- Aucune modification hors `apps/backend/src/seed-demo/`,
  `docs/marketplace/SEED_DEMO.md`, `notes/`. Pas de DTO, pas de migration.
- Tests jest seed-demo : **14/14 ✓** (était 9/9).
- TypeScript : clean.
- Idempotence vérifiée localement (2 runs `IOX_DEMO_SEED=1` → mêmes
  compteurs `sellers: 4, products: 8, offers: 8, certifications: 6, mediaAssets: 8`).
- Hydratation DB locale vérifiée par `psql` direct : les 8 produits ont
  `quality_attributes`, `temperature_requirements`,
  `annual_production_capacity`, `restock_frequency` cohérents.

## Preuves brutes (anti-hallucination)

### 1. Branche + commits

```
seed-demo-fix-2-quality-and-logistics
73637b3 docs(marketplace): SEED-DEMO-FIX-2 — table d'hydratation FP-5/FP-7/FP-8
ba592f1 test(seed-demo): SEED-DEMO-FIX-2 — couverture hydratation FP-5/FP-7/FP-8
3b0f863 feat(seed-demo): SEED-DEMO-FIX-2 — hydrate FP-5/FP-7/FP-8 sur les produits demo
5f4c26d chore(notes): plan SEED-DEMO-FIX-2
```

### 2. Diff dataset.ts (tête)

```diff
+import { ... ProductQualityAttribute, ... } from '@prisma/client';
+  // SEED-DEMO-FIX-2 — FP-7 (qualité structurée).
+  qualityAttributes: ProductQualityAttribute[];
+  // SEED-DEMO-FIX-2 — FP-8 (logistique structurée).
+  packagingFormats: string[];
+  temperatureRequirements: string;
+  grossWeight: Prisma.Decimal;
+  netWeight: Prisma.Decimal;
+  palletization: string;
+  // SEED-DEMO-FIX-2 — FP-5 (volumes & capacités).
+  annualProductionCapacity: Prisma.Decimal;
+  capacityUnit: string;
+  availableQuantity: Prisma.Decimal;
+  availableQuantityUnit: string;
+  restockFrequency: string;
```

Puis 8 blocs d'hydratation, un par produit (cf. table ci-dessous).

### 3. Tests jest seed-demo

```
PASS src/seed-demo/seed-demo.spec.ts
Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Time:        1.975 s
```

### 4. tsc backend

```
(silencieux, exit 0)
```

### 5. Run réel local idempotence (2 runs consécutifs sur DB dev)

```
# Run 1
🌱 Demo seed starting…
✅ Demo seed done — sellers: 4, products: 8, offers: 8, certifications: 6, mediaAssets: 8, smokeSeller: smoke-seller@iox.mch

# Run 2 — mêmes compteurs (idempotence ✓)
🌱 Demo seed starting…
✅ Demo seed done — sellers: 4, products: 8, offers: 8, certifications: 6, mediaAssets: 8, smokeSeller: smoke-seller@iox.mch
```

## Tableau d'hydratation DB locale (vérifié par psql)

```
             slug             |               quality_attributes                | temperature_requirements | annual_production_capacity | restock_frequency
------------------------------+-------------------------------------------------+--------------------------+----------------------------+-------------------
 demo-fruit-passion           | {ORGANIC,HAND_HARVESTED}                        | Cool 8-12°C              |                   6000.000 | seasonal
 demo-mangue-maya             | {ORGANIC,HAND_HARVESTED,SMALL_BATCH}            | Cool 8-12°C              |                  25000.000 | seasonal
 demo-thon-conserve-huile     | {WILD_HARVESTED,TRADITIONAL}                    | Ambient                  |                  60000.000 | monthly
 demo-thon-jaune-iqf          | {WILD_HARVESTED,RAW}                            | Frozen ≤ -18°C           |                  45000.000 | weekly
 demo-vanille-bourbon-grade-a | {ORGANIC,FAIR_TRADE,HAND_HARVESTED,TRADITIONAL} | Cool 4-15°C, dry         |                    800.000 | seasonal
 demo-vanille-poudre          | {ORGANIC,FAIR_TRADE,SMALL_BATCH}                | Cool 4-15°C, dry         |                    200.000 | seasonal
 demo-ylang-complete          | {HANDMADE,ARTISANAL,TRADITIONAL}                | Cool 4-20°C, dark        |                    320.000 | monthly
 demo-ylang-extra             | {HANDMADE,ARTISANAL,COLD_PRESSED,SMALL_BATCH}   | Cool 4-20°C, dark        |                     45.000 | monthly
(8 rows)
```

## Décisions notables

- **Bloc commun `mpFields`** introduit dans `runner.ts` : factorise les ~30
  champs entre `update` et `create` du `marketplaceProduct.upsert` pour
  éviter la duplication et garantir la parité (un champ ajouté ne peut pas
  être oublié dans une moitié). Pattern identique au commit `c791d62` /
  `2f4cc01` qui a justement ajouté ces champs dans le service applicatif.
- **`temperatureRequirements: 'Frozen ≤ -18°C'`** posé sur `demo-thon-jaune-iqf`
  pour qu'au moins un produit matche `?temperatureRequirements=Frozen`.
- **4 produits ORGANIC, 2 FAIR_TRADE, 4 HAND_HARVESTED, 2 ARTISANAL** —
  pour que tous les filtres MP-FILTERS-1 retournent au moins un résultat.
- `qualityAttributes` reste sous le cap `@ArrayMaxSize(10)` du DTO : max 4
  par produit, bien en dessous.
- `availableQuantityUnit` distingué de `defaultUnit` : pour la conserve, on
  utilise `unités` côté capacité plutôt que `kg` (cohérent avec `defaultUnit`
  déjà à `unité`).

## TODO post-merge (à exécuter par l'utilisateur)

1. **Push + PR + merge + deploy** :

   ```
   git push -u origin seed-demo-fix-2-quality-and-logistics
   gh pr create --base main --head seed-demo-fix-2-quality-and-logistics \
     --title "feat(seed-demo): SEED-DEMO-FIX-2 — hydrate FP-5/FP-7/FP-8" \
     --body "Voir docs/marketplace/SEED_DEMO.md (section SEED-DEMO-FIX-2)"
   gh pr checks --watch && gh pr merge --squash --delete-branch
   git checkout main && git pull --ff-only origin main
   ./deploy/vps/deploy.sh all
   ```

2. **Réactivation du seed sur le VPS** (un container backend déjà sur main + seed flag) :

   ```
   ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend sh -c 'IOX_DEMO_SEED=1 pnpm db:seed:demo'"
   ```

3. **Validations curl** (les filtres MP-FILTERS-1 doivent enfin retourner ≥1) :

   ```
   curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?qualityAttribute=ORGANIC" | jq '.data.meta.total // .meta.total'
   # Attendu : 4

   curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?qualityAttribute=FAIR_TRADE" | jq '.data.meta.total // .meta.total'
   # Attendu : 2

   curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?temperatureRequirements=Frozen" | jq '.data.meta.total // .meta.total'
   # Attendu : 1

   curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?limit=1" \
     | jq -r '.data.data[0].productSlug // .data[0].productSlug' \
     | xargs -I{} curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog/products/{}" \
     | jq '.data | {qualityAttributes, temperatureRequirements, packagingFormats, annualProductionCapacity, restockFrequency}'
   # Attendu : aucune valeur null/[]
   ```

## Plan de push proposé (séquentiel)

```
git push -u origin seed-demo-fix-2-quality-and-logistics
gh pr create --base main --head seed-demo-fix-2-quality-and-logistics \
  --title "feat(seed-demo): SEED-DEMO-FIX-2 — hydrate FP-5/FP-7/FP-8 sur les produits demo" \
  --body "$(cat <<'EOF'
## SEED-DEMO-FIX-2 — Hydratation FP-5 / FP-7 / FP-8

Lot strictement additif sur le seed démo. Les 8 produits demo sont
hydratés avec FP-7 (qualityAttributes), FP-8 (temperatureRequirements,
packagingFormats, grossWeight, netWeight, palletization) et FP-5
(annualProductionCapacity, capacityUnit, availableQuantity,
availableQuantityUnit, restockFrequency).

### Dataset
- `apps/backend/src/seed-demo/dataset.ts` : interface `DemoProduct`
  étendue + 8 blocs d'hydratation cohérents.

### Runner
- `apps/backend/src/seed-demo/runner.ts` : bloc commun `mpFields`
  factorise `update`/`create` de `marketplaceProduct.upsert`.

### Tests
- +5 specs jest (cible 14/14 ✓).

### Idempotence
Vérifiée localement : 2 runs consécutifs → mêmes compteurs, aucune
duplication.

### Smoke à valider après merge + activation seed sur VPS
- [ ] `?qualityAttribute=ORGANIC` → 4 résultats
- [ ] `?qualityAttribute=FAIR_TRADE` → 2 résultats
- [ ] `?temperatureRequirements=Frozen` → 1 résultat
- [ ] Fiche publique d'un produit demo : champs FP-5/FP-7/FP-8 non vides.
EOF
)"
```

## Limitations connues

- Aucune modification du seed des certifications (déjà OK depuis le seed
  initial). Si on voulait des certifs FP-2 supplémentaires alignées sur
  les nouveaux qualityAttributes, c'est un futur lot.
- MediaAssets restent placeholders `placehold.co` (intentionnel, hors
  scope ce lot).
- Aucune migration nécessaire : les colonnes existent déjà depuis FP-5/FP-7/FP-8
  mergés (PR #14, #15, #12).
