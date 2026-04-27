# MP-OFFER-VIEW — Plan (LOT 1 mandate 14)

Branche `mp-offer-view-1-seller-detail` depuis `main` à `0c2a385`.

## Objectif

Donner au seller la possibilité de **voir ses offres** dans l'UI. Backend
déjà câblé (`GET /marketplace/offers`, `GET /marketplace/offers/:id` avec
scope automatique). Aucune action d'édition dans ce LOT.

## Commits prévus

1. `chore(notes): plan MP-OFFER-VIEW`
2. `feat(frontend): MP-OFFER-VIEW — helper API marketplace-offers (lecture)`
3. `feat(frontend): MP-OFFER-VIEW — page index seller offers + lien dashboard`
4. `feat(frontend): MP-OFFER-VIEW — page détail seller offer (lecture seule)`
5. `test(frontend): MP-OFFER-VIEW — couverture index + détail`
6. `docs(marketplace): MP-OFFER-VIEW — contrat lecture seller`

## Helper API

Type `MarketplaceOfferDetail` aligné sur `OFFER_INCLUDE` backend
(marketplaceProduct embarqué + sellerProfile embarqué + `_count`).
Méthodes : `listMine(token, params)`, `getById(id, token)`. Pas d'écriture
côté lib dans ce lot.

## Page index `/seller/marketplace-offers`

Pattern miroir `/seller/marketplace-products/page.tsx`. Bouton
"Nouvelle offre" **désactivé** (`<button disabled>`) avec tooltip
« Création disponible au prochain lot ». 1 ligne par offre, badge
publicationStatus, lien détail.

## Page détail `/seller/marketplace-offers/[id]`

**Lecture seule** dans ce lot. Sections :

1. Identité (title, shortDescription)
2. Lien produit (commercialName + lien `/seller/marketplace-products/<mpId>`)
3. Prix (priceMode, unitPrice, currency, moq, availableQuantity)
4. Disponibilité (availabilityStart/End, leadTimeDays)
5. Logistique commerciale (incoterm, departureLocation, destinationMarketsJson)
6. Visibilité (visibilityScope)
7. Workflow (publicationStatus, exportReadinessStatus, dates submitted/approved/published)

Banner publicationStatus identique au pattern produit. Liens retour.

## Tests

- `page.test.tsx` index : 2 tests (rendu liste + état vide).
- `[id]/page.test.tsx` détail : 4 tests (hydratation, sections, banner, hint 403).

Cible +6 vitest.

## Doc

- `docs/marketplace/MARKETPLACE_OFFER_SELLER.md` (contrat lecture, hors scope édition).
