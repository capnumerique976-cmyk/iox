# Cartographie d'expert — IOX au 2026-04-26 (post-merge MP-S-INDEX + SEED-DEMO)

> Synthèse Doc + Code + État des branches. Document de travail de pilotage pour orchestrer les prochains lots Claude Code. Référence canonique : voir `13-contexte-canonique-marketplace.md`.

> **Dernière mise à jour** : post-merge SEED-DEMO. Main HEAD = **`9f9fddd`**. Pré-prod déployée et **base peuplée** : 4 sellers `APPROVED` visibles sur `/marketplace/sellers`, 8 produits `PUBLISHED` en base mais **non visibles au catalog public** (gate `findProductsWithPrimaryMedia` exige un `MediaAsset PRIMARY APPROVED` que le seed ne crée pas — comportement légitime "no image, no listing"). Le catalog se peuplera naturellement quand des sellers uploaderont des images via `InlineMediaUploader` (FP-3.1).

## 1. Stack & monorepo

- **pnpm workspaces + Turbo**, Node ≥ 20, pnpm ≥ 9
- `apps/backend` — NestJS, Prisma 5, PostgreSQL
- `apps/frontend` — Next.js (App Router), Vitest, controlled state (pas de react-hook-form)
- `packages/shared`
- `prisma/schema.prisma` (1 359 lignes) à la racine, partagé par les deux apps

Scripts à connaître :

```bash
pnpm dev                     # turbo run dev
pnpm build / lint / test     # turbo
pnpm db:generate / db:migrate / db:migrate:status / db:studio / db:seed
pnpm preflight               # node scripts/preflight.mjs
```

Commandes santé recommandées (cf. handoff 2026-04-26) :

```bash
pnpm --filter @iox/backend  exec tsc --noEmit
pnpm --filter @iox/backend  test
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec next lint
pnpm --filter @iox/frontend exec vitest run
```

## 2. État des branches au 2026-04-26 (post-merge méga-mandat 6h)

| Branche                                | Base | Pushed  | État                    | Contenu                                                                         |
| -------------------------------------- | ---- | ------- | ----------------------- | ------------------------------------------------------------------------------- |
| `main`                                 | —    | ✅      | **stable, à `00ac8aa`** | Lot-8 + Lot-9 + FP-1 + FP-2 + FP-3 + FP-4 + FP-2.1 + FP-3.1 + FP-6 + 2 handoffs |
| `fp-3-seller-self-edit`                | —    | ✅      | **mergée + supprimée**  | PR #3, squash `c120870`                                                         |
| `fp-4-seasonality-seller-input`        | —    | ✅      | **mergée + supprimée**  | PR #4, squash `0cbe29d`                                                         |
| `fp-2-1-seller-certifications-edition` | —    | ✅      | **mergée + supprimée**  | PR #5, squash `df4cab3`                                                         |
| `fp-3-1-seller-media-uploader`         | —    | ✅      | **mergée + supprimée**  | PR #6, squash `d571d31` (+micro-fix TS post-rebase)                             |
| `fp-6-product-fine-origin`             | —    | ✅      | **mergée + supprimée**  | PR #7, squash `0dc448d`                                                         |
| `mp-s-index-public-seller-directory`   | —    | ✅      | **mergée + supprimée**  | PR #8, squash `3c00c6f`                                                         |
| `seed-demo-marketplace-fixtures`       | —    | ✅      | **mergée + supprimée**  | PR #9, squash `9f9fddd`                                                         |
| `fp-1-seasonality`                     | main | ✅      | legacy locale           | contenu désormais sur main via squash FP-3                                      |
| `fp-2-certifications`                  | main | ❌      | legacy locale           | contenu désormais sur main via squash FP-3                                      |
| `lot-7-bis`, `lot-8`, `lot-9`          | main | partiel | legacy locales          | déjà mergées historiquement                                                     |

Tests au dernier merge : backend **453/453**, frontend **140/140**, lint 0/0, tsc strict clean, **CI GitHub verte sur les 5 PR** (#3, #4, #5, #6, #7).

### Migrations actuelles (`prisma/migrations/`)

```
20260421000000_init
20260423000000_add_user_company_memberships
20260424180500_add_marketplace
20260425000000_add_idempotency_keys
20260425010000_add_revoked_refresh_tokens
20260425020000_add_marketplace_product_seasonality      ← FP-1
20260425030000_add_marketplace_certifications           ← FP-2
20260426010000_add_marketplace_product_fine_origin      ← FP-6
```

Toutes les migrations marketplace sont strictement additives.

### Hotfixes CI inclus dans le squash FP-3 (`c120870`)

- **Prisma drift** : ajout de `map: "uniq_certification_scope_type_code"` sur le `@@unique` de `MarketplaceCertification`. Le `name:` Prisma renomme l'identifiant côté Prisma Client mais pas la contrainte SQL — la migration nommait explicitement la contrainte, d'où le drift détecté par `migrate diff`. Corrigé.
- **SSR crash E2E** : coercion défensive `Array.isArray(...) ? ... : []` en tête de `SeasonalityCalendar` pour gérer les enums Prisma potentiellement `undefined` côté SSR.

### Note sur le squash FP-3

Le squash `c120870` ("FP-3 auto-édition profil vendeur (#3)") contient en réalité **FP-1 + FP-2 + FP-3** : la branche `fp-3-seller-self-edit` partait d'un main qui n'avait pas encore mergé FP-1/FP-2 (branches non poussées). Le squash a tout embarqué. Titre légèrement trompeur, contenu correct et complet.

### Branches résiduelles locales à nettoyer (optionnel)

```bash
git branch -D fp-1-seasonality fp-2-certifications lot-7-bis lot-8 lot-9
git remote prune origin
```

À faire après confirmation de la santé de main, sans urgence.

## 3. Schéma Prisma marketplace — entités et enums

### Entités (lignes 886-1356 de `prisma/schema.prisma`)

| Entité                                 | Rôle                                                           |
| -------------------------------------- | -------------------------------------------------------------- |
| `SellerProfile`                        | identité vendeur (extension d'une `Company`)                   |
| `MarketplaceCategory`                  | arborescence de catégories                                     |
| `MarketplaceProduct`                   | fiche produit structurelle (porte saisonnalité FP-1)           |
| `MarketplaceOffer`                     | déclinaison commerciale (prix, MOQ offre, leadTime, incoterm…) |
| `MarketplaceOfferBatch`                | pont offer ↔ `ProductBatch` (traçabilité + stock)              |
| `MarketplaceDocument`                  | projection documentaire avec visibilité et validité            |
| `Certification`                        | FP-2, table polymorphe `(relatedType, relatedId)`              |
| `MediaAsset`                           | médias polymorphes                                             |
| `QuoteRequest` + `QuoteRequestMessage` | RFQ                                                            |
| `MarketplaceReviewQueue`               | review queue admin                                             |
| `IdempotencyKey`                       | Lot-9                                                          |
| `RevokedRefreshToken`                  | Lot-9                                                          |

### Enums clés

- `SellerProfileStatus` : DRAFT, PENDING_REVIEW, APPROVED, SUSPENDED, REJECTED
- `MarketplacePublicationStatus` : DRAFT, IN_REVIEW, APPROVED, PUBLISHED, SUSPENDED, REJECTED, ARCHIVED
- `ExportReadinessStatus` : NOT_ELIGIBLE, INTERNAL_ONLY, PENDING_DOCUMENTS, PENDING_QUALITY_REVIEW, EXPORT_READY, EXPORT_READY_WITH_CONDITIONS
- `MarketplacePriceMode` : FIXED, QUOTE_ONLY, FROM_PRICE
- `MarketplaceVisibilityScope` : PRIVATE, BUYERS_ONLY, PUBLIC
- `MarketplaceDocumentVisibility` : PRIVATE, BUYER_ON_REQUEST, PUBLIC
- `MarketplaceVerificationStatus` : PENDING, VERIFIED, REJECTED, EXPIRED
- `CertificationType` : 14 valeurs (BIO_EU, BIO_USDA, ECOCERT, FAIRTRADE, RAINFOREST_ALLIANCE, HACCP, ISO_22000, ISO_9001, GLOBALGAP, BRC, IFS, KOSHER, HALAL, OTHER)
- `SeasonalityMonth` : JAN…DEC
- `MarketplaceRelatedEntityType` : SELLER_PROFILE, MARKETPLACE_PRODUCT, MARKETPLACE_OFFER, PRODUCT_BATCH

### Migrations (8)

```
20260421000000_init
20260423000000_add_user_company_memberships
20260424180500_add_marketplace
20260425000000_add_idempotency_keys
20260425010000_add_revoked_refresh_tokens
20260425020000_add_marketplace_product_seasonality      ← FP-1
20260425030000_add_marketplace_certifications           ← FP-2
```

## 4. Modules NestJS marketplace

`apps/backend/src/` :

| Module                       | Rôle                                         |
| ---------------------------- | -------------------------------------------- |
| `seller-profiles`            | CRUD profil + `findMine`/`updateMine` (FP-3) |
| `marketplace-products`       | CRUD fiche produit + saisonnalité (FP-1)     |
| `marketplace-offers`         | CRUD offres commerciales                     |
| `marketplace-certifications` | CRUD + verification (FP-2)                   |
| `marketplace-documents`      | CRUD + visibility                            |
| `marketplace-review`         | review queue admin                           |
| `marketplace-catalog`        | projection publique filtrée                  |
| `media-assets`               | CRUD média + moderation                      |
| `quote-requests`             | RFQ                                          |

(Modules métier MCH également présents : `beneficiaries`, `companies`, `products`, `supply-contracts`, `inbound-batches`, `transformation-operations`, `product-batches`, `label-validations`, `market-release-decisions`, `incidents`, `documents`, `distributions`, `traceability`, `audit`, etc. — hors périmètre marketplace au sens strict.)

## 5. Surfaces frontend Next.js

Trois surfaces, conformes au principe seller / admin / public.

### Public — `apps/frontend/src/app/marketplace/`

- `/marketplace` (page + layout) — vitrine publique
- `/marketplace/products` + `/marketplace/products/[slug]` — catalogue + fiche produit publique
- `/marketplace/sellers` + `/marketplace/sellers/[slug]` — fiches seller publiques
- `/marketplace/favorites`

### Seller (authentifié) — `apps/frontend/src/app/(dashboard)/seller/`

- `/seller/dashboard`
- `/seller/profile/edit` — **FP-3 livré**
- `/seller/marketplace-products` — **FP-4 livré (page index)**
- `/seller/marketplace-products/[id]/seasonality` — **FP-4 livré**
- `/seller/documents` + `/seller/documents/[relatedType]`

### Admin (authentifié) — `apps/frontend/src/app/(dashboard)/admin/`

- `/admin/review-queue`
- `/admin/sellers`
- `/admin/rfq`
- `/admin/users`
- `/admin/memberships`
- `/admin/diagnostics`

### Hub interne

- `/marketplace-hub` (dashboard interne)

## 6. Mapping fiche produit v2 → schéma réel

Référence : `11-fiche-produit-seller-v2.md` et `12-fiche-produit-schema-json.json`.

| Section v2        | Champ v2                                       | Présence Prisma | Entité                                                                |
| ----------------- | ---------------------------------------------- | --------------- | --------------------------------------------------------------------- |
| 1. Identité       | commercialName                                 | ✅              | `MarketplaceProduct.commercialName`                                   |
|                   | regulatoryName                                 | ✅              | `MarketplaceProduct.regulatoryName`                                   |
|                   | slug                                           | ✅              | `MarketplaceProduct.slug`                                             |
|                   | category                                       | ✅              | `MarketplaceProduct.categoryId`                                       |
|                   | subcategory                                    | ✅              | via `MarketplaceCategory.parentId` (arborescence)                     |
|                   | descriptionShort                               | ✅              | `MarketplaceProduct.descriptionShort`                                 |
|                   | descriptionLong / story                        | ✅              | `MarketplaceProduct.descriptionLong` (✅), `SellerProfile.story` (✅) |
|                   | originCountry / originRegion                   | ✅              | `MarketplaceProduct.originCountry / originRegion`                     |
|                   | **originLocality (terroir)**                   | ❌              | — manque                                                              |
|                   | altitude / gpsCoordinates                      | ❌              | — manque                                                              |
| 2. Saisonnalité   | isYearRound, harvestMonths, availabilityMonths | ✅ FP-1         | `MarketplaceProduct`                                                  |
| 3. Volumes        | MOQ producteur                                 | ✅              | `MarketplaceProduct.minimumOrderQuantity`                             |
|                   | MOQ offre                                      | ✅              | `MarketplaceOffer.moq`                                                |
|                   | availableQuantity                              | ✅              | `MarketplaceOffer.availableQuantity`                                  |
|                   | **annualProductionCapacity + unit**            | ❌              | — manque (FP-5 candidat)                                              |
|                   | **restockFrequency**                           | ❌              | — manque                                                              |
| 4. Prix           | priceMode                                      | ✅              | `MarketplaceOffer.priceMode` (FIXED/QUOTE_ONLY/FROM_PRICE)            |
|                   | unitPrice / currency                           | ✅              | `MarketplaceOffer.unitPrice / currency`                               |
|                   | priceUnit                                      | ⚠️              | `MarketplaceProduct.defaultUnit` (à clarifier vs offer)               |
| 5. Certifications | type, issuingBody, code, validUntil, doc       | ✅ FP-2         | `Certification`                                                       |
| 6. Qualité        | storageConditions, shelfLifeInfo               | ✅              | `MarketplaceProduct`                                                  |
|                   | usageTips / packagingDescription               | ✅              | `MarketplaceProduct`                                                  |
|                   | **technicalSpecifications structurées**        | ❌              | — manque (champ libre seulement)                                      |
|                   | **qualityAttributes[]**                        | ❌              | — manque                                                              |
|                   | allergenInfo / nutritionInfoJson               | ✅              | `MarketplaceProduct`                                                  |
| 7. Logistique     | leadTimeDays                                   | ✅              | `MarketplaceOffer.leadTimeDays`                                       |
|                   | incoterm                                       | ✅              | `MarketplaceOffer.incoterm`                                           |
|                   | destinationMarkets                             | ✅              | `MarketplaceOffer.destinationMarketsJson`                             |
|                   | departureLocation                              | ✅              | `MarketplaceOffer.departureLocation`                                  |
|                   | **packaging formats[]**                        | ❌              | — manque (champ libre)                                                |
|                   | **temperatureRequirements**                    | ❌              | — manque                                                              |
|                   | **grossWeight / netWeight / palletization**    | ❌              | — manque                                                              |
| 8. Médias et docs | mediaAssets                                    | ✅              | `MediaAsset` (PRIMARY, GALLERY, PACKAGING, LABEL, LOGO, BANNER…)      |
|                   | documents                                      | ✅              | `MarketplaceDocument` (PRIVATE / BUYER_ON_REQUEST / PUBLIC)           |

### Champs côté `SellerProfile` (capacités globales export)

✅ supportedIncoterms, destinationsServed, averageLeadTimeDays, languages, salesEmail, salesPhone, website, country, region, cityOrZone, story, descriptionShort, descriptionLong, logoMediaId, bannerMediaId, isFeatured, status (DRAFT/PENDING_REVIEW/APPROVED/SUSPENDED/REJECTED).

## 7. Lots livrés et lots candidats

### Livrés et déjà sur main (origin/main à jour, HEAD = `00ac8aa`)

- **Lot-8** + **Lot-9** (durcissement : idempotence, refresh tokens, métriques auth, drills DR, confirmations destructives, notifications d'erreur)
- **FP-1** — Saisonnalité produit (modèle + projection publique + calendrier)
- **FP-2** — Certifications structurées (table polymorphe + UI staff)
- **FP-3** — Auto-édition profil vendeur (`/seller/profile/edit` + `GET/PATCH /marketplace/seller-profiles/me`) — squash `c120870` (PR #3)
- **FP-4** — SeasonalityPicker côté seller (`/seller/marketplace-products/[id]/seasonality`) — squash `0cbe29d` (PR #4)
- **FP-2.1** — Édition certifications par seller (composant `SellerCertificationsManager` + 2 pages + helper API + 15 tests) — squash `df4cab3` (PR #5)
- **FP-3.1** — Uploader inline logo + bannière (composant `InlineMediaUploader` + helper multipart + intégration `/seller/profile/edit` + 8 tests) — squash `d571d31` (PR #6)
- **FP-6** — Origine fine produit (`originLocality`, `altitudeMeters`, `gpsLat`, `gpsLng` + projection publique + lien Maps) — squash `0dc448d` (PR #7)

### Candidats nouveaux lots (déduits du mapping fiche v2, à venir)

- **FP-5** — Volumes / capacités : refacto `defaultUnit` + `minimumOrderQuantity` vers tuple typé, **et probablement ajout `annualProductionCapacity` + `restockFrequency`** pour boucler la fiche produit v2
- **FP-7 candidat** — Qualité structurée : `qualityAttributes[]` (enum + table polymorphe ?), structuration `technicalSpecifications`
- **FP-8 candidat** — Logistique structurée : `packagingFormats[]`, `temperatureRequirements`, `grossWeight`/`netWeight`/`palletization`
- **MP-S-INDEX** — Page index publique `/marketplace/sellers` (actuellement 404)
- **MP-EDIT-PRODUCT** — Écran d'édition produit complet (pour exposer côté seller les champs FP-6 et autres dispos en backend)
- **PAY-1** (chantier majeur) — Paiement en ligne MVP, voir `30-etude-paiement-en-ligne-marketplace.md`

### Reste à faire post-FP-2.1/3.1/6 (smoke tests à exécuter)

D'après les bodies de PR pré-rédigés :

- [ ] FP-2.1 : seller crée une certif BIO_EU (PENDING), staff verify (VERIFIED), seller modifie (re-PENDING), buyer 403 sur POST.
- [ ] FP-3.1 : seller upload logo PNG <5 Mo (OK), >5 Mo (refus client), .gif (refus MIME), buyer 403 sur upload.
- [ ] FP-6 : produit avec coords GPS valides → ok ; gpsLat seul sans gpsLng → 400 ; section "Origine détaillée" présente sur fiche publique si ≥ 1 champ ; absente sinon.

## 8. Documentation interne du repo

Fichiers déjà tenus dans `docs/` (à connaître avant tout prompt) :

- `docs/MARKETPLACE.md`
- `docs/MARKETPLACE_SELLER_GO_LIVE.md`
- `docs/marketplace/SELLER_PROFILE.md` ← MAJ FP-3
- `docs/marketplace/MARKETPLACE_PRODUCT_SEASONALITY.md` ← FP-1 + FP-4
- `docs/marketplace/V1-CLOSURE-REPORT.md`
- `docs/marketplace/V2-PROGRESS-REPORT.md`
- `docs/marketplace/V2-ROADMAP-REPORT.md`
- `docs/admin/AUTONOMOUS-RUN-REPORT.md`
- `docs/frontend/DESIGN-SYSTEM.md`
- `docs/OBSERVABILITY.md`, `docs/SECRETS.md`, `docs/STABILIZATION.md`, `docs/PREPROD.md`
- `docs/GO-LIVE-CHECKLIST.md`, `docs/GO-LIVE-REPORT.md`
- `docs/MEMBERSHIPS_OPERATIONS.md`
- `docs/adr/` — décisions architecture
- `docs/design-system/`

`notes/fp-3-plan.md`, `notes/fp-4-plan.md`, `notes/handoff-2026-04-26.md` — plan de session et handoff.

## 9. Décisions transverses à respecter (cf. handoff)

1. **Pas de `react-hook-form`** : controlled state partout.
2. **Routes Nest** : `/me` enregistré avant `:id`.
3. **Auto-édition seller** : `slug`, `legalName`, `status`, `isFeatured`, `companyId` bloqués par `whitelist + forbidNonWhitelisted`.
4. **Bascule vitrine** APPROVED → PENDING_REVIEW préservée à chaque update qui peut affecter la projection publique.
5. **Conventional commits** : `feat(scope): ...`, `feat(backend|frontend|marketplace): ...`, `docs(marketplace|notes): ...`, `test(...): ...`.
6. **Migrations Prisma** : additives, non destructives uniquement.
7. **Tests obligatoires** sur règles critiques (validation marché, certifs, projections publiques).

## 10. Ce qu'il reste à clarifier avec moi

- État du **VPS de test** — bloqué côté réseau dans mon environnement. À résoudre par : whitelist du domaine, ou bien tu me copies/colles l'output de quelques pages clés, ou bien on s'en passe et je vérifie plus tard.
- **Priorité d'enchaînement** : FP-3 / FP-4 sont prêts mais non poussés. Question stratégique → on pousse / merge avant d'attaquer un nouveau lot, ou on continue à empiler localement ?
- **Choix du prochain lot** : parmi les 6 candidats (FP-2.1, FP-3.1, FP-5, FP-6, FP-7, FP-8), lequel attaquer en priorité ?

## 11. Workflow proposé pour les prompts Claude Code

À partir de maintenant, pour chaque lot, je peux te produire les artefacts suivants :

1. **Prompt de cadrage** — analyse du périmètre, mapping seller/admin/public, gates métier, écarts code/doc.
2. **Prompt de codage** — instructions chirurgicales pour Claude Code, branche, scope, garde-fous, fichiers attendus.
3. **Prompt de tests** — couverture cible, cas limites, données de test.
4. **Prompt de rapport** — format de handoff aligné sur `notes/handoff-*.md` existant.
5. **Mega-prompt de run autonome** — version 6h pour empiler plusieurs sous-lots.

Tous citent en tête le contexte canonique (`13-contexte-canonique-marketplace.md`).

Et je peux relire les diffs / handoff Claude Code après run, et tenir un journal d'avancement projet mis à jour dans ce dossier `docs-projet/`.
