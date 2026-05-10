# Méga-mandat Claude Code — Run autonome 6h LOCAL-ONLY — FP-5 + FP-7 + MP-FILTERS-1

> **Usage** : à coller dans Claude Code **après** que le mandat 10 (push-cascade des 4 branches) soit terminé et que main contienne MP-EDIT-PRODUCT.1, .2, FP-8, SEED-DEMO-FIX. L'utilisateur va laisser tourner ~6 h. **Aucun push, aucun merge, aucun deploy, aucun gh, aucun touch au VPS.**
> **Pré-requis (à vérifier en premier — STOP si non remplis)** :
>
> - être sur la machine où le repo IOX est cloné, au chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - **`main` local contient les 4 PR mergées** : MP-EDIT-PRODUCT.1, MP-EDIT-PRODUCT.2, FP-8, SEED-DEMO-FIX (vérifiable via `git log --oneline -8 main`)
> - working tree clean (sauf untracked `docs-projet/` et éventuellement quelques handoffs non commités hors scope)
> - **branche courante : `main`**
> - tests de baseline : backend ≥ 470, frontend ≥ 176

Si l'un de ces pré-requis n'est pas rempli (mandat 10 non terminé, main pas à jour), **STOP immédiatement** et écris dans `notes/handoff-megamandat-11-stop.md` ce que tu as constaté. Ne tente rien d'autre.

---

## ⚠️ Garde-fou anti-hallucination — règles obligatoires (utilisateur absent)

L'utilisateur sera absent ~6 h. Toute invention sera **immédiatement détectée** par grep / ls / git log à son retour. Donc :

1. **Toujours vérifier sur disque** (`ls`, `cat`, `git status`) avant de marquer une étape "finie".
2. **Ne jamais inventer un output**, un test passant, ou un fichier créé. Si tu ne peux pas exécuter une commande, rapporte l'erreur brute.
3. **À la fin de CHAQUE lot**, recopier l'output réel des commandes de preuve dans le handoff.
4. **Si tu détectes que tu es en train de t'inventer une exécution**, stoppe le lot, reviens à un état vert, documente le blocage dans le handoff.

Le mandat 9 a démontré que ces règles fonctionnent : les 3 lots ont été livrés proprement avec preuves vérifiables. **Garder cette discipline.**

---

## Contexte canonique IOX (rappel concis)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js (App Router), controlled state.

**Cinq invariants** :

1. `MarketplaceProduct` ≠ `MarketplaceOffer` ≠ `SellerProfile`.
2. **Projection publique filtrée**.
3. Statuts marketplace ≠ statuts MCH internes.
4. `FP-x` ≠ `Lot X` ≠ `MP-x`.
5. Seller = rôle marketplace.

## État avant ce mandat

- `main` local et origin/main alignés, contiennent **11 lots marketplace mergés** : Lot-8, Lot-9, FP-1, FP-2, FP-3, FP-4, FP-2.1, FP-3.1, FP-6, MP-S-INDEX, SEED-DEMO, MP-EDIT-PRODUCT.1, MP-EDIT-PRODUCT.2, FP-8, SEED-DEMO-FIX.
- VPS aligné avec main, base peuplée avec MediaAssets, catalog public à `total: 8`, sellers à `total: 4`.
- Tests baseline : backend ≥ 470 jest, frontend ≥ 176 vitest, tsc strict clean.

## Mandat global

Empiler **3 lots structurants** par-dessus `main`, en branches chaînées strictement locales. Au retour, l'utilisateur arbitre quoi pousser.

```
main  (intact, ne bouge pas)
        │
        ▼
fp-5-product-volumes-and-capacities      ← LOT 1 du mandat 11
        │
        ▼
fp-7-product-quality-attributes          ← LOT 2 (si LOT 1 fini propre)
        │
        ▼
mp-filters-1-catalog-public-rich         ← LOT 3 (si LOT 2 fini propre)
```

## ❌ Règles absolues — interdictions strictes

- **AUCUN `git push`**.
- **AUCUN `gh pr create`**, **AUCUN `gh pr merge`**, **AUCUN `gh ...`**.
- **AUCUN `git fetch origin`** ni `git pull` : main local ne doit pas bouger.
- **AUCUN merge sur main local**. Main reste à son hash actuel.
- **AUCUN `./deploy/vps/deploy.sh`** ni autre script ops.
- **AUCUN `ssh rahiss-vps ...`** ni interaction avec le VPS.
- **AUCUN force-push même local**.
- **AUCUNE migration Prisma destructive** : drop column, drop table, rename non réversible.
- **AUCUNE refacto large opportuniste**.
- **AUCUN bypass de CI**.

## ✅ Règles absolues — obligations

- Conventional commits, atomiques par sous-étape.
- Préserver les workflows seller / admin / public existants.
- Préserver tous les lots déjà livrés (rien ne casse).
- Penser systématiquement seller / admin / public.
- Tests verts à chaque commit (`pnpm lint`, `pnpm typecheck`, `pnpm test` côté frontend ; `pnpm test` côté backend).
- **Vérification disque** avant chaque commit.
- **Migrations strictement additives** uniquement.

## Méthodologie commune à tous les lots

1. Avant de coder un lot : **lecture des fichiers du périmètre** (5-10 min). Mini-plan dans `notes/<branche>-plan.md`. Commit `chore(notes): plan <branche>`.
2. **Boucle courte** : modifier → typecheck → test ciblé → commit atomique.
3. Santé après chaque sous-étape majeure.
4. Si un test pré-existant casse à cause de toi → corrige avant de continuer.

---

## LOT 1 — FP-5 — Volumes et capacités produit

### Branche

```bash
git checkout main
git checkout -b fp-5-product-volumes-and-capacities
```

### Contexte du lot

La fiche produit v2 (cf. `docs-projet/11-fiche-produit-seller-v2.md` section 3) demande des champs structurés sur les volumes et capacités de production qui n'existent pas en schéma :

- `annualProductionCapacity` (decimal) + `capacityUnit` (string)
- `availableQuantity` (decimal, à clarifier vs offer.availableQuantity) — **on positionne au niveau Product comme stock total dispo, distinct de l'offer.availableQuantity qui est par offre commerciale**
- `availableQuantityUnit` (string)
- `restockFrequency` (string ou enum simple : "weekly" / "monthly" / "quarterly" / "seasonal" / "ad_hoc")

Le champ `defaultUnit` actuel reste tel quel (lot de refacto à part — hors scope ici).

### Migration Prisma — strictement additive

Ajouter sur `MarketplaceProduct` (modèle existant) **4 colonnes nullables** :

- `annual_production_capacity` : `Decimal? @db.Decimal(14, 3)` `@map("annual_production_capacity")`
- `capacity_unit` : `String?` `@map("capacity_unit")` (max 20 chars, ex. "kg", "litre", "pièce")
- `available_quantity` : `Decimal? @db.Decimal(14, 3)` `@map("available_quantity")`
- `available_quantity_unit` : `String?` `@map("available_quantity_unit")`
- `restock_frequency` : `String?` `@map("restock_frequency")` (max 30 chars, valeurs libres pour MVP : "weekly", "monthly", "quarterly", "seasonal", "ad_hoc", "on_demand")

Migration name : `add_marketplace_product_volumes_and_capacities`.

```bash
pnpm db:migrate -- --name add_marketplace_product_volumes_and_capacities
```

Vérifier que le SQL généré ne contient que des `ALTER TABLE ... ADD COLUMN`. Aucun `DROP`, aucun `RENAME`.

### Backend

- Étendre `CreateMarketplaceProductDto` + `UpdateMarketplaceProductDto` :
  - `annualProductionCapacity?: number` (`@IsNumber() @Min(0) @Max(1e9)`)
  - `capacityUnit?: string` (`@IsString() @MaxLength(20)`)
  - `availableQuantity?: number` (`@IsNumber() @Min(0) @Max(1e9)`)
  - `availableQuantityUnit?: string` (`@IsString() @MaxLength(20)`)
  - `restockFrequency?: string` (`@IsString() @MaxLength(30)`)
- Étendre la projection publique côté `marketplace-catalog.service.ts → ProductDetail` pour exposer ces 5 champs.
- Étendre `marketplace-products.service.spec.ts` : 2-3 tests (DTO accepte/rejette les bornes, propagation au update, projection publique).

### Frontend

- Sur la page MP-EDIT-PRODUCT.1 (`apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx`), ajouter une **section "Volumes et capacités"** avec les 5 nouveaux champs en édition.
- Étendre `UpdateMarketplaceProductInput` côté frontend (`apps/frontend/src/lib/marketplace-products.ts`) avec les 5 nouveaux champs.
- Étendre la fiche publique `/marketplace/products/[slug]/page.tsx` pour afficher la section "Volumes et capacités" (si ≥ 1 champ rempli).
- Étendre les tests vitest de la page `[id]/page.tsx` : 2-3 tests sur les 5 nouveaux champs (validation, dirty, submit).

### Doc

- `docs/marketplace/MARKETPLACE_PRODUCT_VOLUMES.md` (nouveau).
- `notes/fp-5-plan.md`.

### Périmètre exclu

- Pas de refacto de `defaultUnit` ou `minimumOrderQuantity` (lot séparé, à voir en MP-EDIT-PRODUCT.3).
- Pas de validation cohérence `availableQuantityUnit === capacityUnit` (l'utilisateur peut avoir des stocks dans une unité et une capacité dans une autre — flexibilité métier).
- Pas de seed-fix immédiat des produits demo (à faire dans un futur lot SEED-DEMO-FIX-2 si pertinent — pour l'instant les 8 produits demo n'auront pas ces champs renseignés).

### Preuves obligatoires LOT 1

À recopier textuellement dans `notes/handoff-megamandat-11.md` section LOT 1 :

```bash
# 1. Branche + commits LOT 1
git rev-parse --abbrev-ref HEAD
git log --oneline main..HEAD

# 2. Migration SQL strictement additive
ls prisma/migrations/ | tail -3
cat prisma/migrations/*volumes_and_capacities*/migration.sql
grep -i "DROP\|RENAME" prisma/migrations/*volumes_and_capacities*/migration.sql || echo "no drop/rename ✓"

# 3. Schéma Prisma diff
git diff main..HEAD -- prisma/schema.prisma

# 4. Type frontend étendu — preuve par tsc que les champs interdits restent rejetés
echo 'import type { UpdateMarketplaceProductInput } from "./lib/marketplace-products";
const ok: UpdateMarketplaceProductInput = { annualProductionCapacity: 1000, capacityUnit: "kg" };
const ko: UpdateMarketplaceProductInput = { slug: "forbidden" };
console.log(ok, ko);' > apps/frontend/src/__probe_fp5__.ts
cd apps/frontend && timeout 30 ./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -E "__probe_fp5__|TS2353" | head -5
cd ../..
rm apps/frontend/src/__probe_fp5__.ts || echo "(probe persistante — ignorer)"

# 5. Santé globale
cd apps/backend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
cd apps/frontend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
cd apps/backend && timeout 60 ./node_modules/.bin/jest --silent 2>&1 | grep -E "Tests:|Test Suites:" ; cd ../..
cd apps/frontend && timeout 90 ./node_modules/.bin/vitest run --reporter=basic 2>&1 | tail -8 ; cd ../..
```

---

## LOT 2 — FP-7 — Qualité structurée (qualityAttributes)

### Pré-conditions pour démarrer

- LOT 1 (FP-5) doit être terminé, vert, commité.
- Si LOT 1 a été abandonné, **ne pas démarrer LOT 2**, passer à la phase de fin de mandat.

### Branche

```bash
git checkout fp-5-product-volumes-and-capacities
git checkout -b fp-7-product-quality-attributes
```

### Contexte du lot

La fiche produit v2 (cf. `docs-projet/11-fiche-produit-seller-v2.md` section 6) demande une **qualité structurée** : un ensemble d'attributs qualité qui caractérisent le produit (au-delà du texte libre `technicalSpecifications`). Exemples : "Non-OGM", "Bio", "Fait main", "Tradition", "Récolte manuelle", "Sans gluten".

Choix de modélisation pour MVP : **enum fermé** `ProductQualityAttribute` (pas de table polymorphe — simplicité MVP, possibilité d'évoluer vers une table dédiée plus tard si le métier le demande).

### Migration Prisma — strictement additive

Ajouter sur `MarketplaceProduct` :

- `quality_attributes` : `ProductQualityAttribute[] @default([])` `@map("quality_attributes")`

Avec un nouvel enum :

```prisma
enum ProductQualityAttribute {
  NON_GMO
  ORGANIC                  // bio
  HANDMADE                 // fait main
  TRADITIONAL              // tradition
  HAND_HARVESTED           // récolte manuelle
  GLUTEN_FREE
  LACTOSE_FREE
  VEGAN
  VEGETARIAN
  KOSHER
  HALAL
  WILD_HARVESTED           // sauvage / cueillette
  SMALL_BATCH              // petite série
  COLD_PRESSED             // pressé à froid
  RAW                      // cru / non transformé
  FAIR_TRADE               // équitable (note : peut overlap avec certif FAIRTRADE — c'est OK, attribut produit ≠ certification structurée)
  ARTISANAL                // artisanal
  OTHER                    // valeur d'échappement, à éviter mais utile pour migration future
}
```

Migration name : `add_marketplace_product_quality_attributes`.

```bash
pnpm db:migrate -- --name add_marketplace_product_quality_attributes
```

Vérifier que le SQL est strictement additif (`CREATE TYPE` + `ALTER TABLE ADD COLUMN`).

### Backend

- Étendre `CreateMarketplaceProductDto` + `UpdateMarketplaceProductDto` :
  - `qualityAttributes?: ProductQualityAttribute[]` (`@IsArray() @IsEnum(ProductQualityAttribute, { each: true }) @ArrayMaxSize(10)`)
- Étendre la projection publique côté `marketplace-catalog.service.ts` : exposer `qualityAttributes` sur la fiche produit.
- Étendre `marketplace-products.service.spec.ts` : 2-3 tests.

### Frontend

- Sur la page MP-EDIT-PRODUCT.1, ajouter une **section "Qualité structurée"** avec un multi-select pour les attributs (component simple : checkboxes ou tags togglables).
- Étendre `UpdateMarketplaceProductInput` côté frontend.
- Étendre la fiche publique `/marketplace/products/[slug]/page.tsx` pour afficher des badges de qualité (si ≥ 1 attribut).
- Étendre les tests vitest : 2-3 tests sur la sélection des attributs.

### Doc

- `docs/marketplace/MARKETPLACE_PRODUCT_QUALITY.md` (nouveau).
- `notes/fp-7-plan.md`.

### Périmètre exclu

- Pas de structuration de `technicalSpecifications` (texte libre conservé tel quel).
- Pas de filtrage côté catalog public sur ces attributs (sera ajouté dans LOT 3 MP-FILTERS-1 ou un futur lot).
- Pas d'i18n EN des libellés (pour l'instant FR seulement, et le composant peut afficher le slug enum brut comme fallback).

### Preuves obligatoires LOT 2

```bash
# 1. Branche + commits
git rev-parse --abbrev-ref HEAD
git log --oneline fp-5-product-volumes-and-capacities..HEAD

# 2. Migration additive
ls prisma/migrations/ | tail -3
cat prisma/migrations/*quality_attributes*/migration.sql
grep -i "DROP\|RENAME" prisma/migrations/*quality_attributes*/migration.sql || echo "no drop/rename ✓"

# 3. Diff schéma — enum + colonne
git diff fp-5-product-volumes-and-capacities..HEAD -- prisma/schema.prisma | head -50

# 4. Santé globale
cd apps/backend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
cd apps/frontend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
cd apps/backend && timeout 60 ./node_modules/.bin/jest --silent 2>&1 | grep -E "Tests:|Test Suites:" ; cd ../..
cd apps/frontend && timeout 90 ./node_modules/.bin/vitest run --reporter=basic 2>&1 | tail -8 ; cd ../..
```

---

## LOT 3 — MP-FILTERS-1 — Filtres catalog publique enrichis

### Pré-conditions pour démarrer

- LOTS 1 et 2 terminés, verts.
- Si l'un a été abandonné, **ne pas démarrer LOT 3**.

### Branche

```bash
git checkout fp-7-product-quality-attributes
git checkout -b mp-filters-1-catalog-public-rich
```

### Contexte du lot

Le `CatalogQueryDto` backend expose déjà 12 paramètres (cf. `docs-projet/40-clarification-prochain-lot.md` section 1.1). Mais le frontend public actuel (`/marketplace`) n'en utilise que **6** : recherche `q`, `originCountry`, `readiness`, `priceMode`, `moqMax`, `availableOnly`, plus le tri.

**Filtres backend non exposés UI publique** :

- `categoryId` / `categorySlug` (taxonomie)
- `productionMethod` (texte libre)
- `hasPublicDocs` (présence documents publics)
- `originRegion`
- `sellerSlug` (filtrer "produits d'un seller donné")

En plus, ce lot ajoute **3 nouveaux filtres** côté backend pour exploiter les enrichissements récents :

- `qualityAttribute` (FP-7) : filtrer sur un attribut qualité (genre `?qualityAttribute=ORGANIC`)
- `temperatureRequirements` (FP-8) : ex. `?temperatureRequirements=Frozen`
- `seasonalityMonth` (FP-1, déjà en schéma) : filtrer "produits disponibles en juin" via `?seasonalityMonth=JUN` (intersection avec `availabilityMonths`)

### Backend

#### Extension `CatalogQueryDto`

Ajouter dans `apps/backend/src/marketplace-catalog/dto/catalog-query.dto.ts` :

- `qualityAttribute?: ProductQualityAttribute` (`@IsOptional() @IsEnum(ProductQualityAttribute)`)
- `temperatureRequirements?: string` (`@IsOptional() @IsString() @MaxLength(100)`)
- `seasonalityMonth?: SeasonalityMonth` (`@IsOptional() @IsEnum(SeasonalityMonth)`)

#### Extension `marketplace-catalog.service.buildCatalogWhere`

Ajouter les 3 nouveaux filtres :

- `qualityAttribute` → `mpWhere.qualityAttributes = { has: q.qualityAttribute }`
- `temperatureRequirements` → `mpWhere.temperatureRequirements = { contains: q.temperatureRequirements, mode: 'insensitive' }`
- `seasonalityMonth` → `mpWhere.OR = [...existing, { isYearRound: true }, { availabilityMonths: { has: q.seasonalityMonth } }]` (un produit "year-round" matche tous les mois ; sinon intersection avec ses mois de dispo)

Tests backend : 3 tests sur les nouveaux filtres + 1 test combiné (attribute + month + country).

### Frontend

#### Extension `CatalogFilters` (`apps/frontend/src/components/marketplace/CatalogFilters.tsx`)

Ajouter 5 nouveaux contrôles UI (les 3 backend-existants + les 3 nouveaux + le `productionMethod` + `hasPublicDocs` + `originRegion`) :

- **Catégorie** : input texte ou select sur les `MarketplaceCategory` actives — pour MVP, juste un input texte qui sera comparé via `categorySlug` (le seller indique le slug). Si le picker visuel demande un nouvel endpoint, **rester sur le simple input texte** (futur lot pour le picker).
- **Région d'origine** : input texte (`originRegion`).
- **Méthode de production** : input texte (`productionMethod`).
- **Documents publics** : checkbox (`hasPublicDocs=true`).
- **Saisonnalité** : select 12 mois + "Toute l'année" (`seasonalityMonth`).
- **Qualité structurée** : select avec les 18 valeurs d'enum FP-7 (`qualityAttribute`).
- **Température** : input texte (`temperatureRequirements`).

#### URL state

Tous les filtres restent en URL (pattern existant), syncés via `searchParams`.

### Tests vitest

- Étendre `CatalogFilters.test.tsx` : 5-7 tests sur les nouveaux contrôles (rendu, sync URL, reset).
- Étendre la page `/marketplace/page.tsx` test si présent.

### Doc

- `docs/marketplace/MARKETPLACE_CATALOG_FILTERS.md` (nouveau ou compléter `MARKETPLACE.md`).
- `notes/mp-filters-1-plan.md`.

### Périmètre exclu

- Pas de picker visuel `MarketplaceCategory` (futur lot, demande un endpoint backend list).
- Pas de filtre full-text avancé (Postgres `tsvector` ou Meilisearch — MP-SEARCH-1 candidat futur).
- Pas de filtre par certification (peut être ajouté ultérieurement, demande de joindre la table `Certification`).
- Pas de SEO sur les pages filtrées (futur lot).

### Preuves obligatoires LOT 3

```bash
# 1. Branche + commits
git rev-parse --abbrev-ref HEAD
git log --oneline fp-7-product-quality-attributes..HEAD

# 2. Diff DTO + service + filtres frontend
git diff fp-7-product-quality-attributes..HEAD -- \
  apps/backend/src/marketplace-catalog/dto/catalog-query.dto.ts \
  apps/backend/src/marketplace-catalog/marketplace-catalog.service.ts \
  apps/frontend/src/components/marketplace/CatalogFilters.tsx | head -300

# 3. Santé globale
cd apps/backend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
cd apps/frontend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
cd apps/backend && timeout 60 ./node_modules/.bin/jest --silent 2>&1 | grep -E "Tests:|Test Suites:" ; cd ../..
cd apps/frontend && timeout 90 ./node_modules/.bin/vitest run --reporter=basic 2>&1 | tail -8 ; cd ../..
```

---

## Critères d'arrêt (s'arrêter dès que l'une de ces conditions est remplie)

- Les 3 lots sont terminés et verts.
- Tu détectes un **blocage majeur** qui demande arbitrage humain.
- Tu as fait **2 blocages majeurs consécutifs** sur 2 lots différents.
- Le temps total écoulé approche **6 heures**.
- Un lot casse la santé locale et ne peut pas être réparé en < 30 min.

## Gestion des blocages

- **Blocage mineur** (libellé ambigu, choix UX secondaire, nom de champ) : décision la plus conservatrice + commit + continuer.
- **Blocage majeur** (modèle incompatible, dépendance manquante non triviale, conflit d'architecture) : revert si nécessaire pour revenir à un état vert sur la branche, documenter dans handoff, **passer au lot suivant** ou stopper.
- **Ne jamais rester bloqué silencieusement** plus de 30 minutes sur la même piste.
- **Si une migration ne s'applique pas localement** (Prisma error, DB pas dispo) : skipper la partie migration et ne livrer que le DTO + frontend, en notant explicitement dans le handoff. **Ne pas inventer un succès.**

## État de sortie attendu (avant de rendre la main)

1. Être sur **la dernière branche active**, à un commit vert.
2. **`main` local doit être strictement intact** (même hash qu'au début du mandat).
3. **Aucun commit sur main**. Aucun push. Aucune action sur origin. Aucune action VPS.
4. Working tree clean sur la dernière branche active.
5. **Un seul handoff final** dans `notes/handoff-megamandat-11.md` qui contient :
   - **TL;DR** : 3 lots livrés / 2 / 1 / 0 — état honnête.
   - **Pour chaque lot** : branche, nombre de commits, état (vert/partiel/abandonné), fichiers créés/modifiés, **les outputs bruts de preuves**.
   - **Décisions techniques** notables.
   - **Blocages rencontrés** (si applicable) et pistes d'arbitrage humain.
   - **Plan de push proposé** branche par branche, avec rebase `--onto main`.
   - **Smoke tests post-merge** par lot.
   - **Limitations connues**.

## Commande de vérification finale

```bash
# Confirmer que main n'a PAS bougé
git log -1 main --oneline   # même hash qu'au début

# Confirmer qu'aucune branche du méga-mandat 11 n'est sur origin
git branch -r | grep -E "(fp-5-product|fp-7-product|mp-filters-1)" && echo "❌ branche poussée détectée — INCIDENT" || echo "✓ aucune branche poussée"

# Confirmer working tree clean
git status

# Confirmer santé globale dernière branche
pnpm --filter @iox/backend exec tsc --noEmit
pnpm --filter @iox/frontend exec tsc --noEmit
```

Si le grep retourne quelque chose, **incident grave** : tu as poussé en violant les règles. Documenter, **ne pas tenter de revert sur le remote** (l'utilisateur arbitrera).

## Format du handoff (modèle obligatoire)

```markdown
# Handoff méga-mandat 11 — 2026-04-27

## TL;DR

- LOT 1 (FP-5) : ✅ livré / ⚠ partiel / ❌ abandonné
- LOT 2 (FP-7) : ...
- LOT 3 (MP-FILTERS-1) : ...
- main intact à `<hash>` : ✓
- aucun push / merge / deploy : ✓

## LOT 1 — FP-5 (Volumes et capacités)

### État

- Branche : `fp-5-product-volumes-and-capacities`
- Commits : N
- Fichiers créés : ...
- Fichiers modifiés : ...

### Preuves brutes (anti-hallucination)

[recopier les outputs du bloc "Preuves obligatoires LOT 1"]

### Décisions

...

### Smoke tests proposés post-merge

- [ ] Édition seller : section Volumes apparaît avec 5 champs
- [ ] Fiche publique : section Volumes affichée si rempli
- [ ] Validation backend : annualProductionCapacity > 1e9 → 400

## LOT 2 — FP-7 (Qualité structurée)

[idem]

## LOT 3 — MP-FILTERS-1 (Filtres catalog enrichis)

[idem]

## Plan de push proposé (séquentiel)

1. `git push -u origin fp-5-product-volumes-and-capacities` + PR + CI + merge + deploy
2. `git rebase --onto main fp-5-product-volumes-and-capacities fp-7-product-quality-attributes` puis push + PR + merge + deploy
3. `git rebase --onto main fp-7-product-quality-attributes mp-filters-1-catalog-public-rich` puis push + PR + merge + deploy

## Blocages / limitations connues

...
```

## Rappel final

- **L'utilisateur laisse tourner.** Aucune confirmation possible. Décisions conservatrices.
- **Petits lots verts > gros lot rouge.**
- **En cas de doute, livre moins mais propre.**
- **Aucune action sur origin, aucune action VPS.** Main intact.
- **Vérifie sur disque** avant chaque commit. Recopie les outputs réels.
- **Si tu ne peux pas exécuter une commande**, rapporte le brut. Pas d'invention.

Le mandat 9 a réussi avec ces règles. Garde le même standard de qualité.
