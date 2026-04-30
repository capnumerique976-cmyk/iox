# MP-OFFER-EDIT-3 — Édition inline batch (qty + notes)

Compose avec MP-OFFER-EDIT-2 (cascade #22). Ajoute l'**édition inline**
des champs `quantityAvailable` et `notes` d'un `MarketplaceOfferBatch`
existant côté seller, sans modal ni navigation.

## Périmètre

- Bouton **"Modifier"** par ligne dans la section "Lots rattachés" (mode
  édition offre uniquement, `canEdit=true`).
- Inputs inline : `quantityAvailable` (number, step 0.001, min 0) +
  `notes` (text optionnel).
- Boutons **Enregistrer** / **Annuler** par ligne. Cancel restaure le
  mode lecture sans appel API.
- Validation client : qty < 0 ou non numérique → `setErr('Quantité invalide')` + pas d'appel.
- Toggle `exportEligible` désactivé pendant l'édition pour éviter
  conflits.
- Backend : aucun changement (PATCH `/marketplace/offers/batches/:linkId`
  déjà câblé en MP-OFFER-EDIT-2).

## Fichiers modifiés

| Fichier | Diff |
|---------|------|
| `apps/frontend/src/app/(dashboard)/seller/marketplace-offers/[id]/page.tsx` | + state `editingId`/`editForm` dans `BatchesSection`. + handlers `onStartEdit`/`onCancelEdit`/`onSaveEdit`. Refactor row rendering pour basculer entre lecture/édition. |
| `apps/frontend/src/app/(dashboard)/seller/marketplace-offers/[id]/page.test.tsx` | + 4 specs (afficher inputs, save envoie qty+notes, cancel ne save pas, qty négative bloque save). |
| `docs/marketplace/MP_OFFER_EDIT_3.md` | nouveau |

## Tests

```bash
pnpm --filter @iox/frontend exec vitest run "src/app/(dashboard)/seller/marketplace-offers"
# Test Files 3 passed — Tests 29 passed (4 nouveaux : MP-OFFER-EDIT-3)
```

Total `seller/marketplace-offers/[id]/page.test.tsx` : **23 specs** (19 existants + 4 inline edit).

## Décisions

- **Édition inline plutôt que modal** : moins lourd, garde le contexte
  visuel (la table reste visible).
- **Pas de picker batch combobox** dans cette phase : la liste des
  ProductBatches éligibles dépend d'un scope ownership complexe
  (ProductBatch → Product → … pas de relation directe seller). Reportée
  à MP-OFFER-EDIT-4 si besoin (avec endpoint `GET /marketplace/offers/:id/eligible-batches`
  côté backend).
- **`exportEligible` reste un toggle séparé** : sémantique différente
  (changement de statut "marchand", pas d'édition de données).

## Hors scope (MP-OFFER-EDIT-4+)

- Picker UX combobox pour rattacher un nouveau lot.
- Endpoint backend listing ProductBatches éligibles au scope seller.
- Édition de `qualityStatus` / `traceabilityStatus` / `quantityReserved`
  (champs admin/qualité, hors UX seller V1).
- Création de nouveau ProductBatch from scratch (workflow complet
  transformation → production → batch).
