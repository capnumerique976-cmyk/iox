# Méga-mandat Claude Code — Run autonome 8h LOCAL-ONLY — MP-OFFER-VIEW + MP-OFFER-EDIT-1 + MP-EDIT-PRODUCT.3-light

> **Usage** : à coller dans Claude Code juste avant que l'utilisateur sorte ~8 h. **Aucun push, aucun merge, aucun deploy, aucun gh, aucun ssh, aucun touch au VPS.**
> **Pré-requis (à vérifier en premier — STOP si non remplis)** :
>
> - être sur la machine où le repo IOX est cloné, au chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - working tree clean (sauf untracked `docs-projet/`, `notes/handoff-*`, `.claude/settings.json` modifié — tous hors scope)
> - `main` local à `0c2a385` (post-mandat 12) ou plus récent — vérifier que MP-FILTERS-1 (#16) est bien dans `git log -1 main`
> - **branche locale `seed-demo-fix-2-quality-and-logistics` doit exister** (livrée par mandat 13, en attente de push à mon retour) — **on n'y touche pas pendant ce mandat**

Si l'un de ces pré-requis n'est pas rempli, **STOP** et écris dans `notes/handoff-megamandat-14-stop.md` ce que tu as constaté.

---

## ⚠️ Garde-fou anti-hallucination — règles obligatoires (utilisateur absent ~8h)

L'utilisateur sera **absent ~8 heures**. Toute invention sera détectée à son retour par grep / ls / git log. Donc :

1. **Toujours vérifier sur disque** (`ls`, `cat`, `git status`) avant de marquer une étape "finie".
2. **Ne jamais inventer un output**, un test passant, ou un fichier créé. Si tu ne peux pas exécuter une commande, rapporte l'erreur brute.
3. **À la fin de CHAQUE lot**, recopier l'output réel des commandes de preuve dans le handoff.
4. **Si tu détectes que tu es en train de t'inventer une exécution**, stoppe le lot, reviens à un état vert, documente le blocage dans le handoff, passe au suivant.

Les mandats 9, 11 et 13 ont démontré que ces règles fonctionnent. **Garder cette discipline.**

---

## Contexte canonique IOX (rappel concis)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js (App Router), controlled state.

**Cinq invariants** :

1. `MarketplaceProduct` ≠ `MarketplaceOffer` ≠ `SellerProfile`. **Product = ce que c'est, Offer = comment c'est vendu maintenant.**
2. Projection publique filtrée.
3. Statuts marketplace ≠ statuts MCH internes.
4. `FP-x` ≠ `Lot X` ≠ `MP-x`.
5. Seller = rôle marketplace.

## État avant ce mandat

- `main` à `0c2a385` (16 lots marketplace mergés). Schema enrichi avec FP-1, FP-6, FP-8, FP-5, FP-7. Filtres MP-FILTERS-1 actifs.
- VPS aligné, base peuplée. Catalog `total: 8`, sellers `total: 4`.
- Backend `marketplace-offers` **entièrement câblé pour seller** (vérifié) :
  - `GET /` (liste, scope auto seller via ownership) ✓
  - `GET /:id` ✓
  - `POST /` (création brouillon) ✓
  - `PATCH /:id` (édition) ✓
  - `POST /:id/submit` (soumission review) ✓
  - `POST /:id/batches`, `PATCH /batches/:linkId`, `DELETE /batches/:linkId` (rattachement lots produits) ✓
- Frontend seller **ne dispose d'AUCUNE page offre** aujourd'hui. C'est le gap principal après MP-EDIT-PRODUCT.1+2.
- `mainMediaId` du `MarketplaceProduct` non éditable côté seller — l'`InlineMediaUploader` (FP-3.1) existe mais n'est branché que sur logo+bannière `SellerProfile`.

## Mandat global

Empiler **3 lots** par-dessus `main`, en branches chaînées strictement locales. Au retour, l'utilisateur arbitre quoi pousser.

```
main  (intact, ne bouge pas)
        │
        ▼
mp-offer-view-1-seller-detail            ← LOT 1 du mandat 14
        │
        ▼
mp-offer-edit-1-create-and-update        ← LOT 2 (si LOT 1 fini propre)
        │
        ▼
mp-edit-product-3-light-main-media       ← LOT 3 (si LOT 2 fini propre)
```

## ❌ Règles absolues — interdictions strictes

- **AUCUN `git push`**.
- **AUCUN `gh ...`** (pr create, pr merge, pr checks, etc.).
- **AUCUN `git fetch origin`** ni `git pull` : main local ne doit pas bouger.
- **AUCUN merge sur main local**. Main reste à `0c2a385`.
- **AUCUN `./deploy/vps/deploy.sh`** ni autre script ops.
- **AUCUN `ssh rahiss-vps ...`** ni interaction avec le VPS.
- **AUCUN force-push même local**.
- **AUCUNE migration Prisma** (les 3 lots sont 100% frontend ou utilisent les colonnes existantes).
- **AUCUNE refacto large opportuniste**.
- **AUCUN bypass de CI**.
- **NE PAS TOUCHER à la branche `seed-demo-fix-2-quality-and-logistics`** (mandat 13, en attente de push humain).

## ✅ Règles absolues — obligations

- Conventional commits, atomiques par sous-étape (`chore(notes):`, `feat(frontend):`, `feat(backend):`, `test(...):`, `docs(...):`).
- Préserver les workflows seller / admin / public existants.
- Préserver tous les lots déjà livrés (rien ne casse).
- Penser systématiquement seller / admin / public.
- Tests verts à chaque commit.
- **Vérification disque** avant chaque commit.

## Méthodologie commune à tous les lots

1. Avant de coder un lot : **lecture des fichiers du périmètre** (5-10 min). Mini-plan dans `notes/<branche>-plan.md`. Commit `chore(notes): plan <branche>`.
2. **Boucle courte** : modifier → typecheck → test ciblé → commit atomique.
3. Santé après chaque sous-étape majeure.
4. Si un test pré-existant casse à cause de toi → corrige avant de continuer.
5. **Les 2 suites jest auth pré-existantes en échec depuis `39bfbd0`** : ignorer (hors scope).

---

## LOT 1 — MP-OFFER-VIEW — Lecture détaillée d'une offre côté seller

### Branche

```bash
git checkout main
git checkout -b mp-offer-view-1-seller-detail
```

### Contexte du lot

Aujourd'hui le seller ne peut pas voir ses offres dans l'UI. Backend complètement câblé.

Le seed-demo a créé 8 offres (1 par produit demo). Chaque offre a `marketplaceProductId`, `sellerProfileId`, `priceMode`, `unitPrice` ou non, `currency`, `moq`, `availableQuantity`, `leadTimeDays`, `incoterm`, `destinationMarketsJson`, `visibilityScope`, `exportReadinessStatus`, `publicationStatus`, `featuredRank`, `submittedAt`, `approvedAt`, `publishedAt`.

### Périmètre

#### 1.1 — Helper API frontend `apps/frontend/src/lib/marketplace-offers.ts` (nouveau)

Pattern miroir de `marketplace-products.ts`. Exporter :

- type `MarketplaceOfferDetail` avec les champs **utiles à la lecture seller**.
- `marketplaceOffersApi.listMine(token, params)` → GET `/marketplace/offers?limit=…` (le scope seller est appliqué côté backend automatiquement).
- `marketplaceOffersApi.getById(id, token)` → GET `/marketplace/offers/:id`.

Les types stricts : aucun champ admin/staff (rejectionReason, suspendedAt, featuredRank côté write — en lecture on les expose pour information, mais ils ne seront pas dans le `UpdateMarketplaceOfferInput` du LOT 2).

#### 1.2 — Page `apps/frontend/src/app/(dashboard)/seller/marketplace-offers/page.tsx` (nouvelle, index minimal)

Pattern miroir de `seller/marketplace-products/page.tsx` (FP-4). Liste paginée, badge `publicationStatus`, lien vers détail. Bouton "Nouvelle offre" qui pointe vers `/seller/marketplace-offers/new` (page créée au LOT 2 — pour ce LOT 1, le bouton est désactivé/grayed avec tooltip "à venir").

#### 1.3 — Page `apps/frontend/src/app/(dashboard)/seller/marketplace-offers/[id]/page.tsx` (nouvelle, lecture)

Pattern miroir de `seller/marketplace-products/[id]/page.tsx` (MP-EDIT-PRODUCT.1) **mais uniquement en lecture** dans ce LOT 1. Sections lecture :

- **Identité** : title, shortDescription
- **Lien produit** : `marketplaceProductId` → afficher commercialName + lien vers `/seller/marketplace-products/[productId]`
- **Prix** : priceMode, unitPrice, currency, moq, availableQuantity
- **Disponibilité** : availabilityStart, availabilityEnd, leadTimeDays
- **Logistique commerciale** : incoterm, departureLocation, destinationMarketsJson
- **Visibilité** : visibilityScope (PUBLIC/BUYERS_ONLY/PRIVATE)
- **Workflow** : publicationStatus, exportReadinessStatus + dates submittedAt/approvedAt/publishedAt en lecture seule.
- **Banner publicationStatus** identique à MP-EDIT-PRODUCT.1.
- **Liens** : retour vers index, retour vers le produit parent.

**Pas de mode édition dans ce LOT 1.** Mode édition arrive au LOT 2.

#### 1.4 — Lien depuis dashboard seller

Sur `apps/frontend/src/app/(dashboard)/seller/dashboard/page.tsx`, ajouter un QuickLink "Mes offres" pointant vers `/seller/marketplace-offers` (à côté de "Mes produits marketplace"). Pas de refacto.

#### 1.5 — Tests

`apps/frontend/src/app/(dashboard)/seller/marketplace-offers/page.test.tsx` (index) : 2 tests (rendu liste avec un mock, état vide).

`apps/frontend/src/app/(dashboard)/seller/marketplace-offers/[id]/page.test.tsx` (détail) : 4 tests (hydratation, sections affichées, banner statut, hint 403/404).

Cible : **+6 vitest** (188 → 194).

### Doc

- `docs/marketplace/MARKETPLACE_OFFER_SELLER.md` (nouveau) : contrat lecture côté seller, sections, hors scope (édition LOT 2).
- `notes/mp-offer-view-1-plan.md`.

### Périmètre exclu LOT 1

- Pas de création (LOT 2).
- Pas d'édition (LOT 2).
- Pas de submit/approve/archive (LOT 2 pour submit ; approve/reject réservés staff).
- Pas de gestion `MarketplaceOfferBatch` (rattachement de lots — futur lot dédié).

### Preuves obligatoires LOT 1

```bash
# 1. Branche + commits
git rev-parse --abbrev-ref HEAD
git log --oneline main..HEAD

# 2. Fichiers créés
ls -la \
  "apps/frontend/src/app/(dashboard)/seller/marketplace-offers/page.tsx" \
  "apps/frontend/src/app/(dashboard)/seller/marketplace-offers/[id]/page.tsx" \
  "apps/frontend/src/app/(dashboard)/seller/marketplace-offers/page.test.tsx" \
  "apps/frontend/src/app/(dashboard)/seller/marketplace-offers/[id]/page.test.tsx" \
  "apps/frontend/src/lib/marketplace-offers.ts" \
  "docs/marketplace/MARKETPLACE_OFFER_SELLER.md" 2>&1

# 3. Santé
cd apps/frontend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
cd apps/frontend && timeout 90 ./node_modules/.bin/vitest run --reporter=basic 2>&1 | tail -8 ; cd ../..

# 4. Couverture du nouveau périmètre
cd apps/frontend && timeout 35 ./node_modules/.bin/vitest run "src/app/(dashboard)/seller/marketplace-offers" --reporter=basic 2>&1 | tail -8 ; cd ../..
```

---

## LOT 2 — MP-OFFER-EDIT-1 — Création + édition champs sûrs

### Pré-conditions

- LOT 1 (MP-OFFER-VIEW) terminé, vert, commité.
- Si LOT 1 abandonné, **passer directement à LOT 3** sur main (réviser le checkout).

### Branche

```bash
git checkout mp-offer-view-1-seller-detail
git checkout -b mp-offer-edit-1-create-and-update
```

### Contexte du lot

Permettre au seller de créer un brouillon d'offre + éditer les champs commerciaux sûrs + soumettre à review.

### Périmètre

#### 2.1 — Helper API étendu

Étendre `apps/frontend/src/lib/marketplace-offers.ts` :

- type `UpdateMarketplaceOfferInput` (strict, exclusion explicite des champs interdits — pattern miroir MP-EDIT-PRODUCT.1).
- type `CreateMarketplaceOfferInput` extends `UpdateMarketplaceOfferInput` + champs requis création (`marketplaceProductId`, `title`, `priceMode`).
- `marketplaceOffersApi.create(payload, token)`
- `marketplaceOffersApi.update(id, payload, token)`
- `marketplaceOffersApi.submit(id, token)`

**Champs autorisés à l'édition** (cf. DTO backend, à confirmer en lisant `apps/backend/src/marketplace-offers/dto/marketplace-offer.dto.ts`) :

- `title`, `shortDescription`
- `priceMode` (FIXED, QUOTE_ONLY, FROM_PRICE)
- `unitPrice`, `currency`, `moq`, `availableQuantity`
- `availabilityStart`, `availabilityEnd`, `leadTimeDays`
- `incoterm`, `departureLocation`, `destinationMarketsJson`

**Champs interdits** (à NE PAS inclure dans `UpdateMarketplaceOfferInput`) :

- `marketplaceProductId` (immuable post-création)
- `sellerProfileId` (immuable)
- `visibilityScope` (workflow staff, optionnel pour seller — à voir si on l'autorise ; **prudence : exclure dans ce lot**, futur lot pour autoriser PRIVATE/BUYERS_ONLY/PUBLIC côté seller si pertinent)
- `exportReadinessStatus` (staff)
- `publicationStatus` (workflow)
- `featuredRank` (admin)
- `rejectionReason` (staff)
- `submittedAt`, `approvedAt`, `publishedAt`, `suspendedAt` (workflow, server-managed)

#### 2.2 — Page création `apps/frontend/src/app/(dashboard)/seller/marketplace-offers/new/page.tsx` (nouvelle)

Formulaire minimal :

- `marketplaceProductId` : select sur les produits marketplace du seller (utiliser `marketplaceProductsApi.listMine`)
- `title` : input texte
- `priceMode` : select (FIXED, QUOTE_ONLY, FROM_PRICE)
- `unitPrice` (si priceMode = FIXED ou FROM_PRICE)
- `currency` : select (EUR par défaut, USD)
- `moq`, `availableQuantity` (optionnels)

Au submit : `POST /marketplace/offers` → status DRAFT côté backend → redirection `/seller/marketplace-offers/[id]` (page MP-OFFER-VIEW livrée au LOT 1).

#### 2.3 — Édition + actions sur `[id]/page.tsx`

Compléter la page MP-OFFER-VIEW livrée au LOT 1 avec :

- **Mode édition** sur les champs autorisés (cf. liste 2.1). Pattern controlled state, dirty/disabled, diff minimal.
- **Bouton "Soumettre à validation"** si `publicationStatus ∈ {DRAFT, REJECTED}` → `POST /:id/submit` + confirmation.
- **Banner re-revue** si `publicationStatus ∈ {APPROVED, PUBLISHED}` (modification déclenche revue staff).

#### 2.4 — Lien depuis index

Activer le bouton "Nouvelle offre" sur `/seller/marketplace-offers/page.tsx` (était grisé au LOT 1).

#### 2.5 — Tests

- Page `/new` : 4 tests (formulaire, validation slug/title, submit OK, hint conflit).
- Page `[id]` édition : 5 tests (dirty/disabled, diff minimal envoyé, validation client, hint 403, banner status).
- Type-check anti-`marketplaceProductId` : preuve par tsc que l'`UpdateMarketplaceOfferInput` rejette ce champ (probe miroir MP-EDIT-PRODUCT.1).

Cible : **+9 vitest** (194 → 203).

### Doc

- Compléter `docs/marketplace/MARKETPLACE_OFFER_SELLER.md` avec section "Création + workflow soumission".
- `notes/mp-offer-edit-1-plan.md`.

### Périmètre exclu LOT 2

- Pas de gestion `MarketplaceOfferBatch` (rattachement lot produit fini — futur lot dédié).
- Pas de modification `visibilityScope` côté seller.
- Pas d'archive (à voir dans MP-OFFER-EDIT-2).

### Preuves obligatoires LOT 2

```bash
# 1. Branche + commits
git rev-parse --abbrev-ref HEAD
git log --oneline mp-offer-view-1-seller-detail..HEAD

# 2. Fichiers créés/modifiés
ls -la "apps/frontend/src/app/(dashboard)/seller/marketplace-offers/new/page.tsx" 2>&1
git diff --stat mp-offer-view-1-seller-detail..HEAD

# 3. Diff helper API (preuve UpdateMarketplaceOfferInput strict)
git diff mp-offer-view-1-seller-detail..HEAD -- apps/frontend/src/lib/marketplace-offers.ts | head -100

# 4. Probe anti-marketplaceProductId
echo 'import type { UpdateMarketplaceOfferInput } from "./lib/marketplace-offers";
const ko: UpdateMarketplaceOfferInput = { marketplaceProductId: "x" };
console.log(ko);' > apps/frontend/src/__probe_offer__.ts
cd apps/frontend && timeout 30 ./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -E "__probe_offer__|TS2353" | head -3
cd ../..
rm apps/frontend/src/__probe_offer__.ts || echo "(probe persistante)"

# 5. Santé globale
cd apps/frontend && timeout 90 ./node_modules/.bin/vitest run --reporter=basic 2>&1 | tail -8 ; cd ../..
```

---

## LOT 3 — MP-EDIT-PRODUCT.3-light — Brancher InlineMediaUploader sur `mainMediaId` produit

### Pré-conditions

- LOTS 1 et 2 terminés, verts.
- Si l'un des deux abandonné, **stopper sans démarrer LOT 3**.

### Branche

```bash
git checkout mp-offer-edit-1-create-and-update
git checkout -b mp-edit-product-3-light-main-media
```

### Contexte du lot

Aujourd'hui :

- L'`InlineMediaUploader` (FP-3.1) existe et fonctionne pour le `SellerProfile` (logo + bannière).
- Le `MarketplaceProduct` a un champ `mainMediaId` mais le seller ne peut pas le modifier depuis l'UI.
- Le composant `UpdateMarketplaceProductInput` (livré par MP-EDIT-PRODUCT.1) **exclut volontairement** `mainMediaId` du type strict frontend.
- Conséquence : le `seed-demo-fix` LOT 3 du mandat 9 a posé des MediaAssets PRIMARY APPROVED, mais aucun seller (ni produit) ne peut en lier un nouveau via l'UI. Démo limitée.

**Décision pour MP-EDIT-PRODUCT.3-light** : assouplir le contrat MP-EDIT-PRODUCT.1 pour autoriser `mainMediaId` dans l'`UpdateMarketplaceProductInput`, et le brancher sur l'`InlineMediaUploader` existant. **Documenter clairement** ce changement de contrat.

### Périmètre

#### 3.1 — Modification `apps/frontend/src/lib/marketplace-products.ts`

- Ajouter `mainMediaId?: string | null` dans `UpdateMarketplaceProductInput`.
- Mettre à jour le commentaire en tête du fichier (qui actuellement liste `mainMediaId` comme interdit) — note : il est désormais **autorisé** depuis MP-EDIT-PRODUCT.3-light.
- Les autres exclusions (`slug`, `categoryId`, `publicationStatus`, etc.) restent en place.

#### 3.2 — Section "Image principale" sur `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx`

Ajouter une section dédiée (juste après "Identité publique") :

- Affichage de l'image actuelle (si `mainMediaId` existe).
- Composant `InlineMediaUploader` (réutilisé tel quel — pattern miroir de logo/bannière dans `/seller/profile/edit`) avec `role: PRIMARY`, `relatedType: MARKETPLACE_PRODUCT`, `relatedId: <productId>`.
- Au upload réussi → PATCH `/marketplace/products/:id` avec `{ mainMediaId: <newId> }` → re-hydratation du produit.
- Validation MIME/taille déjà gérée par l'`InlineMediaUploader`.

#### 3.3 — Backend MediaAsset moderation

**Subtilité importante** : un MediaAsset uploadé par un seller arrive en `moderationStatus: PENDING`. Le catalog public exige `moderationStatus: APPROVED` pour qu'un produit apparaisse (gate `findProductsWithPrimaryMedia`). Donc :

- Le seller upload son image → MediaAsset PENDING + produit ré-utilise ce mainMediaId.
- Le produit a maintenant un mainMediaId, mais ce mainMediaId pointe vers un MediaAsset PENDING.
- → Le produit **disparaît du catalog public** tant que le staff n'approuve pas le MediaAsset.

**Note pour la doc** : ce comportement est **volontaire** (modération stricte). Documenter clairement que :

1. Lors de l'upload, le produit peut "disparaître" du catalog le temps de la modération.
2. L'admin doit aller sur la review queue pour approuver le MediaAsset.
3. Comportement attendu, pas un bug.

**Pas de modification backend** — la modération existe déjà côté admin. Juste documentation.

#### 3.4 — Tests

- Page `[id]` : 3 tests vitest sur la section image principale (rendu, upload simulé, PATCH déclenché après upload).
- **Pas de probe anti-mainMediaId** cette fois (au contraire, on autorise maintenant). Mais garder les probes anti-`slug`, anti-`categoryId`, anti-`publicationStatus` si elles existent dans les tests précédents.

Cible : **+3 vitest** (203 → 206).

### Doc

- `docs/marketplace/MARKETPLACE_PRODUCT_EDIT.md` : nouvelle section "Image principale" + note explicite sur le comportement modération PENDING/APPROVED.
- `docs/marketplace/SELLER_PROFILE.md` : si nécessaire, lien croisé.
- `notes/mp-edit-product-3-light-plan.md`.

### Périmètre exclu LOT 3

- Pas de gestion gallery (multi-images).
- Pas de réutilisation MediaAsset existant (toujours upload nouveau).
- Pas de notification staff lors d'upload (futur lot).
- Pas de re-modération automatique après changement.

### Preuves obligatoires LOT 3

```bash
# 1. Branche + commits
git rev-parse --abbrev-ref HEAD
git log --oneline mp-offer-edit-1-create-and-update..HEAD

# 2. Diff marketplace-products.ts (preuve mainMediaId autorisé maintenant)
git diff mp-offer-edit-1-create-and-update..HEAD -- apps/frontend/src/lib/marketplace-products.ts | head -60

# 3. Probe : mainMediaId désormais autorisé
echo 'import type { UpdateMarketplaceProductInput } from "./lib/marketplace-products";
// Doit COMPILER (mainMediaId autorisé dans MP-EDIT-PRODUCT.3-light)
const ok: UpdateMarketplaceProductInput = { mainMediaId: "abc-123" };
// Doit ÉCHOUER (slug toujours interdit)
const ko: UpdateMarketplaceProductInput = { slug: "x" };
console.log(ok, ko);' > apps/frontend/src/__probe_main_media__.ts
cd apps/frontend && timeout 30 ./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -E "__probe_main_media__|TS2353" | head -5
cd ../..
rm apps/frontend/src/__probe_main_media__.ts || echo "(probe persistante)"

# 4. Santé globale
cd apps/frontend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..
cd apps/frontend && timeout 90 ./node_modules/.bin/vitest run --reporter=basic 2>&1 | tail -8 ; cd ../..
```

---

## Critères d'arrêt

- Les 3 lots terminés et verts.
- Blocage majeur arbitrage humain.
- 2 blocages majeurs consécutifs.
- 8 heures écoulées.
- Un lot casse la santé locale > 30 min sans solution.

## Gestion des blocages

- **Mineur** : décision conservatrice + commit + continuer.
- **Majeur** : revert si nécessaire, documenter, passer au lot suivant ou stopper.
- **Si DTO backend `marketplace-offers` exige des champs supplémentaires** non documentés ici : aligner strictement sur le DTO. **Ne pas modifier le DTO backend dans ce mandat.**
- **Si `InlineMediaUploader` ne supporte pas le `role: PRIMARY`** (peu probable, mais possible si conçu uniquement pour LOGO/BANNER initialement) : l'étendre **strict additif** (ajouter PRIMARY à un éventuel switch role-spécifique). Documenter.
- **Ne jamais rester bloqué silencieusement** > 30 min.

## État de sortie attendu

1. Sur **la dernière branche active**, à un commit vert.
2. **`main` strictement à `0c2a385`** (intact). Vérifier `git log -1 main`.
3. **Aucun push, aucun merge, aucune action sur origin, aucune action VPS**.
4. Working tree clean sur la dernière branche active.
5. Branche `seed-demo-fix-2-quality-and-logistics` **inchangée** (pas de commit dessus, pas de checkout).
6. **Un seul handoff final** dans `notes/handoff-megamandat-14.md` (pattern miroir des handoffs 9 et 11) :
   - TL;DR : 3 / 2 / 1 / 0 lots livrés.
   - Pour chaque lot : branche, commits, état, fichiers créés/modifiés, **outputs bruts des preuves**.
   - Décisions techniques notables.
   - Blocages rencontrés.
   - **Plan de push proposé** branche par branche, avec rebase `--onto main`.
   - Smoke tests post-merge par lot.
   - Limitations connues (notamment : note importante que MP-EDIT-PRODUCT.3-light **assouplit** le contrat type strict de MP-EDIT-PRODUCT.1 en autorisant `mainMediaId`).

## Commande de vérification finale

```bash
# main intact
git log -1 main --oneline   # 0c2a385 attendu

# aucune branche du mandat 14 sur origin
git branch -r | grep -E "(mp-offer-view|mp-offer-edit|mp-edit-product-3)" \
  && echo "❌ INCIDENT : branche poussée — documenter, ne pas tenter de revert remote" \
  || echo "✓ aucune branche du mandat 14 poussée"

# branche seed-demo-fix-2 intacte
git rev-parse seed-demo-fix-2-quality-and-logistics

# working tree clean
git status

# santé dernière branche
pnpm --filter @iox/backend exec tsc --noEmit
pnpm --filter @iox/frontend exec tsc --noEmit
```

## Format du handoff (modèle obligatoire)

```markdown
# Handoff méga-mandat 14 — 2026-04-27/28

## TL;DR

- LOT 1 (MP-OFFER-VIEW) : ✅ livré / ⚠ partiel / ❌ abandonné
- LOT 2 (MP-OFFER-EDIT-1) : ...
- LOT 3 (MP-EDIT-PRODUCT.3-light) : ...
- main intact à `0c2a385` : ✓
- branche `seed-demo-fix-2-quality-and-logistics` intacte : ✓
- aucun push / merge / deploy : ✓

## LOT 1 — MP-OFFER-VIEW

### État

- Branche, commits, fichiers

### Preuves brutes

[recopier les outputs LOT 1]

### Décisions

...

## LOT 2 — MP-OFFER-EDIT-1

[idem]

## LOT 3 — MP-EDIT-PRODUCT.3-light

### Décisions notables

- **Assouplissement du contrat MP-EDIT-PRODUCT.1** : `UpdateMarketplaceProductInput` autorise désormais `mainMediaId`. Documenté.
- Comportement modération PENDING/APPROVED documenté côté UX (le produit "disparaît" du catalog public le temps de l'approbation staff).

## Plan de push proposé (séquentiel)

### Pré-requis : pousser d'abord SEED-DEMO-FIX-2 (mandat 13)

`git push -u origin seed-demo-fix-2-quality-and-logistics` + PR + CI + merge + deploy + activation seed VPS.

### Puis cascade mandat 14

1. `git push -u origin mp-offer-view-1-seller-detail` + PR + CI + merge + deploy
2. `git rebase --onto main mp-offer-view-1-seller-detail mp-offer-edit-1-create-and-update` + push + PR + merge + deploy
3. `git rebase --onto main mp-offer-edit-1-create-and-update mp-edit-product-3-light-main-media` + push + PR + merge + deploy

## Smoke tests post-merge

### MP-OFFER-VIEW

- [ ] Seller smoke navigue vers /seller/marketplace-offers → 8 offres listées.
- [ ] Click sur une offre → page détail rendue avec sections.
- [ ] Buyer reçoit 403 sur /marketplace/offers/:id (couvert backend).

### MP-OFFER-EDIT-1

- [ ] Seller crée un brouillon d'offre via /new → redirection détail.
- [ ] Seller modifie title → submit OK + audit.
- [ ] Tentative `marketplaceProductId` via DOM hack → tsc avait déjà rejeté.

### MP-EDIT-PRODUCT.3-light

- [ ] Seller upload nouvelle image principale → MediaAsset PENDING + produit ré-hydraté avec nouvelle image.
- [ ] Produit "disparaît" du catalog public le temps de la modération staff.
- [ ] Staff approuve dans review queue → produit ré-apparaît au catalog.

## Limitations connues

- 2 suites jest auth pré-existantes restent en échec local (depuis L9-5, hors scope, ignoré).
- Pas de gestion `MarketplaceOfferBatch` (rattachement lot produit fini) — futur lot dédié.
- `visibilityScope` non éditable côté seller (futur lot).
- Pas de gallery produit (futur lot).
```

## Rappel final

- **L'utilisateur dort/sort ~8 h.** Aucune confirmation possible. Décisions conservatrices.
- **Petits lots verts > gros lot rouge.**
- **En cas de doute, livre moins mais propre.**
- **Aucune action sur origin, aucune action VPS, aucune touche à la branche seed-demo-fix-2.**
- **Vérifie sur disque** avant chaque commit.
- **Recopie l'output réel** des preuves.
- **Si tu ne peux pas exécuter une commande**, rapporte le brut. Pas d'invention.

Les mandats 9, 11 et 13 ont réussi avec ces règles. Garde le même standard de qualité.
