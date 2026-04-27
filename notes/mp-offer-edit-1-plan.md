# MP-OFFER-EDIT-1 — Plan (LOT 2 mandate 14)

Branche `mp-offer-edit-1-create-and-update` depuis `mp-offer-view-1-seller-detail`.

## Objectif

Permettre au seller :
1. Créer un brouillon d'offre via `/seller/marketplace-offers/new`.
2. Éditer les champs commerciaux sûrs sur la page détail
   `/seller/marketplace-offers/[id]` (mode édition introduit ici).
3. Soumettre l'offre à validation staff via `POST /:id/submit`.

## Commits prévus

1. `chore(notes): plan MP-OFFER-EDIT-1`
2. `feat(frontend): MP-OFFER-EDIT-1 — helper API étendu (Create/Update + actions)`
3. `feat(frontend): MP-OFFER-EDIT-1 — page création seller offer (/new)`
4. `feat(frontend): MP-OFFER-EDIT-1 — édition + submit sur détail offer`
5. `test(frontend): MP-OFFER-EDIT-1 — couverture création + édition + submit`
6. `docs(marketplace): MP-OFFER-EDIT-1 — création + workflow soumission`

## Helper API

Type `UpdateMarketplaceOfferInput` strictement aligné sur
`UpdateMarketplaceOfferDto` backend :
`title, shortDescription, priceMode, unitPrice, currency, moq,
availableQuantity, availabilityStart, availabilityEnd, leadTimeDays,
incoterm, departureLocation, destinationMarketsJson`.

Champs **interdits** (non typés ici → tsc rejette à la compilation) :
`marketplaceProductId`, `sellerProfileId`, `visibilityScope`,
`exportReadinessStatus`, `publicationStatus`, `featuredRank`,
`rejectionReason`, `submittedAt`, `approvedAt`, `publishedAt`, `suspendedAt`.

Type `CreateMarketplaceOfferInput` extends `UpdateMarketplaceOfferInput`
+ `marketplaceProductId` requis + `sellerProfileId` requis + `title` requis +
`priceMode` requis (cf. DTO backend `CreateMarketplaceOfferDto`).
Note : `visibilityScope` est admis à la création par le DTO mais on ne
l'expose pas côté seller dans ce lot.

Méthodes : `create`, `update`, `submit`.

## Page `/new`

Pattern miroir `seller/marketplace-products/new/page.tsx` :
- Charge `sellerProfilesApi.getMine` pour résoudre `sellerProfileId`.
- Form simple : select sur produits marketplace du seller
  (`marketplaceProductsApi.listMine`) + `title` + `priceMode` + `unitPrice`
  conditionnel + `currency` + `moq` + `availableQuantity`.
- Submit → `POST /marketplace/offers` → redirection vers `/[id]`.

## Détail [id]

Compléter la page MP-OFFER-VIEW :
- Mode édition sur les champs autorisés (controlled state, dirty/diff).
- Bouton "Soumettre à validation" si `publicationStatus ∈ {DRAFT, REJECTED}`.
- Banner "modification déclenche revue" si `publicationStatus ∈ {APPROVED, PUBLISHED}`.
- Activer le bouton "Nouvelle offre" sur l'index (était grisé).

## Tests

- `/new` — 4 specs (formulaire, validation title, submit OK, hint conflit).
- `/[id]` édition — 5 specs (dirty/disabled, diff envoyé, validation, hint 403, banner status).
- Probe anti-`marketplaceProductId` via `__probe_offer__.ts` éphémère.

Cible +9 vitest.

## Doc

Compléter `docs/marketplace/MARKETPLACE_OFFER_SELLER.md` avec section
"Création + workflow soumission" + table d'allowed fields.

## Hors périmètre

- Pas de gestion `MarketplaceOfferBatch` (rattachement lots).
- Pas de modification `visibilityScope`.
- Pas d'archive (futur lot MP-OFFER-EDIT-2).
