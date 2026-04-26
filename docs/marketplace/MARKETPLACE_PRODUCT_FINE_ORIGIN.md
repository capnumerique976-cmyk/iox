# FP-6 — Origine fine produit (locality + altitude + GPS)

## Périmètre

Permet à un vendeur de préciser l'**origine fine** de son produit
marketplace au-delà du couple `originCountry` / `originRegion` déjà
existant. Données purement vitrine (ni filtrage, ni recherche au MVP),
strictement additives côté schéma.

## Champs

Ajoutés sur `MarketplaceProduct` (Prisma + colonnes SQL nullable, pas
d'index) :

| Champ            | Type Prisma            | Borne validation               | Usage                              |
| ---------------- | ---------------------- | ------------------------------ | ---------------------------------- |
| `originLocality` | `String?`              | max 160 caractères             | Ville / village / lieu-dit précis. |
| `altitudeMeters` | `Int?`                 | 0 ≤ x ≤ 9000                   | Altitude moyenne de la parcelle.   |
| `gpsLat`         | `Decimal?(9, 6)`       | -90 ≤ x ≤ 90                   | Latitude WGS84.                    |
| `gpsLng`         | `Decimal?(9, 6)`       | -180 ≤ x ≤ 180                 | Longitude WGS84.                   |

**Cohérence GPS** : `gpsLat` et `gpsLng` doivent être fournis ensemble.
Le service lève `BadRequestException` si exactement un des deux est
fourni (au create comme à l'update). Cette règle est volontairement
**service-side** (plus testable qu'un décorateur custom class-validator).

## Migration

`prisma/migrations/20260426010000_add_marketplace_product_fine_origin/migration.sql`

Strictement additive : 4 `ALTER TABLE … ADD COLUMN`. Aucune ligne
existante n'est touchée (toutes les nouvelles colonnes restent à `NULL`).
Aucune valeur par défaut ne contraint le backfill. Sûr en production.

## DTO

- `CreateMarketplaceProductDto` : 4 champs `@IsOptional()` avec
  `@IsInt() @Min(0) @Max(9000)` (altitude), `@IsNumber() @Min(-90) @Max(90)`
  (lat) et `@IsNumber() @Min(-180) @Max(180)` (lng), `@MaxLength(160)`
  (locality).
- `UpdateMarketplaceProductDto` : mêmes contraintes, mêmes optionnels.

## Projection publique

Le mapper `marketplace-catalog.service.ts → ProductDetail` :

- ajoute `originLocality`, `altitudeMeters` (Number),
- sérialise `gpsLat` / `gpsLng` en string via `.toString()` pour rester
  JSON-safe sans perte de précision (Decimal Prisma vs JSON Number).

Le frontend `apps/frontend/src/lib/marketplace/types.ts` accepte les deux
formes (`string | number | null`) à la lecture.

## Affichage public

`apps/frontend/src/app/marketplace/products/[slug]/page.tsx` ajoute une
section **"Origine détaillée"** :

- localité (texte),
- altitude en mètres,
- coordonnées GPS rendues comme un lien externe vers Google Maps
  (`https://www.google.com/maps?q=lat,lng`, `target="_blank"`,
  `rel="noopener noreferrer"`).

La section entière est **omise** si les 4 champs sont nuls (pas de
section vide).

## Tests

- Backend : 3 tests ajoutés dans
  `marketplace-products.service.spec.ts` :
  - `FP-6 — propage les 4 champs d'origine fine au create`,
  - `FP-6 — rejette une coordonnée GPS orpheline (lat sans lng) au create`,
  - `FP-6 — rejette une coordonnée GPS orpheline au update`.
- Frontend : pas de test dédié (rendu conditionnel trivial, déjà couvert
  par les snapshots de la page si présents).

Backend : 450 → 453 tests (+3 nets).

## Hors scope FP-6 (différé)

- Picker GPS interactif (carte Leaflet/Mapbox) — coût UI > valeur MVP.
- Géocodage automatique `originLocality → gpsLat/gpsLng` côté backend.
- Filtrage ou bbox géographique côté `marketplace-catalog`.
- Carte embarquée (iframe Google Maps) sur la fiche publique.
- Versioning historique de l'origine (audit suffit pour l'instant).
