# MP-EDIT-PRODUCT.2 — plan

Branche : `mp-edit-product-2-seller-create-and-workflow` depuis
`mp-edit-product-1-seller-edit-safe-fields` (HEAD `d31a5ff`).

## Objectif

Ajouter au seller :
- Page de création d'un produit marketplace en brouillon (`/new`).
- Actions submit (DRAFT/REJECTED → IN_REVIEW) et archive (* → ARCHIVED) sur
  la page détail livrée par MP-EDIT-PRODUCT.1.

## Étapes (commits atomiques)

1. `chore(notes): plan MP-EDIT-PRODUCT.2`
2. `feat(frontend): MP-EDIT-PRODUCT.2 — étendre helper marketplace-products
   (create + submit + archive + types stricts)`
3. `feat(frontend): MP-EDIT-PRODUCT.2 — page seller création produit`
4. `feat(frontend): MP-EDIT-PRODUCT.2 — actions submit + archive sur page détail`
5. `feat(frontend): MP-EDIT-PRODUCT.2 — bouton "Nouveau produit" sur index`
6. `docs: MP-EDIT-PRODUCT.2 — création + workflow soumission/archivage`

## Décisions

- **`sellerProfileId` auto-rempli** : on appelle `sellerProfilesApi.getMine(token)`
  au montage du formulaire `/new` pour récupérer l'id et le pré-remplir.
  Évite à l'utilisateur de manipuler des UUID.
- **`productId` (Product MCH)** : saisie manuelle d'un UUID — l'endpoint
  `GET /products` est fermé au rôle MARKETPLACE_SELLER (admin/coordinator
  uniquement). Documenté en limitation du lot — un picker visuel sera couvert
  par un futur lot qui ouvrira un endpoint dédié seller-scoped.
- **Slug auto-généré** depuis `commercialName` (côté client, kebab-case
  ASCII safe) mais éditable. Backend valide via regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- **Confirm dialogs** : réutilisation de `useConfirm` (Lot-9) — pas de
  nouvelle dépendance.
  - Submit : tone `warning`, titre "Soumettre à la revue qualité ?"
  - Archive : tone `danger`, titre "Archiver ce produit ?"
- **Périmètre exclu** (cf. mandat) : pas de `mainMediaId`, `categoryId`,
  pas d'actions staff (approve/reject/publish/suspend/readiness).
- **Pas de touche backend** — les endpoints existent déjà
  (`marketplace-products.controller.ts` lignes 94, 112, 160).

## Tests cibles

- `new/page.test.tsx` : 4 tests (formulaire vide invalide, slug auto-généré,
  submit OK redirige, hint conflit slug 409).
- Étendre `[id]/page.test.tsx` : +3 tests (action submit visible si DRAFT,
  archive visible sauf si ARCHIVED, appel API après confirmation).
- Cible totale : **+7 vitest** (passer de 159 à 166+).
