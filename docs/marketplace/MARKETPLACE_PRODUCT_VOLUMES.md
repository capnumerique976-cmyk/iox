# FP-5 — Volumes & capacités produit marketplace

Lot **strictement additif** : 5 champs nullables sur `MarketplaceProduct`,
hydratés par le seller, projetés publiquement, jamais migrés en données.

## Modèle

| Champ Prisma                  | SQL                                  | Type      | Sémantique                                                                  |
| ----------------------------- | ------------------------------------ | --------- | --------------------------------------------------------------------------- |
| `annualProductionCapacity`    | `annual_production_capacity`         | `Decimal(14,3)?` | Capacité annuelle de production agrégée du producteur (volume).        |
| `capacityUnit`                | `capacity_unit`                      | `String?` | Unité libre courte (ex. `kg`, `t`, `L`, `hL`). Max 20 caractères.           |
| `availableQuantity`           | `available_quantity`                 | `Decimal(14,3)?` | Stock total disponible **agrégé**. ≠ `MarketplaceOffer.availableQuantity` (par offre commerciale). |
| `availableQuantityUnit`       | `available_quantity_unit`            | `String?` | Unité libre courte. Max 20 caractères.                                      |
| `restockFrequency`            | `restock_frequency`                  | `String?` | Texte libre court (`hebdomadaire`, `mensuel`, `à la demande`). Max 30.      |

Migration : `20260427010000_add_marketplace_product_volumes_and_capacities`
(5 `ALTER TABLE ADD COLUMN`, aucun index, aucun défaut, aucune ligne touchée).

## Règles backend

- **DTO** (`Create|UpdateMarketplaceProductDto`) : tous optionnels.
  - 2 champs Decimal : `@IsNumber @Min(0) @Max(1_000_000_000)`.
  - 2 champs unité : `@IsString @MaxLength(20)`.
  - `restockFrequency` : `@IsString @MaxLength(30)`.
- **Service `create()`** : propage les 5 champs tels quels.
- **Vitrine** (`MarketplaceProductsService.update`) : les 5 champs font partie de
  la liste qui flippe `APPROVED|PUBLISHED → IN_REVIEW` lors d'un patch — un
  changement de stock est une mise à jour vitrine publique, pas un détail
  technique invisible.
- **Scoring** : aucun ajout à `SCORED_FIELDS` (stabilité, comme FP-8).
- **Projection catalog public** (`MarketplaceCatalogService.getProductBySlug` /
  `ProductDetail`) : les 5 champs sont exposés. `Decimal` est sérialisé via
  `Number(...)` pour rester JSON-safe (les clients n'ont pas à parser des
  strings).

### Rattrapage FP-8

La projection publique FP-8 (`packagingFormats`, `temperatureRequirements`,
`grossWeight`, `netWeight`, `palletization`) avait été oubliée lors de
mandat 10 (lot FP-8 = schéma + DTO + UI seller mais pas la projection).
Le commit FP-5 backend rattrape ce trou — les 5 champs FP-8 + 5 champs FP-5
sont projetés ensemble.

## UI seller

Page `/seller/marketplace-products/[id]` — nouvelle section
**« Volumes et capacités (FP-5) »** sous **« Logistique (FP-8) »** :

- `field-annualProductionCapacity` (number, step 0.001, max 1e9)
- `field-capacityUnit` (text, maxLength 20)
- `field-availableQuantity` (number, step 0.001, max 1e9)
- `field-availableQuantityUnit` (text, maxLength 20)
- `field-restockFrequency` (text, maxLength 30)

Le `buildPayload` n'envoie que les champs **modifiés** ; un champ vidé n'est
pas effacé (le DTO ne supporte pas `null` explicite — défense en profondeur).
Validation client miroir DTO.

## UI publique

Page `/marketplace/products/[slug]` — 2 nouvelles cartes glass après
**« Origine détaillée »** :

1. **Logistique** (FP-8 — `data-testid="product-logistics"`) — affichée si au
   moins un champ logistique est renseigné.
2. **Volumes et capacités** (FP-5 — `data-testid="product-volumes"`) —
   affichée si `annualProductionCapacity`, `availableQuantity` ou
   `restockFrequency` est renseigné. Les unités sont concaténées au volume
   (`1200 kg`).

Pattern no-op : si tous les champs sont nuls, la carte n'apparaît pas du tout.

## Tests

- Backend : 2 specs jest dans `marketplace-products.service.spec.ts`
  (propagation create + transition `APPROVED → IN_REVIEW` sur patch volumes).
- Frontend seller : 3 specs vitest dans `[id]/page.test.tsx`
  (hydratation, PATCH diff numériques+strings, refus `availableQuantity > 1e9`).

## Limites & non-objectifs

- Pas d'historique des stocks (un patch écrase). Si le besoin émerge :
  modèle `StockSnapshot` séparé.
- Pas d'unités contrôlées (enum). Choix volontaire pour ne pas bloquer la
  saisie en français/anglais ; la normalisation (kg vs Kg vs KG) est laissée
  côté UI plus tard si besoin.
- Pas de quantité par offre — `MarketplaceOffer.availableQuantity` reste la
  source de vérité pour la dispo commerciale par incoterm/destination.
