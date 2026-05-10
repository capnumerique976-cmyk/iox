# Prompt Claude Code — MP-EDIT-PRODUCT.1 — Lecture détaillée + édition champs sûrs côté seller

> **Usage** : à coller tel quel dans Claude Code après merge SEED-DEMO (#9). Lot moyen (~3 jours), faible-à-moyen risque, fort impact UX.
> **Pré-requis (à vérifier en premier, stop si non remplis)** :
>
> - être sur la machine où le repo IOX est cloné, au chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - working tree clean
> - branche courante : `main` à `9f9fddd` (SEED-DEMO mergé) ou plus récent
> - `gh` installé mais **non utilisé dans ce mandat**

---

## ⚠️ Garde-fou anti-hallucination — règle obligatoire

À la fin du mandat, **avant de rendre la synthèse**, tu DOIS exécuter et **recopier textuellement l'output** des 6 commandes de preuve listées en section "Preuves finales obligatoires". Toute synthèse rendue **sans ces 6 outputs réels** est invalide. Si tu ne peux pas exécuter l'une d'elles, rapporte l'erreur brute au lieu d'inventer un succès.

---

## Contexte canonique IOX (rappel concis)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js (App Router), **controlled state** (pas de react-hook-form).

**Cinq invariants à respecter** :

1. `MarketplaceProduct` ≠ `MarketplaceOffer` ≠ `SellerProfile`. Product = ce que c'est, Offer = comment c'est vendu maintenant, Seller = qui le vend.
2. **Projection publique filtrée**. Aucun champ n'apparaît en public sans projection explicite côté `marketplace-catalog`.
3. Statuts marketplace ≠ statuts MCH internes.
4. `FP-x` ≠ `Lot X` ≠ `MP-x` ≠ `MP-EDIT-PRODUCT.x`.
5. Seller = rôle marketplace, pas synonyme automatique de bénéficiaire terrain.

## Constat de départ

- Backend `marketplace-products` : CRUD complet existant, `MARKETPLACE_SELLER` autorisé sur `GET /:id` et `PATCH /:id`, `assertMarketplaceProductOwnership` enforce le scoping seller.
- Frontend `/seller/marketplace-products/` ne contient aujourd'hui que :
  - `page.tsx` (index minimaliste, FP-4)
  - `[id]/seasonality/page.tsx` (FP-4)
  - `[id]/certifications/page.tsx` (FP-2.1)
- **Aucune page** `[id]/page.tsx` ni `[id]/edit/page.tsx`. Le seller ne peut pas voir le détail complet de son produit, ni éditer les champs textuels (identité, descriptions, origine, conservation).
- Conséquence : tant que cet écran n'existe pas, le seller dépend toujours de l'admin/staff pour la moindre correction de libellé.

## Objectif MP-EDIT-PRODUCT.1

Livrer **une page seller** `/seller/marketplace-products/[id]/page.tsx` qui :

1. Affiche le détail complet du produit (lecture).
2. Permet d'éditer **uniquement les "champs sûrs"** (sans toucher au workflow de publication, à la taxonomie, ni aux enums sensibles).
3. Bascule sur le pattern PATCH minimal (n'envoie que les champs modifiés).
4. Préserve les autres écrans existants (`/seasonality`, `/certifications`).

**Périmètre strict — voir section "Champs autorisés" et "Champs interdits" ci-dessous.**

## Branche

```
mp-edit-product-1-seller-edit-safe-fields
```

depuis `main` à jour.

## Règles absolues

- **Aucune modification backend.** Pas de touche à `marketplace-products` côté NestJS, ni au DTO, ni au service. Tout est déjà en place.
- **Aucune modification du schéma Prisma** ni de migration.
- **Aucun ajout de dépendance** sans justification écrite dans le commit.
- **Pas de touche à `[id]/seasonality` ni `[id]/certifications`** sauf ajout d'un lien retour cohérent (optionnel).
- **Pas de refacto du composant `SellerCertificationsManager`** ni de `SellerCertificationsManager.tsx`, ni de la page index `/seller/marketplace-products/page.tsx` au-delà d'un lien "Détails" supplémentaire.
- Préserver la CI : `pnpm lint`, `pnpm typecheck`, `pnpm test` verts à chaque commit.
- Conventional commits, atomiques par sous-étape.
- Aucun push, aucune PR, aucun merge. Branche locale livrée prête à pousser par l'utilisateur.

## Champs autorisés (à exposer en édition)

Ces champs sont des **textes libres** ou des **valeurs simples** sans conséquence sur la taxonomie, le SEO, ou le workflow :

### Section "Identité publique"

- `commercialName` (string, required, MaxLength 255)
- `regulatoryName` (string, optional, MaxLength 255)
- `subtitle` (string, optional, MaxLength 255)

### Section "Origine"

- `originCountry` (string, required, MaxLength 100, code ISO recommandé)
- `originRegion` (string, optional, MaxLength 100)
- `originLocality` (string, optional, MaxLength 160) — FP-6
- `altitudeMeters` (int, optional, [0, 9000]) — FP-6
- `gpsLat` (number, optional, [-90, 90]) — FP-6
- `gpsLng` (number, optional, [-180, 180]) — FP-6, **cohérence pair imposée backend** (les deux ou aucun)

### Section "Variétés et méthode"

- `varietySpecies` (string, optional)
- `productionMethod` (string, optional)

### Section "Descriptions"

- `descriptionShort` (string, optional, MaxLength ~500 — vérifier DTO)
- `descriptionLong` (string, optional, MaxLength ~4000)
- `usageTips` (string, optional)

### Section "Conservation et conditionnement"

- `packagingDescription` (string, optional)
- `storageConditions` (string, optional)
- `shelfLifeInfo` (string, optional)
- `allergenInfo` (string, optional)

## Champs interdits (à NE PAS exposer dans ce lot)

Ces champs sont **explicitement hors périmètre** de MP-EDIT-PRODUCT.1 et seront traités par d'autres lots :

- `slug` (impacte SEO et liens publics, staff uniquement)
- `categoryId` (taxonomie, staff)
- `productId` (lien vers entité MCH Product, immuable)
- `sellerProfileId` (immuable)
- `mainMediaId` (à brancher sur `InlineMediaUploader` FP-3.1 dans un futur lot)
- `harvestMonths`, `availabilityMonths`, `isYearRound` (déjà éditables via `/seasonality` FP-4 — afficher en lecture seule + lien vers la page dédiée)
- `minimumOrderQuantity`, `defaultUnit` (FP-5 candidat — afficher en lecture seule)
- `nutritionInfoJson` (JSON complexe — futur lot dédié)
- `publicationStatus`, `submittedAt`, `approvedAt`, `publishedAt`, `rejectionReason`, `exportReadinessStatus`, `completionScore`, `complianceStatusSnapshot` (workflow + scoring, lecture seule)

**Tester explicitement** : si l'utilisateur essaie d'éditer un de ces champs interdits via le DOM (en bidouillant l'HTML), le PATCH ne doit pas les inclure dans le payload (`buildPayload` ne les pioche pas).

## Périmètre frontend

### Fichiers à créer

1. **`apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx`** (page principale)
   - RSC ou client component selon le pattern existant — utilise plutôt **client component** comme `/seller/profile/edit/page.tsx` pour la cohérence (controlled state, validation client).
   - Charge le produit via `marketplaceProductsApi.getById(id, token)`.
   - Sections lecture + édition (cf. liste ci-dessus).
   - Bandeau de statut visible : `publicationStatus` (DRAFT / IN_REVIEW / APPROVED / PUBLISHED / SUSPENDED / REJECTED / ARCHIVED) avec couleur appropriée.
   - **Banner d'avertissement** si `publicationStatus ∈ {APPROVED, PUBLISHED}` : "Modifier ce produit déclenchera une nouvelle revue qualité — la publication peut être suspendue le temps de la revue."
   - Bouton "Enregistrer" disabled si `!dirty`.
   - Diff minimal envoyé via `PATCH /marketplace/products/:id`.
   - Hints contextuels 403/404 (pattern miroir de `/seasonality/page.tsx` et `/certifications/page.tsx`).
   - Liens vers `/seller/marketplace-products/[id]/seasonality` et `/seller/marketplace-products/[id]/certifications` (réutilisation des écrans existants).
   - Lien retour vers `/seller/marketplace-products` (index).

2. **`apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.test.tsx`** (tests vitest)
   - Hydrate le formulaire à partir d'un mock `getById`.
   - Bouton "Enregistrer" désactivé tant que `!dirty`.
   - Submit envoie un diff minimal (test du payload).
   - Validation client : pair GPS (lat sans lng → erreur visuelle).
   - Hint 404 : produit introuvable.
   - Hint 403 : produit hors périmètre (pas le sien).
   - Banner d'avertissement si statut APPROVED/PUBLISHED.
   - Cibler **6 à 8 tests** vitest.

### Fichiers à modifier

3. **`apps/frontend/src/lib/marketplace-products.ts`**
   - Ajouter `update(id, payload, token)` qui PATCH `/marketplace/products/:id` avec un `UpdateMarketplaceProductInput` partiel.
   - Le payload type doit inclure **uniquement les champs autorisés** listés ci-dessus. Les autres champs (slug, categoryId, mainMediaId, publicationStatus, etc.) **ne doivent même pas figurer dans le type TypeScript** — ainsi un appel `update(id, { slug: '...' })` est rejeté par `tsc` à la compilation.

4. **`apps/frontend/src/app/(dashboard)/seller/marketplace-products/page.tsx`** (index FP-4)
   - Ajouter un lien "Détails / Éditer" par ligne (en plus des liens existants "Saisonnalité" et "Certifications").
   - Garder le composant minimaliste, pas de refacto.

### Fichiers à NE PAS modifier

- `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/seasonality/page.tsx`
- `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/certifications/page.tsx`
- `apps/frontend/src/components/marketplace/SellerCertificationsManager.tsx`
- `apps/frontend/src/components/marketplace/SeasonalityPicker.tsx`
- Tout fichier backend.

## Documentation à créer

- `docs/marketplace/MARKETPLACE_PRODUCT_EDIT.md` : objectif, périmètre des champs édités, périmètre exclu, banner workflow, table des permissions par champ.
- `notes/mp-edit-product-1-plan.md` : mini-plan 5-15 lignes avant code. Commit `chore(notes): plan MP-EDIT-PRODUCT.1`.
- `notes/handoff-<date>-mp-edit-product-1.md` : handoff final avec preuves obligatoires.

## Méthodologie obligatoire

1. **Lire avant de coder** :
   - `apps/backend/src/marketplace-products/dto/marketplace-product.dto.ts` (pour récupérer les bornes exactes des champs et les aligner côté frontend)
   - `apps/backend/src/marketplace-products/marketplace-products.service.ts` (pour comprendre `findById` + `assertMarketplaceProductOwnership` + `assertGpsPairCoherence`)
   - `apps/frontend/src/app/(dashboard)/seller/profile/edit/page.tsx` (**pattern de référence** : controlled state, dirty, diff minimal, gestion d'erreur)
   - `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/seasonality/page.tsx` (pattern proche, gestion banner APPROVED/PUBLISHED)
   - `apps/frontend/src/lib/marketplace-products.ts` (helper API actuel — extension à faire)
2. Mini-plan dans `notes/mp-edit-product-1-plan.md`. Commit.
3. **Boucle courte** :
   - Étendre le helper API → tsc → test → commit
   - Créer la page squelette → tsc → render test → commit
   - Ajouter section par section (Identité, Origine, Descriptions, Conservation) → test → commit
   - Ajouter banner + hints → test → commit
   - Ajouter lien depuis index → commit
   - Doc → commit
4. Lancer la santé après chaque sous-étape : `pnpm --filter @iox/frontend exec tsc --noEmit && pnpm --filter @iox/frontend exec vitest run --reporter=basic 2>&1 | tail -10`.
5. Vérifier sur disque (`ls`, `cat`) avant chaque commit. Pas de "j'ai créé le fichier" sans confirmation.

## Critères de succès

- Branche `mp-edit-product-1-seller-edit-safe-fields` locale verte.
- `pnpm --filter @iox/backend test` toujours **464/464** (aucune modif backend).
- `pnpm --filter @iox/frontend exec vitest run` ≥ **157** (140 actuels + 6-8 nouveaux + 11 MP-S-INDEX = 151+, avec ≥ 6 nouveaux ce mandat → ~157+).
- `pnpm lint` et `pnpm typecheck` clean front + back.
- Aucune modification backend.
- Type `UpdateMarketplaceProductInput` côté frontend exclut **strictement** les champs interdits (test tsc compile-time).
- Page accessible à `/seller/marketplace-products/[id]/page.tsx`, lecture + édition fonctionnelles, banner + hints corrects.
- Lien "Détails / Éditer" présent dans l'index `/seller/marketplace-products`.
- Doc `MARKETPLACE_PRODUCT_EDIT.md` créée.
- Working tree clean.
- main reste à `9f9fddd`.
- Aucun push, aucune PR.

## Smoke tests à valider après merge sur le déployé (à lister dans le handoff)

- [ ] Seller smoke (`smoke-seller@iox.mch`) navigue vers `/seller/marketplace-products` → liste OK
- [ ] Click sur "Détails" d'un produit → page édition rendue avec les valeurs hydratées du seed
- [ ] Modifier `descriptionShort` → bouton "Enregistrer" s'active, submit OK, succès affiché
- [ ] Tenter `gpsLat` seul (sans `gpsLng`) → erreur 400 backend, message clair côté UI
- [ ] Si produit `APPROVED`, vérifier le banner d'avertissement (modification = re-revue)
- [ ] Buyer reçoit 403 sur tentative d'édition (couvert backend, à retester si suite Playwright étendue)

## Gestion des blocages

- **DTO backend incomplet** sur l'un des champs autorisés (peu probable, on a confirmé les bornes FP-6) : signaler dans le handoff, ne PAS toucher le DTO backend dans ce lot.
- **Pattern controlled state pas adapté** pour formulaire long : garder controlled state quand même (cohérent avec `/profile/edit`), mais possiblement extraire des sous-composants `Section` réutilisables. Pas de RHF.
- **Bug de banner sur statut DRAFT** : un produit DRAFT ne déclenche pas de re-revue, donc pas de banner. Vérifier que la condition `publicationStatus ∈ {APPROVED, PUBLISHED}` est bien la seule qui affiche le banner.
- **Si la page tsc-fail à cause d'un champ Prisma optional vs required** : aligner strictement sur le DTO backend, **pas l'inverse**.
- **Blocage majeur** (pattern fondamentalement incompatible, refacto large nécessaire) : arrêter, documenter dans le handoff, rendre la main.

## Preuves finales obligatoires (anti-hallucination)

**Avant de rendre la synthèse**, exécute et recopie textuellement l'output **complet** des 6 commandes ci-dessous. Si tu ne peux pas exécuter l'une d'elles, rapporte l'erreur brute.

```bash
# 1. Branche + commits réels
git rev-parse --abbrev-ref HEAD
git log --oneline main..HEAD

# 2. Fichiers créés sur disque (pas inventés)
ls -la \
  "apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx" \
  "apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.test.tsx" \
  "docs/marketplace/MARKETPLACE_PRODUCT_EDIT.md" \
  "notes/mp-edit-product-1-plan.md" \
  "notes/handoff-"*"-mp-edit-product-1.md" 2>&1

# 3. Diff de marketplace-products.ts (helper API étendu)
git diff main..HEAD -- apps/frontend/src/lib/marketplace-products.ts | head -80

# 4. tsc strict frontend
cd apps/frontend && timeout 60 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..

# 5. Vitest count + green
cd apps/frontend && timeout 90 ./node_modules/.bin/vitest run --reporter=basic 2>&1 | tail -8 ; cd ../..

# 6. Type-check de l'interdiction "champ slug" — attendu : tsc rejette ce code
echo "/* @ts-expect-error MP-EDIT-PRODUCT.1 — slug doit être interdit */
import { marketplaceProductsApi } from './apps/frontend/src/lib/marketplace-products';
marketplaceProductsApi.update('00000000-0000-4000-8000-000000000000', { slug: 'forbidden' }, 'tok');
" > /tmp/check-forbidden.ts
cd apps/frontend && timeout 30 ./node_modules/.bin/tsc --noEmit --skipLibCheck /tmp/check-forbidden.ts 2>&1 | head -5 ; cd ../..
```

**Rejet de la synthèse** : si l'un de ces 6 outputs n'est pas dans ton rapport final avec son **vrai contenu**, le mandat est considéré comme **non livré**.

## Format du handoff

`notes/handoff-<date>-mp-edit-product-1.md` doit contenir :

- **État final** : nom de branche, nombre de commits, hash du dernier.
- **L'output brut des 6 commandes de preuve** (recopié textuellement).
- Liste des fichiers créés vs modifiés.
- Décisions techniques notables (extraction de sous-composants, choix de validation client, pourquoi controlled state, etc.).
- Limites volontaires (mainMediaId pas branché, MOQ/unit en lecture seule, etc.).
- Smoke tests à effectuer après merge (cf. liste ci-dessus).
- Plan de push proposé : `git push -u origin mp-edit-product-1-seller-edit-safe-fields && gh pr create ...` (à exécuter par l'utilisateur).

## Périmètre exclu (à différer)

- Mode "création produit" (`/seller/marketplace-products/new`) → MP-EDIT-PRODUCT.2
- Workflow submit/approve/archive depuis l'UI seller → MP-EDIT-PRODUCT.2
- Édition `mainMediaId` via `InlineMediaUploader` → MP-EDIT-PRODUCT.3
- Édition `nutritionInfoJson` → futur lot dédié
- Édition `categoryId` ou `slug` → réservé staff
- Édition MOQ/defaultUnit → FP-5
- E2E Playwright → couvert par les vitest pour ce lot

## Rappel final

- **Aucune touche backend.** Le contrat API est figé.
- **Aucune touche aux écrans existants** (`/seasonality`, `/certifications`, `SellerCertificationsManager`).
- **Pattern miroir** de `/seller/profile/edit/page.tsx`.
- **Vérifie sur disque** avant chaque commit.
- **Recopie l'output réel** des 6 preuves en fin de mandat — pas de description, pas d'invention.
- En cas de doute ou d'échec, rapporte le brut.
