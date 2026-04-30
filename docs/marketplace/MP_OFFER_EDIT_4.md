# MP-OFFER-EDIT-4 — Picker batch combobox

Remplace l'input UUID brut par un combobox qui affiche les
ProductBatches éligibles à attacher (status CREATED, non déjà attachés
à cette offre, max 50). Backend dédié.

## Backend

### Endpoint

`GET /api/v1/marketplace/offers/:id/available-batches?search=<code>` —
`@Roles(SELLER_EDIT)` (ADMIN/COORDINATOR/MARKETPLACE_SELLER) + ownership
check sur l'offre.

### Service

`MarketplaceOffersService.listAvailableBatches(offerId, search?, actor)` :
- ownership check (assertMarketplaceOfferOwnership)
- récupère les `productBatchId` déjà attachés à l'offre
- filtre `ProductBatch` : `status: 'CREATED'`, `deletedAt: null`,
  exclut les ids attachés, optionnel `code contains` insensible
- orderBy `createdAt desc`, take 50
- select restreint (id, code, quantity, unit, productionDate,
  expiryDate, status)

### Limitation reconnue

ProductBatch n'a pas de relation directe `sellerProfileId` dans le modèle
Prisma actuel. Le scope ownership est donc relatif à l'offre (le seller
doit posséder l'offre cible, vérifié via `assertMarketplaceOfferOwnership`).
Tous les ProductBatches restent visibles. V2 (MP-OFFER-EDIT-5+)
introduira potentiellement un scope strict si le modèle évolue.

## Frontend

### Helper

`marketplaceOffersApi.listAvailableBatches(offerId, token, search?)` :
- GET avec query `?search=...` URL-encoded.
- Retour `Array<{ id, code, quantity, unit, productionDate, expiryDate, status }>`.

### UI

Page `/seller/marketplace-offers/[id]` :
- État `availableBatches: Array` ajouté dans `BatchesSection`.
- `useEffect` dépendant de `showAttach` : load au moment de l'ouverture
  du formulaire (pas avant — économise une requête).
- Le `<input type="text">` ID lot UUID devient `<select>` avec :
  - 1ère option vide ("— Sélectionner un lot —")
  - Une option par batch éligible : `{code} ({quantity} {unit})`

Le reste du formulaire (qty, exportable, notes, submit/cancel)
inchangé.

## Tests

### Backend

3 nouveaux specs `listAvailableBatches` :
- non-attachés (`notIn` excludeIds présent)
- search code contains insensitive
- aucun batch attaché → pas de `notIn` dans where

Total `marketplace-offers.service.spec` : **46 specs passants** (43 + 3).

### Frontend

2 nouveaux specs MP-OFFER-EDIT-4 :
- attach via combobox (au lieu d'UUID brut)
- picker affiche les options après load

Total seller offer detail : **24 specs passants** (23 + 1 nouveau,
1 modifié).

```bash
pnpm --filter @iox/backend exec jest --testPathPattern marketplace-offers
# Tests: 46 passed

pnpm --filter @iox/frontend exec vitest run "src/app/(dashboard)/seller/marketplace-offers"
# Test Files 3 passed — Tests 30 passed
```

## Décisions

- **Lazy-load** au showAttach : évite charge inutile à l'ouverture de
  la page (la liste batches peut être grande).
- **Cap 50** : suffisant pour un combobox ; au-delà, ajouter un champ
  search côté UI (V2).
- **Pas de search input** côté UI dans cette phase : le `<select>` simple
  suffit pour les volumes typiques V1. V2 ajoutera un combobox autocomplete
  (Combobox Radix / Headless UI).
- **Pas de scope strict ProductBatch ↔ seller** : limitation du modèle
  Prisma documentée.

## Hors scope (MP-OFFER-EDIT-5+)

- Combobox autocomplete avec recherche côté UI.
- Scope strict ProductBatch ↔ SellerProfile (refactor schema).
- Création d'un nouveau ProductBatch from scratch depuis le picker.
- Filtre par status (autre que CREATED) ou par produit (Product).
