# MP-OFFER-VIEW — Lecture détaillée d'une offre côté seller

Lot **strictement frontend** : ajoute deux pages seller pour lister et
consulter les offres marketplace. Aucune modification backend, aucune
modification de DTO.

## Périmètre

| Page | Route | Mode |
|------|-------|------|
| Index | `/seller/marketplace-offers` | Lecture liste paginée |
| Détail | `/seller/marketplace-offers/[id]` | Lecture seule |

L'édition (PATCH, création, soumission) est introduite par le lot suivant
**MP-OFFER-EDIT-1**.

## Helper API `apps/frontend/src/lib/marketplace-offers.ts`

- Type `MarketplaceOfferDetail` aligné sur `OFFER_INCLUDE` backend
  (`apps/backend/src/marketplace-offers/marketplace-offers.service.ts`).
- Méthodes en lecture :
  - `marketplaceOffersApi.listMine(token, params)` → `GET /marketplace/offers`
  - `marketplaceOffersApi.getById(id, token)` → `GET /marketplace/offers/:id`
- Le scope seller est appliqué automatiquement par le backend via
  `SellerOwnershipService.scopeSellerProfileFilter` — aucune logique de
  filtrage côté frontend.

## Sections lecture sur la fiche détail

1. **Identité** — `title`, `shortDescription`.
2. **Produit lié** — `marketplaceProduct.commercialName` + lien
   `/seller/marketplace-products/[mpId]`, slug et statut produit.
3. **Prix** — `priceMode`, `unitPrice`, `currency`, `moq`, `availableQuantity`.
4. **Disponibilité** — `availabilityStart`, `availabilityEnd`, `leadTimeDays`.
5. **Logistique commerciale** — `incoterm`, `departureLocation`,
   `destinationMarketsJson`.
6. **Visibilité** — `visibilityScope` (PUBLIC / BUYERS_ONLY / PRIVATE).
7. **Workflow** — `publicationStatus`, `exportReadinessStatus`, dates
   `submittedAt` / `approvedAt` / `publishedAt` / `suspendedAt`,
   `rejectionReason` si présent.

Banner publicationStatus identique au pattern produit
(`MP-EDIT-PRODUCT.1`) — mention explicite « lecture seule, édition
introduite par MP-OFFER-EDIT-1 ».

## Tests

- `apps/frontend/src/app/(dashboard)/seller/marketplace-offers/page.test.tsx` — 2 specs.
- `apps/frontend/src/app/(dashboard)/seller/marketplace-offers/[id]/page.test.tsx` — 4 specs.

## Hors périmètre

- Pas de création (LOT 2 : `/new`).
- Pas d'édition (LOT 2 : PATCH champs sûrs + soumission revue).
- Pas de gestion `MarketplaceOfferBatch` (rattachement lots — futur lot
  dédié).
- Pas de modification `visibilityScope` côté seller (futur lot).
- Approve / reject restent réservés staff.
