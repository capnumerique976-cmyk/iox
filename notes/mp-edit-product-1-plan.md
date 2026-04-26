# MP-EDIT-PRODUCT.1 — plan

Branche : `mp-edit-product-1-seller-edit-safe-fields` depuis `main` à `9f9fddd`.

## Objectif

Page seller `/seller/marketplace-products/[id]/page.tsx` — détail + édition des
champs textuels sûrs uniquement. Aucune touche backend.

## Étapes (commits atomiques)

1. `chore(notes): plan MP-EDIT-PRODUCT.1`
2. `feat(frontend): MP-EDIT-PRODUCT.1 — étendre marketplace-products API helper
   (UpdateMarketplaceProductInput strict, getById enrichi, update PATCH)`
3. `feat(frontend): MP-EDIT-PRODUCT.1 — page détail/édition seller produit
   marketplace (4 sections, banner re-revue, validation pair GPS)`
4. `test(frontend): MP-EDIT-PRODUCT.1 — vitest page édition (≥6 tests)`
5. `feat(frontend): MP-EDIT-PRODUCT.1 — lien Détails dans index seller produits`
6. `docs: MP-EDIT-PRODUCT.1 — runbook édition seller`
7. `chore(notes): handoff MP-EDIT-PRODUCT.1`

## Champs autorisés (16, alignés DTO backend)

Identité : `commercialName` (req, min 2), `regulatoryName?`, `subtitle?`.
Origine : `originCountry` (req), `originRegion?`, `originLocality?` (max 160),
`altitudeMeters?` (int 0-9000), `gpsLat?` (-90..90), `gpsLng?` (-180..180,
**pair imposé**).
Variétés : `varietySpecies?`, `productionMethod?`.
Descriptions : `descriptionShort?`, `descriptionLong?`, `usageTips?`.
Conservation : `packagingDescription?`, `storageConditions?`, `shelfLifeInfo?`,
`allergenInfo?`.

## Champs interdits (typés out of UpdateMarketplaceProductInput)

`slug`, `categoryId`, `productId`, `sellerProfileId`, `mainMediaId`,
`harvestMonths`, `availabilityMonths`, `isYearRound`, `minimumOrderQuantity`,
`defaultUnit`, `nutritionInfoJson`, `publicationStatus`, `submittedAt`,
`approvedAt`, `publishedAt`, `rejectionReason`, `exportReadinessStatus`,
`completionScore`, `complianceStatusSnapshot`. Affichés en lecture seule pour
ceux qui ont du sens (seasonality preview, MOQ/unit, statuts).

## Pattern

Miroir de `apps/frontend/src/app/(dashboard)/seller/profile/edit/page.tsx` :
client component, controlled state, `dirty` via JSON.stringify, `buildPayload`
diff minimal, validation client miroir DTO, `Section`/`Field` helpers.

Banner re-revue si `publicationStatus ∈ {APPROVED, PUBLISHED}` ET `dirty`.

## Hors-scope

- Création produit (`/new`) → MP-EDIT-PRODUCT.2.
- Workflow submit/approve/archive depuis l'UI → MP-EDIT-PRODUCT.2.
- `mainMediaId` via InlineMediaUploader → MP-EDIT-PRODUCT.3.
- E2E Playwright → couvert par vitest.
