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

## MP-OFFER-EDIT-1 (LOT 2 mandat 14) — Création + édition + soumission

### Création `/seller/marketplace-offers/new`

Formulaire minimaliste. `sellerProfileId` est résolu via
`sellerProfilesApi.getMine` (auto). `marketplaceProductId` est sélectionné
parmi les produits du seller (`marketplaceProductsApi.listMine`).

Champs requis backend (`CreateMarketplaceOfferDto`) :
- `marketplaceProductId` (UUID), `sellerProfileId` (UUID)
- `title` (≥ 2 caractères, ≤ 255)

Champs optionnels initiaux : `priceMode` (défaut FIXED), `unitPrice`,
`currency` (défaut EUR), `moq`, `availableQuantity`.

Au submit OK → redirection vers `/seller/marketplace-offers/[id]` pour
compléter les autres champs.

### Édition `/seller/marketplace-offers/[id]` (mode édition)

Bouton **Éditer** bascule la page en mode édition. Champs autorisés
(strictement alignés sur `UpdateMarketplaceOfferDto` backend) :

| Champ | Type | Note |
|-------|------|------|
| `title` | string | ≥ 2 caractères |
| `shortDescription` | string | optionnel |
| `priceMode` | enum FIXED / FROM_PRICE / QUOTE_ONLY | |
| `unitPrice` | number ≥ 0 | non envoyé si vide |
| `currency` | string | upper-case côté UI |
| `moq` | number ≥ 0 | |
| `availableQuantity` | number ≥ 0 | |
| `availabilityStart` / `availabilityEnd` | date ISO | |
| `leadTimeDays` | int ≥ 0 | |
| `incoterm` | string | ex. `FOB` |
| `departureLocation` | string | |
| `destinationMarketsJson` | object | (lecture seule UI ce lot) |

### Champs INTERDITS en édition seller

Non typés dans `UpdateMarketplaceOfferInput` → **rejetés par tsc** à la
compilation :

- `marketplaceProductId` (immuable post-création — preuve par probe
  `__probe_offer__.ts` éphémère, cf. mandat 14).
- `sellerProfileId` (immuable, ownership).
- `visibilityScope` (workflow seller restreint, futur lot avec garde-fous).
- `exportReadinessStatus` (staff).
- `publicationStatus` (workflow géré par submit / approve / publish).
- `featuredRank`, `rejectionReason` (admin / staff).
- `submittedAt` / `approvedAt` / `publishedAt` / `suspendedAt` (server-managed).

### Workflow soumission

Bouton **Soumettre à validation** (`POST /:id/submit`) visible si
`publicationStatus ∈ { DRAFT, REJECTED }`. Au succès → l'offre passe en
`IN_REVIEW`, le bouton disparaît. Backend allowed transitions :
DRAFT|REJECTED → IN_REVIEW.

### Banner re-revue (édition)

Si l'offre est `APPROVED` ou `PUBLISHED` et que l'utilisateur modifie un
champ, un banner amber `data-testid="review-warning"` s'affiche pour
prévenir que la sauvegarde déclenchera une nouvelle revue staff (passage
en `IN_REVIEW`).

## Hors périmètre

- Pas de gestion `MarketplaceOfferBatch` (rattachement lots — futur lot
  dédié).
- Pas de modification `visibilityScope` côté seller (futur lot).
- Pas d'archive (futur lot MP-OFFER-EDIT-2).
- Approve / reject / publish restent réservés staff.
