# Méga-mandat Claude Code — Run autonome 6h LOCAL-ONLY post MP-EDIT-PRODUCT.1

> **Usage** : à coller dans Claude Code **après** que le mandat 08 (MP-EDIT-PRODUCT.1) soit terminé localement et vert. L'utilisateur va dormir ~6 h pendant ce mandat. **Aucun push, aucun merge, aucun deploy, aucun gh, aucun touch au VPS.**
> **Pré-requis (à vérifier en premier — STOP si non remplis)** :
>
> - être sur la machine où le repo IOX est cloné, au chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - **branche locale `mp-edit-product-1-seller-edit-safe-fields` existe et est verte**
> - working tree clean
> - main local est à `9f9fddd` (intact, ne doit pas bouger pendant ce mandat)
> - tests à l'entrée : backend 464/464, frontend ≥ 157

Si l'un de ces pré-requis n'est pas rempli (par exemple MP-EDIT-PRODUCT.1 a halluciné, ou la branche n'existe pas, ou main a bougé), **STOP immédiatement** et écris dans `notes/handoff-megamandat-9-stop.md` ce que tu as constaté. Ne tente rien d'autre.

---

## ⚠️ Garde-fou anti-hallucination — règles obligatoires (l'utilisateur dort)

L'utilisateur sera absent ~6 h. Il découvrira ton travail à son retour. Toute invention sera **immédiatement détectée** par grep / ls / git log à son réveil — l'incident SEED-DEMO de 22:30 a montré que c'est inutile et coûteux. Donc :

1. **Toujours vérifier sur disque** (`ls`, `cat`, `git status`) avant de marquer une étape "finie".
2. **Ne jamais inventer un output**, un test passant, ou un fichier créé. Si tu ne peux pas exécuter une commande, rapporte l'erreur brute.
3. **À la fin de CHAQUE lot**, recopier l'output réel de 6 commandes de preuve dans le handoff. Sans ces preuves, le lot est considéré comme non livré.
4. **Si tu détectes que tu es en train de t'inventer une exécution**, stoppe le lot, reviens à un état vert, documente le blocage dans le handoff, passe au suivant ou arrête.

---

## Contexte canonique IOX (rappel concis)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js (App Router), controlled state (pas de react-hook-form).

**Cinq invariants** :

1. `MarketplaceProduct` ≠ `MarketplaceOffer` ≠ `SellerProfile`.
2. **Projection publique filtrée**.
3. Statuts marketplace ≠ statuts MCH internes.
4. `FP-x` ≠ `Lot X` ≠ `MP-x`.
5. Seller = rôle marketplace.

## État avant ce mandat

- `main` local = `9f9fddd` (origin/main aligné). Lots livrés et déployés : Lot-8, Lot-9, FP-1, FP-2, FP-3, FP-4, FP-2.1, FP-3.1, FP-6, MP-S-INDEX, SEED-DEMO.
- Branche locale `mp-edit-product-1-seller-edit-safe-fields` (lot 08, MP-EDIT-PRODUCT.1) : **livrée localement, verte, NON poussée**, branche courante.
- VPS `iox.mycloud.yt` aligné sur `9f9fddd`. Base peuplée : 4 sellers démo, 8 produits, 8 offres, 6 certifs, 1 compte smoke-seller. Catalog public reste à `total: 0` faute de `MediaAsset PRIMARY` (gate volontaire).

## Mandat global

Empiler **3 lots** par-dessus `mp-edit-product-1-seller-edit-safe-fields`, en branches chaînées strictement locales. Au retour, l'utilisateur arbitre quoi pousser, dans quel ordre.

```
mp-edit-product-1-seller-edit-safe-fields  (existante, livrée par mandat 08)
        │
        ▼
mp-edit-product-2-seller-create-and-workflow   ← LOT 1 du mandat 09
        │
        ▼
fp-8-product-logistics-structured              ← LOT 2 (si LOT 1 fini propre)
        │
        ▼
seed-demo-fix-media-assets                     ← LOT 3 (si LOT 2 fini propre)
```

## ❌ Règles absolues — interdictions strictes

- **AUCUN `git push`**.
- **AUCUN `gh pr create`**, **AUCUN `gh pr merge`**, **AUCUN `gh ...`**.
- **AUCUN `git fetch origin`** ni `git pull` : on travaille hors-ligne, main local fixé à `9f9fddd`.
- **AUCUN merge sur main local**. Main reste à `9f9fddd` à la fin du mandat.
- **AUCUN `./deploy/vps/deploy.sh`** ni autre script ops.
- **AUCUN `ssh rahiss-vps ...`** ni interaction avec le VPS.
- **AUCUN force-push même local**.
- **AUCUNE migration Prisma destructive** : drop column, drop table, rename non réversible. Migrations additives uniquement.
- **AUCUNE refacto large opportuniste**.
- **AUCUN bypass de CI** (`--no-verify`, `--force`, etc.).

## ✅ Règles absolues — obligations

- Conventional commits, atomiques par sous-étape (`feat(...)`, `docs(...)`, `test(...)`, `chore(notes): ...`).
- Préserver les workflows seller / admin / public existants.
- Préserver tous les lots déjà livrés (FP-x, MP-S-INDEX, SEED-DEMO, MP-EDIT-PRODUCT.1).
- Penser systématiquement seller / admin / public.
- Tests verts à chaque commit (`pnpm lint`, `pnpm typecheck`, `pnpm test` côté frontend ; `pnpm test` côté backend).
- **Vérification disque** avant chaque commit (preuves anti-hallucination).

## Méthodologie commune à tous les lots

1. Avant de coder un lot : **lecture des fichiers du périmètre** (5-10 min). Mini-plan dans `notes/<branche>-plan.md`. Commit `chore(notes): plan <branche>`.
2. **Boucle courte** : modifier → typecheck → test ciblé → commit atomique.
3. Santé après chaque sous-étape majeure :
   ```bash
   pnpm install --frozen-lockfile
   pnpm --filter @iox/backend  exec tsc --noEmit
   pnpm --filter @iox/backend  test
   pnpm --filter @iox/frontend exec tsc --noEmit
   pnpm --filter @iox/frontend exec next lint
   pnpm --filter @iox/frontend exec vitest run --reporter=basic
   ```
4. Si un test pré-existant casse à cause de toi → corrige avant de continuer.

---

## LOT 1 — MP-EDIT-PRODUCT.2 (Création produit seller + workflow)

### Branche

```bash
git checkout mp-edit-product-1-seller-edit-safe-fields
git checkout -b mp-edit-product-2-seller-create-and-workflow
```

### Contexte du lot

Backend déjà câblé (vérifié) :

- `POST /marketplace/products` ouvert à `MARKETPLACE_SELLER` (création brouillon).
- `POST /marketplace/products/:id/submit` ouvert à `SELLER_EDIT` (soumission à review).
- `POST /marketplace/products/:id/archive` ouvert à `SELLER_EDIT`.
- `POST /marketplace/products/:id/approve|reject|publish|suspend` réservé `MODERATION` (staff) — hors scope.

Frontend actuel : aucune page de création seller, aucun bouton de soumission/archivage côté UI.

### Périmètre

#### Page de création — `/seller/marketplace-products/new/page.tsx`

- Formulaire minimaliste pour créer un brouillon : `commercialName` (required), `slug` (généré côté client par défaut depuis `commercialName`, éditable, unique), `originCountry` (required), `productId` (à choisir parmi les `Product` MCH existants accessibles au seller — utiliser un endpoint backend list ou un picker simple).
- Au submit : `POST /marketplace/products` avec status par défaut `DRAFT` (côté backend).
- Redirection vers `/seller/marketplace-products/[id]` (la page MP-EDIT-PRODUCT.1) après création réussie.
- Hints clairs sur conflit de slug ou ownership.

**Note** : si récupérer la liste des `Product` MCH du seller demande un nouvel endpoint backend, **ne pas l'ajouter** dans ce mandat. Demander à l'utilisateur de coller un `productId` UUID manuellement comme première itération, et noter ce gap dans le handoff (futur lot pour un picker visuel).

#### Workflow soumission/archivage sur `/seller/marketplace-products/[id]/page.tsx`

- Ajouter sur la page de MP-EDIT-PRODUCT.1 (livrée juste avant) deux actions :
  - **"Soumettre à validation"** : visible si `publicationStatus === DRAFT` ou `REJECTED`. Appelle `POST /:id/submit`. Confirme avec un dialog (réutiliser le composant existant Lot-9).
  - **"Archiver"** : visible si `publicationStatus !== ARCHIVED`. Appelle `POST /:id/archive`. Confirmation destructive (le produit disparaît du seller dashboard).
- Refresh des données après chaque action, mise à jour du badge de statut.
- Pas d'action `approve / reject / publish / suspend` côté seller (réservé staff).

#### Helper API

Étendre `apps/frontend/src/lib/marketplace-products.ts` avec :

- `create(payload, token)` → POST `/marketplace/products`
- `submit(id, token)` → POST `/marketplace/products/:id/submit`
- `archive(id, token)` → POST `/marketplace/products/:id/archive`

Types stricts comme dans MP-EDIT-PRODUCT.1.

#### Liens d'accès

- Bouton "Nouveau produit" sur `/seller/marketplace-products/page.tsx` (index FP-4).
- Pas d'autre changement à l'index.

### Tests

- `apps/frontend/src/app/(dashboard)/seller/marketplace-products/new/page.test.tsx` : 3-5 tests vitest (formulaire, validation slug, submit OK, hint conflit).
- Étendre les tests de la page MP-EDIT-PRODUCT.1 : 2-3 tests sur les actions submit/archive (confirmation + appel API).
- Cible **+5 à +8 vitest**.

### Doc

- `docs/marketplace/MARKETPLACE_PRODUCT_EDIT.md` : compléter avec section "Création + workflow soumission/archivage".
- `notes/mp-edit-product-2-plan.md` : mini-plan.

### Périmètre exclu

- Pas de picker visuel de `Product` MCH (fallback : UUID manuel).
- Pas de gestion `mainMediaId` ni `categoryId`.
- Pas d'actions staff (approve, reject, publish, suspend, readiness).
- Pas de page liste avec filtres avancés (les filtres actuels suffisent).

### Preuves obligatoires LOT 1

À recopier textuellement dans `notes/handoff-megamandat-9.md` section LOT 1 :

```bash
# 1. Branche + commits LOT 1
git rev-parse --abbrev-ref HEAD
git log --oneline mp-edit-product-1-seller-edit-safe-fields..HEAD

# 2. Fichiers créés/modifiés
ls -la \
  "apps/frontend/src/app/(dashboard)/seller/marketplace-products/new/page.tsx" \
  "apps/frontend/src/app/(dashboard)/seller/marketplace-products/new/page.test.tsx" 2>&1

git diff --stat mp-edit-product-1-seller-edit-safe-fields..HEAD

# 3. Santé
cd apps/backend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
cd apps/frontend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
cd apps/frontend && timeout 90 ./node_modules/.bin/vitest run --reporter=basic 2>&1 | tail -8 ; cd ../..
cd apps/backend && timeout 60 ./node_modules/.bin/jest --silent --reporters=default 2>&1 | grep -E "Tests:|Test Suites:" ; cd ../..
```

---

## LOT 2 — FP-8 — Logistique structurée

### Pré-conditions pour démarrer

- LOT 1 (MP-EDIT-PRODUCT.2) doit être terminé, vert, commité.
- Si LOT 1 a été abandonné, **ne pas démarrer LOT 2**, passer à la phase de fin de mandat.

### Branche

```bash
git checkout mp-edit-product-2-seller-create-and-workflow
git checkout -b fp-8-product-logistics-structured
```

### Contexte du lot

La fiche produit v2 (cf. `docs-projet/11-fiche-produit-seller-v2.md` section 7) demande des champs logistiques structurés qui n'existent pas en schéma :

- `packagingFormats[]` : déclinaisons de conditionnement (ex. "carton 12x500g", "palette 500kg")
- `temperatureRequirements` : chaîne du froid (texte ou enum simple)
- `grossWeight` (kg, decimal)
- `netWeight` (kg, decimal)
- `palletization` : descriptif palettisation (texte)

### Migration Prisma — strictement additive

Ajouter sur `MarketplaceProduct` (modèle existant) **5 colonnes nullables** :

- `packaging_formats` : `String[]` (Postgres native array de strings) `@default([])`
- `temperature_requirements` : `String?` `@map("temperature_requirements")`
- `gross_weight_kg` : `Decimal? @db.Decimal(10, 3)` `@map("gross_weight_kg")`
- `net_weight_kg` : `Decimal? @db.Decimal(10, 3)` `@map("net_weight_kg")`
- `palletization` : `String?`

Migration name : `add_marketplace_product_logistics`.

```bash
pnpm db:migrate -- --name add_marketplace_product_logistics
```

Vérifier que le SQL généré ne contient que des `ALTER TABLE ... ADD COLUMN`. Aucun `DROP`, aucun `RENAME`.

### Backend

- Étendre `CreateMarketplaceProductDto` + `UpdateMarketplaceProductDto` :
  - `packagingFormats?: string[]` (validation : `@IsArray() @IsString({each:true}) @ArrayMaxSize(20) @MaxLength(80, { each: true })`)
  - `temperatureRequirements?: string` (max 200)
  - `grossWeightKg?: number` (`@IsNumber() @Min(0) @Max(10000)`)
  - `netWeightKg?: number` (idem)
  - `palletization?: string` (max 500)
- Pas d'helper de validation custom — class-validator suffit.
- Étendre la projection publique côté `marketplace-catalog.service.ts → ProductDetail` pour exposer ces 5 champs (logistique = info commerciale légitime publique).
- Étendre `marketplace-products.service.spec.ts` : 2-3 tests (DTO accepte/rejette les bornes, propagation au update).

### Frontend

- Sur la page MP-EDIT-PRODUCT.1 (livrée par lot 08), ajouter une **section "Logistique structurée"** avec les 5 nouveaux champs en édition.
- Sur la fiche publique `/marketplace/products/[slug]/page.tsx`, ajouter une section "Logistique" (affichée si ≥ 1 champ rempli).
- Étendre les tests de la page MP-EDIT-PRODUCT.1 : 2-3 tests vitest (validation array max 20, weight bornes).

### Doc

- `docs/marketplace/MARKETPLACE_PRODUCT_LOGISTICS.md` (nouveau).
- `notes/fp-8-plan.md`.

### Périmètre exclu

- Pas de picker UI complexe pour `packagingFormats` (input texte avec séparateur ou multi-input simple — pas de drag-drop).
- Pas de validation géographique sur la palettisation.
- Pas de réutilisation des champs `MarketplaceOffer` (les offres ont leurs propres champs commerciaux logistiques `incoterm`, `leadTimeDays` — pas de duplication, pas de conflit).

### Preuves obligatoires LOT 2

```bash
# 1. Branche + commits
git rev-parse --abbrev-ref HEAD
git log --oneline mp-edit-product-2-seller-create-and-workflow..HEAD

# 2. Migration SQL strictement additive
ls prisma/migrations/ | tail -3
cat prisma/migrations/*add_marketplace_product_logistics*/migration.sql
grep -i "DROP\|RENAME" prisma/migrations/*add_marketplace_product_logistics*/migration.sql || echo "no drop/rename ✓"

# 3. Schéma Prisma diff
git diff mp-edit-product-2-seller-create-and-workflow..HEAD -- prisma/schema.prisma

# 4. Santé
cd apps/backend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
cd apps/frontend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
cd apps/backend && timeout 60 ./node_modules/.bin/jest --silent 2>&1 | grep -E "Tests:|Test Suites:" ; cd ../..
cd apps/frontend && timeout 90 ./node_modules/.bin/vitest run --reporter=basic 2>&1 | tail -8 ; cd ../..
```

---

## LOT 3 — SEED-DEMO-FIX — MediaAssets pour le catalog

### Pré-conditions pour démarrer

- LOTS 1 et 2 terminés, verts.
- Si l'un a été abandonné, **ne pas démarrer LOT 3**, passer à la phase de fin de mandat.

### Branche

```bash
git checkout fp-8-product-logistics-structured
git checkout -b seed-demo-fix-media-assets
```

### Contexte du lot

Constat actuel : le catalog public (`GET /marketplace/catalog`) retourne `total: 0` malgré 8 produits PUBLISHED en base, parce que la gate `findProductsWithPrimaryMedia` exige un `MediaAsset` `(role: PRIMARY, moderationStatus: APPROVED)` par produit. Le seed actuel n'en crée aucun.

### Périmètre

Étendre **uniquement** le runner SEED-DEMO existant (`apps/backend/src/seed-demo/runner.ts`) et son dataset (`apps/backend/src/seed-demo/dataset.ts`) pour :

1. **Créer 8 `MediaAsset` PRIMARY APPROVED**, un par MarketplaceProduct, avec :
   - `relatedType: MARKETPLACE_PRODUCT`
   - `relatedId: <id du marketplaceProduct correspondant>`
   - `role: PRIMARY`
   - `mediaType: IMAGE`
   - `moderationStatus: APPROVED`
   - `storageKey: 'demo/<slug>-primary.jpg'` (placeholder, pas besoin de vrai fichier)
   - `mimeType: 'image/jpeg'`
   - `sizeBytes: 12345` (placeholder)
   - `altTextFr: <commercialName>` / `altTextEn: <commercialName>`
   - `sortOrder: 0`

2. **Idempotence** : utiliser un `findFirst` sur `(relatedType, relatedId, role)` puis `update` ou `create` (pattern miroir de l'offer dans le runner actuel). Ou un `upsert` si une contrainte unique existe — **vérifier le schéma Prisma**.

3. **Pas de modification** des entités existantes du seed (sellers, products, offers, certifications, smoke-seller).

### Bonus optionnel (si temps suffisant)

Créer aussi 4 `MediaAsset` LOGO + 4 BANNER pour les SellerProfiles (cosmétique : remplace les initiales "CM/PI/DB/PT" par de vrais logos sur la page publique). Même pattern d'idempotence.

### Backend tests

Ajouter 1-2 tests Jest dans `seed-demo.spec.ts` :

- `IOX_DEMO_SEED=1` produit ≥ 8 `MediaAsset PRIMARY APPROVED` (vérifier le compteur dans le summary de retour).
- Idempotence : 2e run → 0 nouveau `MediaAsset` créé.

### Doc

- Compléter `docs/marketplace/SEED_DEMO.md` : nouvelle section "Médias placeholders" + note "ne pas confondre avec un upload réel".
- `notes/seed-demo-fix-plan.md`.

### Périmètre exclu

- Pas de génération d'images réelles (aucun téléchargement Unsplash, etc.). Placeholder text-only.
- Pas de modification du composant `InlineMediaUploader` ni du backend `media-assets`.
- Pas de gallery / packaging assets — juste PRIMARY (et optionnellement LOGO/BANNER seller).

### Preuves obligatoires LOT 3

```bash
# 1. Branche + commits
git rev-parse --abbrev-ref HEAD
git log --oneline fp-8-product-logistics-structured..HEAD

# 2. Diff runner + dataset + spec
git diff fp-8-product-logistics-structured..HEAD -- \
  apps/backend/src/seed-demo/runner.ts \
  apps/backend/src/seed-demo/dataset.ts \
  apps/backend/src/seed-demo/seed-demo.spec.ts | head -200

# 3. Tests jest
cd apps/backend && timeout 60 ./node_modules/.bin/jest src/seed-demo --silent 2>&1 | tail -10 ; cd ../..

# 4. Santé globale
cd apps/backend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
cd apps/frontend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
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
- **Si la migration FP-8 ne s'applique pas localement** (Prisma error, DB pas dispo) : skipper la partie migration et ne livrer que le DTO + frontend, en notant explicitement dans le handoff que la migration n'a pas pu être validée. **Ne pas inventer un succès.**

## État de sortie attendu (avant de rendre la main)

1. Être sur **la dernière branche active** (cf. critères d'arrêt), à un commit vert.
2. **`main` local doit être strictement à `9f9fddd`**. Vérifier : `git log -1 main --oneline` doit donner `9f9fddd`.
3. **Aucun commit sur main**. Aucun push. Aucune action sur origin. Aucune action VPS.
4. Working tree clean sur la dernière branche active.
5. **Un seul handoff final** dans `notes/handoff-megamandat-9.md` qui contient :
   - **TL;DR** : 3 lots livrés / 2 / 1 / 0 — état honnête.
   - **Pour chaque lot** : branche, nombre de commits, état (vert/partiel/abandonné), liste des fichiers créés/modifiés, **les 4 (ou 6) outputs bruts de preuves**.
   - **Décisions techniques** notables et justifications.
   - **Blocages rencontrés** (si applicable) et pistes pour l'arbitrage humain.
   - **Plan de push proposé** à l'utilisateur, branche par branche, avec `git rebase --onto main` pour aligner après merge des branches précédentes (pattern du mandat 04).
   - **Smoke tests post-merge** suggérés pour chaque lot.
   - **Limitations connues** (ex. : LOT 3 n'a pas de vrais fichiers image, juste des MediaAsset placeholder).

## Commande de vérification finale (à lancer juste avant de t'arrêter)

```bash
# Confirmer que main n'a PAS bougé
git log -1 main --oneline   # doit afficher 9f9fddd

# Confirmer qu'aucun push n'a eu lieu (aucune branche fp-8-* / mp-edit-product-2-* / seed-demo-fix-* sur origin)
git branch -r | grep -E "(fp-8|mp-edit-product-2|seed-demo-fix)" && echo "❌ branche poussée détectée — INCIDENT" || echo "✓ aucune branche poussée"

# Confirmer working tree clean
git status

# Confirmer santé globale dernière branche
pnpm --filter @iox/backend exec tsc --noEmit
pnpm --filter @iox/frontend exec tsc --noEmit
```

Si la commande `git branch -r | grep ...` retourne quelque chose, c'est un **incident grave** : tu as poussé en violant les règles. Documenter dans le handoff, **ne pas tenter de revert sur le remote** (l'utilisateur arbitrera).

## Format du handoff (modèle obligatoire)

```markdown
# Handoff méga-mandat 6h — 2026-04-27

## TL;DR

- LOT 1 (MP-EDIT-PRODUCT.2) : ✅ livré / ⚠ partiel / ❌ abandonné
- LOT 2 (FP-8) : ...
- LOT 3 (SEED-DEMO-FIX) : ...
- main intact à `9f9fddd` : ✓
- aucun push / merge / deploy : ✓

## LOT 1 — MP-EDIT-PRODUCT.2

### État

- Branche : `mp-edit-product-2-seller-create-and-workflow`
- Commits : N
- Fichiers créés : ...
- Fichiers modifiés : ...

### Preuves brutes (anti-hallucination)

[recopier les 4 outputs du bloc "Preuves obligatoires LOT 1"]

### Décisions

...

### Smoke tests proposés post-merge

...

## LOT 2 — FP-8

[idem]

## LOT 3 — SEED-DEMO-FIX

[idem]

## Plan de push proposé (séquentiel)

1. Pousser et merger `mp-edit-product-1-seller-edit-safe-fields` (mandat 08, déjà livré)
2. `git rebase --onto main mp-edit-product-1-seller-edit-safe-fields mp-edit-product-2-seller-create-and-workflow`
   puis push + PR + merge
3. `git rebase --onto main mp-edit-product-2-... fp-8-...` puis push + PR + merge
4. `git rebase --onto main fp-8-... seed-demo-fix-...` puis push + PR + merge
5. Pour chaque PR mergée → `./deploy/vps/deploy.sh all`
6. Pour LOT 3 → `IOX_DEMO_SEED=1` sur le VPS pour activer les nouveaux MediaAssets

## Blocages / limitations connues

...
```

## Rappel final

- **L'utilisateur dort.** Aucune confirmation possible. Aucune question rhétorique. Décisions conservatrices.
- **Petits lots verts > gros lot rouge.**
- **En cas de doute, livre moins mais propre.**
- **Aucune action sur origin, aucune action VPS.** Main intact à `9f9fddd`.
- **Vérifie sur disque** avant chaque commit. Recopie les outputs réels dans le handoff.
- **Si tu ne peux pas exécuter une commande**, rapporte le brut. Pas d'invention.
