# Édition seller d'un produit marketplace — MP-EDIT-PRODUCT.1

> Permet à un seller (`MARKETPLACE_SELLER`) d'éditer **lui-même** les champs
> textuels « sûrs » de ses produits marketplace, sans dépendre du staff IOX.

## Page

`/seller/marketplace-products/[id]` (client component, controlled state).

Accessible depuis l'index `/seller/marketplace-products` (lien **Détails**).

## Périmètre

### Champs édités (16, alignés `UpdateMarketplaceProductDto`)

| Section                        | Champ                  | Type    | Borne                     |
| ------------------------------ | ---------------------- | ------- | ------------------------- |
| Identité publique              | `commercialName`       | string  | required, 2–255           |
|                                | `regulatoryName`       | string? | max 255                   |
|                                | `subtitle`             | string? | max 255                   |
| Origine                        | `originCountry`        | string  | required, max 100         |
|                                | `originRegion`         | string? | max 100                   |
|                                | `originLocality` (FP-6)| string? | max 160                   |
|                                | `altitudeMeters` (FP-6)| int?    | 0–9000                    |
|                                | `gpsLat` (FP-6)        | float?  | -90..90, **pair imposée** |
|                                | `gpsLng` (FP-6)        | float?  | -180..180, **pair**       |
| Variétés et méthode            | `varietySpecies`       | string? | —                         |
|                                | `productionMethod`     | string? | —                         |
| Descriptions                   | `descriptionShort`     | string? | —                         |
|                                | `descriptionLong`      | string? | —                         |
|                                | `usageTips`            | string? | —                         |
| Conservation et conditionnement| `packagingDescription` | string? | —                         |
|                                | `storageConditions`    | string? | —                         |
|                                | `shelfLifeInfo`        | string? | —                         |
|                                | `allergenInfo`         | string? | —                         |

### Champs interdits (typés out)

Le type TypeScript `UpdateMarketplaceProductInput` (cf.
`apps/frontend/src/lib/marketplace-products.ts`) n'expose **aucun** des
champs ci-dessous. Toute tentative d'envoi via `marketplaceProductsApi.update`
est rejetée par `tsc` à la compilation, en plus du whitelist `class-validator`
côté backend.

| Champ                                              | Pourquoi interdit                            | Géré par                              |
| -------------------------------------------------- | -------------------------------------------- | ------------------------------------- |
| `slug`                                             | SEO + liens publics                          | Staff (lot ultérieur)                 |
| `categoryId`                                       | Taxonomie figée                              | Staff                                 |
| `productId`                                        | Lien immuable vers MCH Product               | —                                     |
| `sellerProfileId`                                  | Immuable (rattachement origin)               | —                                     |
| `mainMediaId`                                      | Upload + modération média                    | MP-EDIT-PRODUCT.3 (InlineMediaUploader) |
| `harvestMonths`, `availabilityMonths`, `isYearRound` | Workflow saisonnalité dédié                | `/seasonality` (FP-4)                 |
| `minimumOrderQuantity`, `defaultUnit`              | Liés aux offres / prix                       | FP-5                                  |
| `nutritionInfoJson`                                | JSON complexe                                | Lot dédié                             |
| `publicationStatus`, `submittedAt`, `approvedAt`, `publishedAt`, `rejectionReason`, `exportReadinessStatus`, `completionScore`, `complianceStatusSnapshot` | Workflow + scoring | Service backend uniquement            |

## Workflow de re-revue

Le backend (`MarketplaceProductsService.update`) déclenche automatiquement le
passage `APPROVED|PUBLISHED → IN_REVIEW` si certains champs vitrine
changent. La page affiche un **banner d'avertissement** dès que :

```
publicationStatus ∈ {APPROVED, PUBLISHED}  ET  dirty === true
```

Statuts `DRAFT`, `IN_REVIEW`, `REJECTED`, `SUSPENDED`, `ARCHIVED` n'affichent
pas le banner (pas de re-revue à craindre).

## Validation

### Côté UI (miroir DTO backend)

- `commercialName` : 2 ≤ longueur ≤ 255.
- `originCountry` : non vide, ≤ 100.
- `originLocality` : ≤ 160.
- `altitudeMeters` : entier 0..9000.
- `gpsLat` : nombre -90..90.
- `gpsLng` : nombre -180..180.
- **Pair GPS** : les deux ou aucun (sinon erreur visible avant submit).

Erreurs visibles côté UI dans la zone `validation-error` (jaune) avant
soumission, et `submit-error` (rouge) pour les erreurs renvoyées par le
backend (cohérence pair GPS rejouée côté serveur, autorisations, etc.).

### Côté backend

`UpdateMarketplaceProductDto` + `assertGpsPairCoherence` +
`assertMarketplaceProductOwnership`. Inchangés dans ce lot.

## Lecture seule (informationnel)

La page affiche également :

- **Statut publication** (badge couleur).
- **Slug** (info, non éditable).
- **Saisonnalité** (résumé + lien vers `/seasonality`).
- **MOQ + unité** (résumé, édition future via FP-5).

## Permissions

| Action                                        | Rôle requis           |
| --------------------------------------------- | --------------------- |
| `GET /marketplace/products/:id` (sa fiche)    | `MARKETPLACE_SELLER`  |
| `PATCH /marketplace/products/:id` (ses fiches)| `MARKETPLACE_SELLER`  |
| Idem produit hors périmètre seller            | → 403 backend         |

Le backend applique `SellerOwnershipService.assertMarketplaceProductOwnership`
sur PATCH ; un seller qui tente de modifier un produit qui n'est pas le sien
reçoit un 403 — l'UI affiche un hint explicite.

## Limites volontaires

- **Pas d'upload média** : `mainMediaId` reste géré via les écrans existants
  (`InlineMediaUploader` arrivera en MP-EDIT-PRODUCT.3).
- **Pas d'effacement explicite** d'`altitudeMeters` (le DTO accepte un
  nombre, pas `null`). Pour effacer, contacter le staff.
- **Pas d'édition `nutritionInfoJson`** : éditeur JSON dédié à venir.
- **Pas de bouton soumettre/archiver** : le workflow d'état (submit, approve,
  archive) sera couvert par MP-EDIT-PRODUCT.2.

## Smoke après déploiement

1. Login `smoke-seller@iox.mch` → naviguer vers `/seller/marketplace-products`.
2. Cliquer **Détails** sur un produit → page édition rendue, valeurs hydratées.
3. Modifier `descriptionShort` → bouton **Enregistrer** s'active → submit OK.
4. Saisir `gpsLat` seul → erreur `validation-error` (côté UI) ; saisir aussi
   `gpsLng` → submit OK.
5. Sur un produit `APPROVED`, vérifier le banner re-revue dès la 1ʳᵉ frappe.
6. Avec un compte buyer (`MARKETPLACE_BUYER` ou autre) : `GET /:id` → 403.

## Fichiers

```
apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.tsx       # Nouvelle page
apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/page.test.tsx  # 8 tests vitest
apps/frontend/src/lib/marketplace-products.ts                                     # update() + types
apps/frontend/src/app/(dashboard)/seller/marketplace-products/page.tsx            # +lien Détails
docs/marketplace/MARKETPLACE_PRODUCT_EDIT.md                                      # Ce fichier
```
