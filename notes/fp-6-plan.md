# FP-6 — Origine fine produit (plan court)

## Branche
`fp-6-product-fine-origin` (depuis `fp-3-1-seller-media-uploader`).

## Périmètre

Ajouter 4 champs **fins** d'origine sur `MarketplaceProduct`, tous
**optionnels** (additif strict, aucune migration destructrice, aucun
défaut ne touche les lignes existantes) :

| Champ            | Type Prisma            | Map SQL              | Usage                                |
| ---------------- | ---------------------- | -------------------- | ------------------------------------ |
| `originLocality` | `String?` (max 160)    | `origin_locality`    | Ville / village / lieu-dit précis.   |
| `altitudeMeters` | `Int?` (0..9000)       | `altitude_meters`    | Altitude moyenne de la parcelle.     |
| `gpsLat`         | `Decimal?(9, 6)`       | `gps_lat`            | Latitude WGS84 (-90..90).            |
| `gpsLng`         | `Decimal?(9, 6)`       | `gps_lng`            | Longitude WGS84 (-180..180).         |

Pas d'index : ces champs sont des données vitrine, non requêtables au MVP.

## Backend (Nest)

### Migration Prisma
`prisma/migrations/20260426010000_add_marketplace_product_fine_origin/migration.sql`
- 4 colonnes additives via `ALTER TABLE marketplace_products ADD COLUMN ...`.
- Aucun `NOT NULL` sans default → sûr en prod (les lignes existantes
  restent à `NULL`).

### DTO
- `CreateMarketplaceProductDto` : 4 champs `@IsOptional()` avec contraintes
  (`@MaxLength(160)`, `@IsInt() @Min(0) @Max(9000)`, `@IsNumber()` +
  `@Min(-90)/@Max(90)` et `@Min(-180)/@Max(180)` pour les coords).
- `UpdateMarketplaceProductDto` : idem, tous optionnels.
- Cohérence : si `gpsLat` est fourni, `gpsLng` doit l'être aussi (et
  inversement) — règle métier validée côté service (ou via décorateur
  ad-hoc `@ValidateIf`).

### Service
- `create` / `update` : passer les 4 champs au `data` Prisma quand fournis.
- `parseGpsPair(dto)` : helper service-level qui rejette `BadRequestException`
  si exactement un des deux est fourni (cohérence côté service plutôt
  que décorateur custom — plus testable).
- `MP_INCLUDE` inchangé (pas de relation).
- Public projection : ajouter les 4 champs au mapper si un mapper existe ;
  sinon ils sortent déjà via Prisma car la sélection est implicite.

### Tests
- `marketplace-products.service.spec.ts` : créer + mettre à jour avec
  origine fine, rejeter une coordonnée orpheline (lat sans lng), accepter
  les 4 champs nuls (rétrocompat). Cible **+3 tests**.

## Frontend

### Type & helpers
- `apps/frontend/src/lib/marketplace-products.ts` : ajouter les 4 champs
  optionnels à `SellerMarketplaceProduct` (et au type public si défini).

### Public fiche produit
- `apps/frontend/src/app/marketplace/products/[slug]/page.tsx` : nouvelle
  section "Origine détaillée" qui affiche localité, altitude et lien
  Google Maps `https://www.google.com/maps?q=lat,lng` quand les coords
  sont présentes (ouvre dans un nouvel onglet, `rel="noopener"`).
- Ne RIEN afficher si tous les champs sont nuls (cohérence avec
  comportement actuel).

### Tests
Hors scope de ce lot court : pas de test frontend ajouté (le rendu
conditionnel est trivial et déjà couvert par le scénario "pas de média").

## Doc
- `docs/marketplace/MARKETPLACE_PRODUCT.md` (ou doc équivalente) :
  section FP-6 minimale décrivant les 4 champs, leur format et la règle
  de cohérence GPS. Si le doc n'existe pas, ajouter un encart à
  `docs/marketplace/SELLER_PROFILE.md` ou créer `docs/marketplace/PRODUCT_FINE_ORIGIN.md`.

## Hors scope FP-6 (différé)
- Picker GPS interactif (carte) — long et hors timeline.
- Géocodage automatique (locality → coords) — futur.
- Filtrage / recherche par altitude ou bbox — non MVP.
- Affichage carte embedded dans la fiche.
