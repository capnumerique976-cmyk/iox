# Handoff méga-mandat 11 — 2026-04-27

## TL;DR

- LOT 1 (FP-5) : ✅ livré — branche `fp-5-product-volumes-and-capacities` (4 commits feat + doc).
- LOT 2 (FP-7) : ✅ livré — branche `fp-7-product-quality-attributes` (6 commits, depuis `fp-5`).
- LOT 3 (MP-FILTERS-1) : ✅ livré — branche `mp-filters-1-catalog-public-rich` (4 commits, depuis `fp-7`).
- main intact à `441cc46` : ✓ (vérifié par `git log -1 main --oneline`).
- Aucun push / merge / deploy / gh / ssh : ✓ (`git branch -r | grep -E "(fp-5|fp-7|mp-filters-1)"` → aucune ligne).
- Une migration Prisma additive appliquée localement (LOT 2). Aucun DROP/RENAME.

---

## LOT 1 — FP-5 (Volumes et capacités)

### État

- Branche : `fp-5-product-volumes-and-capacities` (depuis `main`).
- Commits :
  - `c791d62` feat(backend): FP-5 — DTO + service volumes & capacités + projection catalog.
  - `296dc76` feat(frontend): FP-5 — section seller volumes & capacités produit.
  - `9e99487` feat(frontend): FP-5 — sections publiques Logistique + Volumes & capacités.
  - `00b1661` docs(marketplace): FP-5 — volumes et capacités.
- Fichiers modifiés :
  - `apps/backend/src/marketplace-products/dto/marketplace-product.dto.ts` — 5 nouveaux champs (annualProductionCapacity, capacityUnit, availableQuantity, availableQuantityUnit, restockFrequency).
  - `apps/backend/src/marketplace-products/marketplace-products.service.ts` — propagation create + vitrine.
  - `apps/backend/src/marketplace-products/marketplace-products.service.spec.ts` — 2 specs FP-5.
  - `apps/backend/src/marketplace-catalog/marketplace-catalog.service.ts` — projection ProductDetail (+ rattrapage projection FP-8 oubliée mandate 10).
  - `apps/frontend/src/lib/marketplace-products.ts` — types seller (read + write).
  - `apps/frontend/src/lib/marketplace/types.ts` — ProductDetail public (FP-5 + FP-8 rattrapés).
  - `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx` — section "Volumes et capacités (FP-5)".
  - `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.test.tsx` — 3 specs vitest (hydration, PATCH diff, refus > 1e9).
  - `apps/frontend/src/app/marketplace/products/[slug]/page.tsx` — 2 cards publiques "Logistique" + "Volumes et capacités" (no-op si null).
- Fichier créé : `docs/marketplace/MARKETPLACE_PRODUCT_VOLUMES.md`.

### Décisions techniques

- Pattern vitrine : les 5 nouveaux champs entrent dans la liste vitrine du
  service.update(). Un PATCH sur produit `APPROVED|PUBLISHED` flippe en
  `IN_REVIEW`.
- Decimal Prisma → `Number(...)` côté projection catalog pour rester
  JSON-safe.
- Rattrapage incident projection FP-8 (champs ajoutés en mandate 10 mais
  oubliés dans `findProductBySlug`) committé en même temps que FP-5
  backend (même bloc ProductDetail).

### Smoke tests proposés post-merge

- [ ] Édition seller : section Volumes apparaît avec 5 champs ; saisie
      `availableQuantity = 1500` puis save ; attendre toast OK.
- [ ] Fiche publique : carte Volumes & capacités s'affiche pour ce produit ;
      ne s'affiche pas pour un produit non rempli.
- [ ] Validation backend : `availableQuantity > 1e9` → 400 BadRequest.
- [ ] Statut : produit `PUBLISHED` patché sur capacityUnit revient en
      `IN_REVIEW`.

---

## LOT 2 — FP-7 (Qualité structurée)

### État

- Branche : `fp-7-product-quality-attributes` (depuis `fp-5-product-volumes-and-capacities`).
- Commits :
  - `a00ef32` chore(notes): plan FP-7.
  - `18c66b2` feat(prisma): FP-7 — enum + colonne quality_attributes (additif).
  - `2f4cc01` feat(backend): FP-7 — DTO + service + projection qualityAttributes.
  - `984e24b` feat(frontend): FP-7 — section seller qualité structurée + diff par contenu.
  - `5aa5470` feat(frontend): FP-7 — badges qualité fiche publique.
  - `ac1e8ac` docs(marketplace): FP-7 — qualité structurée.
- Migration créée et appliquée localement :
  `prisma/migrations/20260427020000_add_marketplace_product_quality_attributes/migration.sql`
  (CREATE TYPE + ALTER TABLE ADD COLUMN ... DEFAULT ARRAY[]). Aucun
  DROP / RENAME.
- Fichiers modifiés :
  - `prisma/schema.prisma` — enum `ProductQualityAttribute` (18 valeurs) + colonne `qualityAttributes`.
  - `packages/shared/src/enums/index.ts` — miroir TypeScript de l'enum (rebuilt via `pnpm --filter @iox/shared build`).
  - `apps/backend/src/marketplace-products/dto/marketplace-product.dto.ts` — `@IsArray @IsEnum each @ArrayUnique @ArrayMaxSize(10)`.
  - `apps/backend/src/marketplace-products/marketplace-products.service.ts` — propagation create + vitrine.
  - `apps/backend/src/marketplace-products/marketplace-products.service.spec.ts` — 2 specs FP-7.
  - `apps/backend/src/marketplace-catalog/marketplace-catalog.service.ts` — projection `qualityAttributes ?? []`.
  - `apps/frontend/src/lib/marketplace-products.ts` — type seller.
  - `apps/frontend/src/lib/marketplace/types.ts` — `ProductQualityAttribute` + ProductDetail.
  - `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx` — section togglable + compteur n/10 + diff par contenu.
  - `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.test.tsx` — 3 specs vitest (hydration, toggle PATCH, disabled à 10/10).
  - `apps/frontend/src/app/marketplace/products/[slug]/page.tsx` — carte "Qualité" (badges cyan).
- Fichier créé : `docs/marketplace/MARKETPLACE_PRODUCT_QUALITY.md` (politique d'évolution enum incluse — NEVER DROP).

### Décisions techniques

- 10-max enforcement sur 3 couches : DTO `@ArrayMaxSize(10)`, validateClient,
  UI `disabled` sur les tags non sélectionnés.
- Diff par contenu (`qualityAttributesEqual`) — sort + compare — pour ne pas
  envoyer un PATCH si l'utilisateur clique puis re-clique le même tag.
- Politique d'évolution de l'enum : NE JAMAIS supprimer une valeur ;
  ajouter une nouvelle valeur via `pnpm db:migrate -- --name extend_quality_attributes_with_xxx`
  (à lancer depuis `apps/backend/.env` ou avec `DATABASE_URL=...` injecté).

### Smoke tests proposés post-merge

- [ ] Édition seller : 18 boutons-tags togglables avec libellés FR.
- [ ] Sélectionner 10 → les autres deviennent `disabled` + compteur `10 / 10`.
- [ ] PATCH ne part pas si l'utilisateur revient à l'état initial.
- [ ] Fiche publique : badges cyan affichés ; rien si tableau vide.
- [ ] Statut : produit `PUBLISHED` patché sur qualityAttributes → `IN_REVIEW`.

---

## LOT 3 — MP-FILTERS-1 (Filtres catalog publique enrichis)

### État

- Branche : `mp-filters-1-catalog-public-rich` (depuis `fp-7-product-quality-attributes`).
- Commits :
  - `9b34ab9` chore(notes): plan MP-FILTERS-1.
  - `8c784c6` feat(backend): MP-FILTERS-1 — DTO + buildCatalogWhere
    (qualityAttribute, temperatureRequirements, seasonalityMonth, hasPublicDocs).
  - `edea8e8` feat(frontend): MP-FILTERS-1 — CatalogFilters expose 7 filtres
    supplémentaires (URL state).
  - `5ac69a9` docs(marketplace): MP-FILTERS-1 — filtres catalog publique enrichis.
- Fichiers modifiés :
  - `apps/backend/src/marketplace-catalog/dto/catalog-query.dto.ts` — 3 nouveaux paramètres (qualityAttribute, temperatureRequirements, seasonalityMonth).
  - `apps/backend/src/marketplace-catalog/marketplace-catalog.service.ts` — `buildCatalogWhere` étendu + helper `findProductsWithPublicDocuments` + intersection eligibleProductIds.
  - `apps/backend/src/marketplace-catalog/marketplace-catalog.service.spec.ts` — 5 specs jest (qualityAttribute, temperatureRequirements, seasonalityMonth, combo, hasPublicDocs intersection).
  - `apps/frontend/src/components/marketplace/CatalogFilters.tsx` — 7 nouveaux contrôles (categorySlug, originRegion, productionMethod, qualityAttribute, seasonalityMonth, temperatureRequirements, hasPublicDocs) avec data-testid + URL state.
- Fichiers créés :
  - `apps/frontend/src/components/marketplace/CatalogFilters.test.tsx` — 6 specs vitest.
  - `docs/marketplace/MARKETPLACE_CATALOG_FILTERS.md`.
  - `notes/mp-filters-1-plan.md`.

### Décisions techniques

- `seasonalityMonth` : `mpWhere.AND.push({ OR: [{ isYearRound: true },
  { availabilityMonths: { has } }] })` — additif, n'écrase pas le `OR` de
  recherche texte `q.q`.
- `hasPublicDocs` : `MarketplaceDocument` est polymorphe (pas de back-relation
  Prisma sur `MarketplaceProduct`). Implémenté via pré-requête puis
  intersection avec `eligibleProductIds`. Le champ existait dans le DTO mais
  était ignoré par le service avant ce lot.
- `qualityAttribute` : un seul attribut filtré à la fois (pas d'OR multi-tag —
  futur lot si nécessaire).
- UI : pas de picker visuel pour les catégories (input texte slug, lowercase
  à la saisie).

### Smoke tests proposés post-merge

- [ ] `?qualityAttribute=ORGANIC` filtre uniquement les produits dont
      `qualityAttributes` contient `ORGANIC`.
- [ ] `?seasonalityMonth=JUN` retourne les produits `isYearRound=true` OU
      ceux dont `availabilityMonths` contient `JUN`.
- [ ] `?temperatureRequirements=Frozen` retourne les produits dont
      `temperatureRequirements ILIKE '%Frozen%'`.
- [ ] `?hasPublicDocs=true` retourne uniquement les produits avec ≥1
      `MarketplaceDocument` PUBLIC + VERIFIED + non expiré.
- [ ] UI `/marketplace` : 7 nouveaux contrôles visibles, hydratés depuis
      l'URL, vidés au reset.

### Preuves brutes (anti-hallucination)

```
=== branch ===
mp-filters-1-catalog-public-rich

=== mp-filters-1 commits ===
5ac69a9 docs(marketplace): MP-FILTERS-1 — filtres catalog publique enrichis
edea8e8 feat(frontend): MP-FILTERS-1 — CatalogFilters expose 7 filtres supplémentaires (URL state)
8c784c6 feat(backend): MP-FILTERS-1 — DTO + buildCatalogWhere (qualityAttribute, temperatureRequirements, seasonalityMonth, hasPublicDocs)
9b34ab9 chore(notes): plan MP-FILTERS-1

=== diff stat fp-7..HEAD ===
 .../marketplace-catalog/dto/catalog-query.dto.ts   |  37 +++-
 .../marketplace-catalog.service.spec.ts            |  84 +++++++++
 .../marketplace-catalog.service.ts                 |  64 ++++++-
 .../components/marketplace/CatalogFilters.test.tsx | 128 +++++++++++++
 .../src/components/marketplace/CatalogFilters.tsx  | 198 ++++++++++++++++++++-
 docs/marketplace/MARKETPLACE_CATALOG_FILTERS.md    | 100 +++++++++++
 notes/mp-filters-1-plan.md                         |  49 +++++
 7 files changed, 648 insertions(+), 12 deletions(-)

=== backend tsc (apps/backend) ===
(silencieux, exit 0)

=== frontend tsc (apps/frontend) ===
(silencieux, exit 0)

=== backend jest scope marketplace-catalog ===
Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total

=== frontend vitest CatalogFilters ===
Test Files  1 passed (1)
     Tests  6 passed (6)

=== frontend vitest full ===
Test Files  29 passed (29)
     Tests  188 passed (188)

=== main intact ===
441cc46 feat(seed-demo): MediaAssets PRIMARY APPROVED par produit demo (idempotent) (#13)

=== branches remote (vérif anti-push) ===
OK aucune branche poussée
```

---

## Limitations connues

- **Backend jest full** : 2 suites/25 tests en échec, **toutes pré-existantes**
  sur `main` (commit `39bfbd0` "feat(metrics): L9-5 instrumente l'auth").
  Spécifiquement `src/auth/auth.service.spec.ts`. Aucun fichier `auth/*` ou
  `metrics/*` modifié par ce méga-mandat (`git log main..HEAD --name-only |
  grep -E "auth|metrics"` → vide).
- Pas de filtre OR multi-attributs sur `qualityAttribute` (un seul à la fois).
- Pas de filtre certification dans le catalog (besoin de joindre la table
  `Certification` — futur lot).
- Pas de picker visuel `MarketplaceCategory` (futur lot, demande un endpoint
  `GET /marketplace/categories`).

---

## Plan de push proposé (séquentiel)

Cascade naturelle (chaque branche dépend de la précédente). Pousser et
merger une à la fois, vérifier la CI, puis rebase la suivante sur main.

### 1. fp-5-product-volumes-and-capacities

```bash
git checkout fp-5-product-volumes-and-capacities
git rebase main                             # noop : branche déjà partie de main
git push -u origin fp-5-product-volumes-and-capacities
gh pr create --title "feat(marketplace): FP-5 — volumes & capacités produit" \
  --body "Voir docs/marketplace/MARKETPLACE_PRODUCT_VOLUMES.md"
# attendre CI verte → merge squash → deploy
```

### 2. fp-7-product-quality-attributes

```bash
git checkout fp-7-product-quality-attributes
git rebase --onto main fp-5-product-volumes-and-capacities  # détacher de fp-5
git push -u origin fp-7-product-quality-attributes
gh pr create --title "feat(marketplace): FP-7 — qualité structurée" \
  --body "Voir docs/marketplace/MARKETPLACE_PRODUCT_QUALITY.md (inclut migration additive)"
# attendre CI verte (la migration sera appliquée par le job migrate du backend)
# → merge squash → deploy → vérifier que l'enum apparaît bien en base
```

### 3. mp-filters-1-catalog-public-rich

```bash
git checkout mp-filters-1-catalog-public-rich
git rebase --onto main fp-7-product-quality-attributes
git push -u origin mp-filters-1-catalog-public-rich
gh pr create --title "feat(marketplace): MP-FILTERS-1 — filtres catalog enrichis" \
  --body "Voir docs/marketplace/MARKETPLACE_CATALOG_FILTERS.md"
```

---

## Commandes de vérification finale (depuis la racine `iox/`)

```bash
git log -1 main --oneline                                # doit retourner 441cc46
git branch -r | grep -E "(fp-5-product|fp-7-product|mp-filters-1)" \
  && echo "❌ branche poussée" || echo "✓ aucune branche poussée"
git status                                               # working tree clean sur LOT 3
```
