# MP-EDIT-PRODUCT.3-light — Plan (LOT 3 mandate 14)

Branche `mp-edit-product-3-light-main-media` depuis
`mp-offer-edit-1-create-and-update`.

## Objectif

Brancher l'`InlineMediaUploader` (FP-3.1) sur le `mainMediaId` du produit
marketplace côté seller, en assouplissant le contrat strict de
`UpdateMarketplaceProductInput` (MP-EDIT-PRODUCT.1) pour autoriser
`mainMediaId`.

## Commits prévus

1. `chore(notes): plan MP-EDIT-PRODUCT.3-light`
2. `feat(frontend): MP-EDIT-PRODUCT.3-light — autoriser mainMediaId dans UpdateMarketplaceProductInput`
3. `feat(frontend): MP-EDIT-PRODUCT.3-light — section image principale (InlineMediaUploader PRIMARY)`
4. `test(frontend): MP-EDIT-PRODUCT.3-light — couverture upload image produit (3 specs)`
5. `docs(marketplace): MP-EDIT-PRODUCT.3-light — image principale + comportement modération`

## Helper API

`apps/frontend/src/lib/marketplace-products.ts` :
- Ajouter `mainMediaId?: string | null` à `UpdateMarketplaceProductInput`.
- Ajouter le champ correspondant en lecture sur `SellerMarketplaceProduct`.
- Mettre à jour le commentaire en tête : `mainMediaId` est désormais
  **autorisé** (assouplissement explicite du contrat MP-EDIT-PRODUCT.1).

## Section UI sur `[id]/page.tsx`

Insérer une section "Image principale (FP-3 / MP-EDIT-PRODUCT.3-light)"
juste après la section "Identité publique". Composant :
`<InlineMediaUploader relatedType="MARKETPLACE_PRODUCT" role="PRIMARY"
relatedId={product.id} currentMediaId={product.mainMediaId ?? null} />`.

Le callback `onUploaded(mediaId, role)` :
1. PATCH `/marketplace/products/:id` avec `{ mainMediaId: mediaId }`.
2. Re-hydratation locale du produit via `getById`.

## Backend

**Aucune modification.** La modération existe déjà côté admin. Le
comportement attendu est documenté :
- L'upload arrive en `moderationStatus: PENDING`.
- Le catalog public requiert `APPROVED` → produit "disparait" du catalog
  jusqu'à approbation staff.
- Pas un bug, comportement volontaire.

## Tests

- 3 specs vitest sur la section image (rendu, upload simulé, PATCH appelé).

## Doc

`docs/marketplace/MARKETPLACE_PRODUCT_EDIT.md` (ou cohérent avec doc
MP-EDIT-PRODUCT.1) : section "Image principale" + note explicite
modération PENDING/APPROVED.
