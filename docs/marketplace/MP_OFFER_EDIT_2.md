# MP-OFFER-EDIT-2 — Édition visibilité + UI batches

## Objectif

Étendre l'édition seller d'une offre marketplace :
1. Édition de `visibilityScope` (PUBLIC / BUYERS_ONLY / PRIVATE) avec
   garde-fou métier `PUBLISHED → PRIVATE` rejeté côté backend.
2. UI section "Lots rattachés" — list / attach / detach / toggle
   `exportEligible`.

## Backend

### Garde-fou visibilité

`MarketplaceOffersService.update()` rejette désormais avec
`BadRequestException` toute tentative de passer une offre `PUBLISHED`
en `PRIVATE`. Message :
> Une offre publiée ne peut pas passer en PRIVATE — utilisez Suspendre
> pour la retirer du catalogue.

Le seller doit utiliser le workflow `suspend` (avec raison auditée) qui
préserve l'audit trail. Les transitions `PUBLISHED → BUYERS_ONLY` et
`PUBLISHED → PUBLIC` restent autorisées et déclenchent la re-revue
staff (`IN_REVIEW`) comme tout changement de champ vitrine.

### `GET /marketplace/offers/:id/batches`

Endpoint dédié (`@Roles(SELLER_EDIT)`) qui retourne la liste des
`MarketplaceOfferBatch` rattachés, avec le `ProductBatch` joint
(`code`, `quantity`, `unit`, `productionDate`, `expiryDate`, `status`).
Ordre : `createdAt desc`.

Service : `MarketplaceOffersService.listOfferBatches(offerId, actor)`
— ownership check délégué à `SellerOwnershipService` comme les autres
opérations sur l'offre.

Les endpoints `attach`, `update`, `detach` existaient déjà.

## Frontend

### Helper `marketplaceOffersApi`

Nouvelles méthodes :
- `listBatches(offerId, token) → MarketplaceOfferBatchLink[]`
- `attachBatch(offerId, dto, token)`
- `updateBatch(linkId, dto, token)`
- `detachBatch(linkId, token)`

`UpdateMarketplaceOfferInput` accepte désormais `visibilityScope`.

### Page `/seller/marketplace-offers/[id]`

**Section "Visibilité" en mode édition** : `<select>` avec 3 options.
L'option `PRIVATE` est `disabled` quand `publicationStatus === PUBLISHED`
(garde-fou UX en plus du garde-fou backend).

**Section "Lots rattachés"** (toujours visible, lazy-load au mount) :
- Empty state si aucun lot.
- Tableau (Lot · Qté dispo · Export ? · Notes · Actions).
- Toggle `exportEligible` : clic sur le badge en mode édition →
  `updateBatch({ exportEligible: !current })`.
- Bouton "Détacher" en mode édition → `confirm` puis `detachBatch`.
- Formulaire "+ Rattacher un lot" en mode édition (productBatchId UUID,
  quantité, exportable, notes).

## Tests

### Backend (`marketplace-offers.service.spec.ts`)

4 nouveaux specs :
- `PUBLISHED → PRIVATE` rejeté (BadRequest)
- `PUBLISHED → BUYERS_ONLY` autorisé + IN_REVIEW recheck
- `DRAFT → PRIVATE` autorisé
- `listOfferBatches` retourne avec `productBatch` joint, orderBy
  `createdAt desc`

Total marketplace-offers backend : **43 specs passants**.

### Frontend (`seller/marketplace-offers/[id]/page.test.tsx`)

6 nouveaux specs :
- édition `visibilityScope` envoyée via `update()`
- option PRIVATE désactivée quand PUBLISHED
- section batches : empty state
- section batches : rendu d'un lot existant
- attach via formulaire
- detach après confirm

Total seller offer detail : **19 specs passants**.

```bash
pnpm --filter @iox/backend exec jest --testPathPattern marketplace-offers
# Tests: 43 passed
pnpm --filter @iox/frontend exec vitest run "marketplace-offers"
# Test Files: 3 passed — Tests: 25 passed
```

## Décisions

- **`PUBLISHED → PRIVATE` rejeté côté backend** : un retrait immédiat
  doit passer par `suspend` (avec raison auditée). Le garde-fou UX
  désactive l'option dans le `<select>`, le backend vérifie en
  défense en profondeur (toute tentative via API directe est rejetée).
- **`listOfferBatches` séparé de `findById`** : plus simple à
  paginer/limiter à l'avenir si une offre porte beaucoup de lots ;
  évite de gonfler `OFFER_INCLUDE`.
- **Toggle `exportEligible` cliquable mais pas d'édition fine de la
  qté** dans cette phase. L'édition complète d'un lien se fera dans
  une phase ultérieure (modal d'édition par ligne).
- **`productBatchId` saisi en UUID brut** : la phase 2 ajoutera un
  picker (combobox sur `/product-batches?status=CREATED`).

## Hors-scope

- Picker UX pour rattacher un lot (combobox produits).
- Édition fine de `quantityAvailable` / `notes` post-attach.
- Réservation/release de `quantityReserved` (workflow checkout futur).
- Bulk import / export CSV.
