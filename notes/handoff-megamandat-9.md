# Handoff — Méga-mandat 9 (LOCAL-ONLY)

Date : 2026-04-27.
Périmètre : 3 lots chaînés livrés **strictement en local**.
`main` reste à `9f9fddd` (vérifié, aucun push, aucun merge, aucun
déploiement, aucune action VPS). Aucune branche poussée sur l'origin.

```
$ git log -1 main --oneline
9f9fddd feat: SEED-DEMO marketplace fixtures (idempotent, flag-gated) (#9)
```

## Synthèse des branches

| Lot           | Branche                                          | Commits | Base       |
| ------------- | ------------------------------------------------ | ------- | ---------- |
| MP-EDIT-PRODUCT.2 | `mp-edit-product-2-seller-create-and-workflow` | 6       | `d31a5ff` |
| FP-8          | `fp-8-product-logistics-structured`              | +4      | LOT 1     |
| SEED-DEMO-FIX | `seed-demo-fix-media-assets`                     | +2      | LOT 2     |

## LOT 1 — MP-EDIT-PRODUCT.2

**Objectif** : permettre au seller de créer un produit marketplace
(draft) et de piloter le workflow (submit / archive) depuis la fiche
détail.

### Commits (chronologique)

```
5495025 chore(notes): plan MP-EDIT-PRODUCT.2
fbc21b6 feat(frontend): MP-EDIT-PRODUCT.2 — page seller création produit
0d1181d feat(frontend): MP-EDIT-PRODUCT.2 — étendre helper marketplace-products
9be4d67 feat(frontend): MP-EDIT-PRODUCT.2 — actions submit + archive sur page détail
5efb6c3 feat(frontend): MP-EDIT-PRODUCT.2 — bouton "Nouveau produit" sur l'index seller
0abcc95 docs: MP-EDIT-PRODUCT.2 — création + workflow soumission/archivage
```

### Fichiers clés

- `apps/frontend/src/app/(dashboard)/seller/marketplace-products/new/page.tsx`
  + `.test.tsx` (6 tests) — création draft, slugify NFD, résolution
  `sellerProfileId` via `getMine`, validation UUID.
- `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx`
  + `.test.tsx` (15 tests) — actions `onWorkflowSubmit` (warning,
  refresh in-place) et `onWorkflowArchive` (danger, redirect). Boutons
  conditionnés au `publicationStatus`.
- `apps/frontend/src/app/(dashboard)/seller/marketplace-products/page.tsx`
  + `.test.tsx` — CTA `data-testid="link-new-product"` → `/new`.
- `docs/marketplace/MARKETPLACE_PRODUCT_EDIT.md` — section dédiée.

### Preuves

- Frontend vitest : **176/176 verts**, dont 18/18 sur `[id]/page.test.tsx`,
  6/6 sur `new/page.test.tsx`.
- `tsc --noEmit` frontend : **clean**.

## LOT 2 — FP-8 Logistique structurée

**Objectif** : exposer 5 champs logistiques (`packagingFormats`,
`temperatureRequirements`, `grossWeight`, `netWeight`, `palletization`)
sur la fiche produit marketplace, additif et optionnel.

### Commits

```
7ae15f8 feat(prisma): FP-8 — colonnes logistique structurée marketplace_products (additif)
5d02f46 feat(backend): FP-8 — DTO + service logistique structurée marketplace
7966e5e feat(frontend): FP-8 — section logistique structurée dans l'éditeur seller
44977cf docs: FP-8 — runbook logistique structurée marketplace
```

### Fichiers clés

- `prisma/migrations/20260427000000_add_marketplace_product_logistics/migration.sql`
  + `prisma/schema.prisma` — 5 colonnes additives (`packaging_formats
  TEXT[] DEFAULT ARRAY[]`, `temperature_requirements TEXT`,
  `gross_weight/net_weight DECIMAL(10,3)`, `palletization TEXT`).
  Aucun index, aucune ligne touchée.
- `apps/backend/src/marketplace-products/dto/marketplace-product.dto.ts`
  — validations `@ArrayMaxSize(12)`, `@MaxLength(80,each)`,
  `@Min(0) @Max(100000)` sur les poids.
- `apps/backend/src/marketplace-products/marketplace-products.service.ts`
  — mapping explicite create + spread update, ajout des 5 champs à la
  liste `vitrine` (re-revue PUBLISHED|APPROVED → IN_REVIEW si modifiés).
  `SCORED_FIELDS` **non modifié** (stabilité du score).
- `apps/frontend/src/lib/marketplace-products.ts` + `[id]/page.tsx` —
  parsing CSV + dédoublonnage `parsePackagingFormats`, validation
  client > 12 entrées.
- `docs/marketplace/MARKETPLACE_PRODUCT_LOGISTICS.md` — runbook complet.

### Preuves

- Migration appliquée localement via `prisma migrate deploy --schema
  prisma/schema.prisma` ; vérifiée par `\d marketplace_products`.
- Backend jest service : **35/35 verts** (+2 FP-8).
- Frontend vitest `[id]/page.test.tsx` : **18/18 verts** (+3 FP-8).
- `tsc --noEmit` backend + frontend : **clean**.

## LOT 3 — SEED-DEMO-FIX MediaAssets PRIMARY APPROVED

**Objectif** : faire remonter les 8 produits démo dans la marketplace
publique. Le filtre catalogue exige `MediaAsset role=PRIMARY
moderationStatus=APPROVED` lié — sans cet asset, les 8 produits
`PUBLISHED` du seed restaient invisibles (catalog count = 0).

### Commits

```
1a14434 feat(backend): SEED-DEMO-FIX — MediaAssets PRIMARY APPROVED par produit demo (idempotent)
803d746 docs(seed-demo): document SEED-DEMO-FIX MediaAssets PRIMARY APPROVED
```

### Fichiers clés

- `apps/backend/src/seed-demo/runner.ts` — bloc post-products :
  résolution uploader (smoke seller `findUnique` → fallback ADMIN
  `findFirst` → no-op warning si aucun), puis pour chaque produit :
  `findFirst` `(relatedType=MARKETPLACE_PRODUCT, relatedId, role=PRIMARY)`
  → create-or-update, puis `marketplaceProduct.update({ data:
  { mainMediaId } })`. Ajout de `mediaAssets: number` à
  `RunnerSummary`.
- `apps/backend/src/seed-demo/seed-demo.spec.ts` — extensions des
  mocks Prisma + 3 nouveaux tests (création initiale, idempotence,
  fallback no-uploader).
- `docs/marketplace/SEED_DEMO.md` — section SEED-DEMO-FIX.

### Preuves

- Backend jest seed-demo : **9/9 verts** (3 nouveaux).
- `tsc --noEmit` backend : **clean**.
- Run réel contre dev DB locale (`IOX_DEMO_SEED=1 pnpm db:seed:demo`) :
  ```
  ✅ Demo seed done — sellers: 4, products: 8, offers: 8,
     certifications: 6, mediaAssets: 8, smokeSeller: smoke-seller@iox.mch
  ```
- Vérifications SQL :
  ```sql
  SELECT COUNT(*) FROM media_assets
   WHERE related_type='MARKETPLACE_PRODUCT'
     AND role='PRIMARY' AND moderation_status='APPROVED';   -- 8
  SELECT COUNT(*) FROM marketplace_products
   WHERE main_media_id IS NOT NULL;                          -- 8
  ```
- Idempotence vérifiée par 2ᵉ run consécutif : `mediaAssets: 8` toujours,
  count DB stable à 8 (aucune création en double).

## Vérifications finales

```
$ git log -1 main --oneline
9f9fddd feat: SEED-DEMO marketplace fixtures (idempotent, flag-gated) (#9)

$ git branch
  fp-8-product-logistics-structured
  main
  mp-edit-product-2-seller-create-and-workflow
* seed-demo-fix-media-assets
```

Aucun `git push`, aucun `gh pr create`, aucun merge dans `main`,
aucune action VPS. Tout est local et reviewable depuis ces 3 branches.

## Suite (hors mandat)

- Owner ouvre 3 PR distinctes (LOT 1 → LOT 2 → LOT 3) dans cet ordre,
  car FP-8 dépend de la migration Prisma sur `main` post-merge LOT 1
  (en réalité LOT 1 est purement frontend → ordre PR libre).
- Après merge SEED-DEMO-FIX en pré-prod, ré-exécuter
  `IOX_DEMO_SEED=1 pnpm db:seed:demo` sur l'env démo pour back-filler les
  8 MediaAssets manquants — la marketplace publique remontera enfin les
  8 produits seedés.
