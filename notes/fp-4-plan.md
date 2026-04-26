# FP-4 — SeasonalityPicker (saisie seller)

Branche : `fp-4-seasonality-seller-input` (depuis `fp-3-seller-self-edit`).

## Périmètre

Permettre à un vendeur connecté d'éditer la saisonnalité d'un de ses produits
marketplace (mois de récolte, mois de disponibilité, drapeau "toute l'année").

## Décisions

- **Backend : aucune modification.** L'API `PATCH /marketplace/products/:id`
  existe déjà avec `UpdateMarketplaceProductDto` validant `harvestMonths`,
  `availabilityMonths`, `isYearRound` (cf. FP-1). L'ownership et l'audit sont
  déjà branchés via `SellerOwnershipService` et `AuditService`. Pas de nouveau
  endpoint `/me` ici : la page d'édition cible un produit explicite (`/:id`).
- **Frontend** :
  1. Composant `SeasonalityPicker` (editable), miroir de `SeasonalityCalendar`
     (lecture seule). Contrôlé : props `value` + `onChange`.
  2. Page `/seller/marketplace-products/[id]/seasonality` qui :
     - charge le produit via `api.get('/marketplace/products/:id', token)`,
     - pré-remplit le picker,
     - PATCH `/marketplace/products/:id` avec uniquement les 3 champs
       saisonnalité (diff minimal),
     - affiche un succès, gère 403/404,
     - affiche un avertissement "soumission requise" si le produit était
       APPROVED/PUBLISHED (le service rebascule en IN_REVIEW).
  3. Page index minimaliste `/seller/marketplace-products` listant les
     produits du vendeur connecté avec lien "Saisonnalité" → on appelle
     `GET /marketplace/products?` (le scope est appliqué automatiquement
     côté backend pour un seller).
  4. Lien "Mes produits marketplace" dans le dashboard seller.
- **Hors scope** : édition des autres champs produit (descriptions, packaging,
  prix), création de produit, upload média, soumission. Réservé à de
  futurs lots.

## DTO côté frontend

```ts
interface SeasonalityInput {
  harvestMonths: SeasonalityMonth[];
  availabilityMonths: SeasonalityMonth[];
  isYearRound: boolean;
}
```

## UX picker

- Grille 12 mois (grid-cols-6 sm:grid-cols-12) — boutons toggle.
- Trois colonnes de toggles par mois ? Non, on garde simple :
  - Une checkbox "Toute l'année" en haut. Si cochée → désactive la grille
    et le bouton "Récolte" (mais on conserve les valeurs en mémoire pour
    pouvoir les ré-afficher si décoché).
  - Pour chaque mois : deux toggles compacts (D = Disponible, R = Récolte).
- Validation client : si !isYearRound, availabilityMonths doit être non-vide
  pour autoriser la submission (mirror de la règle métier vitrine).
- Tri : on renvoie toujours dans l'ordre canonique JAN→DEC (le backend
  normalise aussi mais on évite les diffs cosmétiques).

## Tests

- Unitaires SeasonalityPicker : toggle D, toggle R, "toute l'année" lock,
  ordre canonique conservé après plusieurs clics.
- Page seasonality : hydratation depuis GET, diff minimal sur PATCH, succès,
  hint 403, hint 404, validation "availabilityMonths requis".
- Liste produits : rendu simple + lien correct.

## Validation FP-4

- `pnpm lint && pnpm typecheck && pnpm test` doit rester vert.
- Aucune migration Prisma.
- Aucun endpoint backend ajouté.
