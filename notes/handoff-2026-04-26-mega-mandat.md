# Handoff — Mandat 6 h autonome (2026-04-26)

## TL;DR

Trois lots livrés en chaîne, **strictement local**, **aucun push**,
**aucun fetch**, **aucun appel `gh`**. Toutes les commandes
destructives interdites (push, force, reset --hard, branch -D,
prisma reset, drop) ont été évitées. `main` n'a pas bougé
(`HEAD = 2d28d4c`).

| Lot     | Branche                                  | Commits    | Statut       |
| ------- | ---------------------------------------- | ---------- | ------------ |
| FP-2.1  | `fp-2-1-seller-certifications-edition`   | 5 commits  | ✅ Verts      |
| FP-3.1  | `fp-3-1-seller-media-uploader`           | 4 commits  | ✅ Verts      |
| FP-6    | `fp-6-product-fine-origin`               | 5 commits  | ✅ Verts      |

Cibles atteintes :
- Backend : 450 → **453 jest** (+3 nets pour FP-6, suite saine).
- Frontend : 117 → **140 vitest** (+15 FP-2.1, +8 FP-3.1, FP-6 frontend
  sans test ajouté).
- Lint frontend `next lint` : ✅ aucun warning sur les 3 lots.
- TS strict (`tsc --noEmit`) : ✅ backend + frontend sur les 3 branches.

## État Git local

```
main                                  2d28d4c   (intact, jamais touché)
└── fp-2-1-seller-certifications-edition  af45a93
    └── fp-3-1-seller-media-uploader      af54a33
        └── fp-6-product-fine-origin      13975fb   (HEAD)
```

Chaque branche est un **fast-forward** linéaire de la précédente — aucun
merge, aucun rebase. Tous les commits sont signés
`Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.

## Lot 1 — FP-2.1 (édition seller des certifications)

Branche : `fp-2-1-seller-certifications-edition` (depuis `main`).

**Commits :**
- `9b8e1ab chore(notes): plan fp-2-1-seller-certifications-edition`
- `4483d6f feat(frontend): FP-2.1 self-edit certifications (seller)`
- `007edf6 test(frontend): FP-2.1 cover SellerCertificationsManager + 2 pages`
- `af45a93 docs(marketplace): SELLER_PROFILE — section FP-2.1`

**Backend : zéro changement** (l'endpoint `POST/PATCH/DELETE
/marketplace/certifications` ouvre déjà le rôle `MARKETPLACE_SELLER` avec
ownership polymorphe `SELLER_PROFILE | MARKETPLACE_PRODUCT`).

**Frontend livré :**
- `apps/frontend/src/lib/marketplace-certifications.ts` — helper API
  authentifié (list/create/update/remove + types).
- `apps/frontend/src/components/marketplace/SellerCertificationsManager.tsx`
  — composant générique (props `relatedType` + `relatedId`), formulaire
  contrôlé (pas de RHF), `useConfirm()` pour suppression, validation
  cohérence dates et `OTHER` requiert code/issuingBody.
- `apps/frontend/src/app/(dashboard)/seller/profile/certifications/page.tsx`
  — résolution profil via `sellerProfilesApi.getMine()` puis manager.
- `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/certifications/page.tsx`
  — résolution produit via `marketplaceProductsApi.getById`, manager
  scope `MARKETPLACE_PRODUCT`.
- Liens d'accès : QuickLink dans `/seller/dashboard`, action dans
  PageHeader de `/seller/profile/edit`, lien certs dans la liste
  `/seller/marketplace-products`.

**Tests : +15 nets** (manager 9, profil 3, produit 3 ; page liste +1
assertion).

**Hors scope volontaire :** uploader pour `documentMediaId` (différé
au lot uploader).

## Lot 2 — FP-3.1 (uploader inline logo + bannière)

Branche : `fp-3-1-seller-media-uploader` (depuis FP-2.1).

**Commits :**
- `2e92d1f chore(notes): plan fp-3-1-seller-media-uploader`
- `1f336fd feat(frontend): FP-3.1 inline media uploader (logo + bannière seller)`
- `01bbb9b test(frontend): FP-3.1 cover InlineMediaUploader + presence on edit page`
- `af54a33 docs(marketplace): SELLER_PROFILE — section FP-3.1 (uploader inline)`

**Backend : zéro changement** (endpoint
`POST /marketplace/media-assets/upload` multipart déjà ouvert au rôle
`MARKETPLACE_SELLER` avec ownership `SellerProfile`).

**Frontend livré :**
- `apps/frontend/src/lib/marketplace-media-assets.ts` — `upload()` via
  `fetch` direct (le wrapper `api` force `application/json`, incompatible
  avec multipart) + `getUrl()` pour URL signée.
- `apps/frontend/src/components/marketplace/InlineMediaUploader.tsx` —
  composant contrôlé, machine à états `idle | preview | uploading |
  success | error`, validation client miroir backend (5 Mo, MIME), preview
  via `URL.createObjectURL` + révocation au unmount.
- Intégration `/seller/profile/edit` : remplacement de la zone read-only
  par 2 uploaders (LOGO + BANNER) qui enchaînent
  `sellerProfilesApi.updateMine({ logoMediaId | bannerMediaId })` puis
  ré-hydratent le formulaire.

**Tests : +8 nets** (uploader 7 + presence 1).

**Hors scope volontaire :** galerie additionnelle, crop client,
uploader pour les `documentMediaId` certifications.

## Lot 3 — FP-6 (origine fine produit)

Branche : `fp-6-product-fine-origin` (depuis FP-3.1).

**Commits :**
- `a5dad92 chore(notes): plan fp-6-product-fine-origin`
- `2d6d7b3 feat(prisma): FP-6 add fine origin columns to MarketplaceProduct`
- `2c54d99 feat(backend): FP-6 expose fine origin in MP DTOs + public projection`
- `1d03bf2 feat(frontend): FP-6 render fine origin section on public product page`
- `13975fb docs(marketplace): FP-6 dedicated note for fine origin fields`

**Migration Prisma additive** (sûre en prod) :
`prisma/migrations/20260426010000_add_marketplace_product_fine_origin/migration.sql`
— 4 `ALTER TABLE … ADD COLUMN` nullable, aucun défaut, aucun index.

**Schéma Prisma** :
```prisma
originLocality   String?  @map("origin_locality")
altitudeMeters   Int?     @map("altitude_meters")
gpsLat           Decimal? @map("gps_lat") @db.Decimal(9, 6)
gpsLng           Decimal? @map("gps_lng") @db.Decimal(9, 6)
```

**Backend** :
- `CreateMarketplaceProductDto` + `UpdateMarketplaceProductDto` : 4
  champs optionnels avec bornes class-validator (`@MaxLength(160)`,
  `@IsInt @Min(0) @Max(9000)`, coords WGS84).
- Service : helper `assertGpsPairCoherence()` appelé au create et au
  update — `BadRequestException` si exactement un des deux est fourni.
- Mapper public `marketplace-catalog.service.ts → ProductDetail` : ajoute
  les 4 champs ; `gpsLat/gpsLng` sérialisés en string via
  `Decimal.toString()` (JSON-safe sans perte de précision).

**Frontend** :
- Type `ProductDetail` étendu (lecture string|number tolérée).
- Section "Origine détaillée" sur `/marketplace/products/[slug]` :
  affichée seulement si ≥ 1 champ présent. Lien GPS externe Google Maps
  (`target="_blank"`, `rel="noopener noreferrer"`).
- Pas de test frontend ajouté (rendu conditionnel trivial — couvert si
  un snapshot existe).

**Tests backend : +3 nets** (create propage, create rejette orphelin,
update rejette orphelin). Total backend 450 → 453.

## Décisions techniques notables

1. **Pas de back-office staff dans FP-2.1** : la modération existante
   (`PATCH /marketplace/certifications/:id/verify`) est conservée
   inchangée. Le seller peut créer/éditer/supprimer ses propres
   certifs (status reset à `PENDING` à toute mutation).
2. **Multipart fetch direct dans FP-3.1** : le wrapper `api` partagé
   pose `Content-Type: application/json`, ce qui empêche le navigateur
   de poser le boundary `multipart/form-data`. Réimplémentation
   minimaliste documentée en tête du helper.
3. **`useConfirm` mocké en test** plutôt que monter le provider
   ConfirmDialog complet (Radix + jsdom dialog) — garde les tests
   focalisés sur la logique métier.
4. **`fireEvent.change` au lieu de `userEvent.upload` pour le test
   "rejet MIME"** : userEvent v14 applique l'attribut `accept` du
   `<input>` et drop silencieusement les fichiers non-conformes — on
   contourne pour tester explicitement `validateImageFile`.
5. **Cohérence GPS service-side** plutôt que décorateur class-validator
   custom : plus testable, plus lisible, et place la règle métier au
   bon niveau.
6. **`Decimal.toString()` dans le mapper public** : Prisma renvoie un
   `Prisma.Decimal`, JSON.stringify perd la précision ; on stringifie
   à la lecture, le frontend parse si besoin numérique (lien Google
   Maps marche tel quel avec une string).
7. **Pas d'index sur les 4 colonnes FP-6** : ce sont des données
   vitrine, jamais filtrées. Si filtrage géographique entre au backlog,
   on ajoutera un index GiST sur `(gps_lat, gps_lng)` à ce moment-là.

## Plan de push (à valider humainement)

```bash
# Vérifications préalables
git status                       # → clean attendu
git log --oneline main..HEAD     # → 13 commits attendus

# Push branch par branche, en remontant la chaîne
git push -u origin fp-2-1-seller-certifications-edition
git push -u origin fp-3-1-seller-media-uploader
git push -u origin fp-6-product-fine-origin

# Puis ouvrir 3 PRs ciblant `main`, dans l'ordre :
#  1) FP-2.1 (autonome)
#  2) FP-3.1 (rebase si FP-2.1 mergée avant)
#  3) FP-6   (rebase sur main une fois 1+2 mergés)
```

**Recommandation** : merger 1 → 2 → 3 dans cet ordre. FP-3.1 et FP-6
sont indépendants côté code, mais leurs branches sont chaînées — un
merge dans le désordre forcera un rebase.

## Limites connues / dette laissée

- **FP-2.1** : pas d'uploader pour `documentMediaId` côté certif (le
  champ existe en backend mais reste non éditable côté seller).
  Réutilisable trivialement via `<InlineMediaUploader role={DOCUMENT}>`
  une fois la modale d'édition de certif refactorisée pour accepter
  un media slot.
- **FP-3.1** : pas de gestion de galerie additionnelle (`MediaAssetRole.GALLERY`).
  L'API existe, le composant aussi — il manque juste une UI de réordonnancement.
- **FP-6** : pas de picker GPS interactif, pas de géocodage automatique
  `originLocality → coords`, pas de filtrage par bbox dans
  `marketplace-catalog`. Tout est documenté dans
  `docs/marketplace/MARKETPLACE_PRODUCT_FINE_ORIGIN.md` "Hors scope".
- **Migration FP-6** : pour appliquer en local, `pnpm --filter
  @iox/backend exec prisma migrate deploy --schema=../../prisma/schema.prisma`
  (ou laisser CI l'appliquer). **Aucun reset.**

## Critères d'arrêt — vérification finale

| Critère                                           | Statut |
| ------------------------------------------------- | ------ |
| `main` resté à `2d28d4c`                          | ✅     |
| Aucun push / fetch / pull / gh / merge            | ✅     |
| Aucune migration destructive (drop, rename, FK)   | ✅     |
| Tests backend verts (453/453)                     | ✅     |
| Tests frontend verts (140/140)                    | ✅     |
| Lint frontend (`next lint`) clean                 | ✅     |
| TS strict (`tsc --noEmit`) clean (front + back)   | ✅     |
| Conventional commits sur tous les commits         | ✅     |
| `notes/<branch>-plan.md` présent pour chaque lot  | ✅     |
| Doc marketplace mise à jour pour les 3 lots       | ✅     |
| Handoff écrit                                     | ✅     |
