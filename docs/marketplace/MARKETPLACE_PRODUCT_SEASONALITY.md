# Marketplace — Saisonnalité produit (FP-1 + FP-4)

> Vue d'ensemble du dispositif "saisonnalité" sur les fiches produit
> marketplace : modèle, projection publique (FP-1), saisie seller (FP-4).

## Modèle

`MarketplaceProduct` (Prisma) :

| Champ                | Type                 | Notes |
| -------------------- | -------------------- | ----- |
| `harvestMonths`      | `SeasonalityMonth[]` | mois de récolte (`JAN`…`DEC`), sans doublon |
| `availabilityMonths` | `SeasonalityMonth[]` | mois de disponibilité commerciale |
| `isYearRound`        | `boolean`            | si `true`, `availabilityMonths` est normalisé à `[]` |

Normalisation faite côté service via `normalizeSeasonalityInput` :
- déduplication + tri canonique JAN→DEC,
- vidage de `availabilityMonths` quand `isYearRound=true`,
- enum strict `SeasonalityMonth` (validation DTO).

## FP-1 — Vitrine publique (lecture seule)

- Endpoint : champs projetés dans `GET /marketplace/catalog/products/:slug`.
- Composant : `apps/frontend/src/components/marketplace/SeasonalityCalendar.tsx`
  (12 cellules, légende récolte / disponible / toute l'année, no-op silencieux
  si rien n'est renseigné).
- Tests : `SeasonalityCalendar.test.tsx`.

## FP-4 — Saisie seller (UI éditable)

### Backend

**Aucune modification.** `PATCH /marketplace/products/:id` accepte déjà les
3 champs via `UpdateMarketplaceProductDto` (FP-1) :

```ts
@IsArray() @ArrayUnique() @IsEnum(SeasonalityMonth, { each: true })
harvestMonths?: SeasonalityMonth[];

@IsArray() @ArrayUnique() @IsEnum(SeasonalityMonth, { each: true })
availabilityMonths?: SeasonalityMonth[];

@IsBoolean() isYearRound?: boolean;
```

L'ownership est imposée par `SellerOwnershipService.assertMarketplaceProductOwnership`
(403 si le produit n'appartient pas au seller connecté). Le service trace
l'audit (`AuditService`) et rebascule la fiche en `IN_REVIEW` si elle était
`APPROVED` ou `PUBLISHED`.

### Frontend

- Composant éditable :
  `apps/frontend/src/components/marketplace/SeasonalityPicker.tsx` — contrôlé,
  miroir du SeasonalityCalendar. Toggles D (disponibilité) / R (récolte)
  indépendants par mois, case "toute l'année" qui verrouille la grille sans
  effacer les valeurs locales.
- Helper API :
  `apps/frontend/src/lib/marketplace-products.ts` — `listMine`, `getById`,
  `updateSeasonality` (PATCH minimal sur les 3 champs).
- Page édition :
  `apps/frontend/src/app/(dashboard)/seller/marketplace-products/[id]/seasonality/page.tsx`
  — hydrate depuis GET, valide qu'au moins un mois est sélectionné quand
  `!isYearRound`, prévient l'utilisateur de la bascule en revue qualité si la
  fiche est `APPROVED`/`PUBLISHED`.
- Page index minimaliste :
  `apps/frontend/src/app/(dashboard)/seller/marketplace-products/page.tsx` —
  liste les produits du seller (scope automatique côté backend) avec lien
  "Saisonnalité" par ligne.
- Lien `Mes produits marketplace` ajouté dans la section "Raccourcis" du
  cockpit vendeur.

### Tests

- `SeasonalityPicker.test.tsx` — 6 cas (rendu, toggle D, toggle R off,
  year-round lock, disabled global, errorMessage).
- `seller/marketplace-products/[id]/seasonality/page.test.tsx` — 5 cas
  (hydratation + Enregistrer désactivé, payload PATCH ciblé, warning
  APPROVED/PUBLISHED, validation client "≥1 mois", hint 403).
- `seller/marketplace-products/page.test.tsx` — 2 cas (rendu liste + lien,
  état vide).

## Hors scope FP-4

- Édition d'autres champs produit (descriptions, packaging, prix, médias).
- Création de produit côté seller.
- Soumission à la revue (`POST /marketplace/products/:id/submit`) depuis
  cet écran : on s'appuie sur la bascule automatique du backend en cas
  d'édition d'une fiche `APPROVED`/`PUBLISHED`.

## Limites connues / dette future

- L'index seller liste les 50 premiers produits sans pagination ni filtres
  (suffisant pour les vendeurs early-adopters, à enrichir si > 50 produits).
- Le picker n'affiche pas le score de complétude (`completionScore`) bien
  qu'il soit recalculé côté backend à chaque PATCH — à ajouter dans un lot
  UX ultérieur.
