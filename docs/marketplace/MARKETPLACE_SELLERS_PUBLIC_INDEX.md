# Annuaire public des vendeurs (MP-S-INDEX)

> Annuaire `/marketplace/sellers` listant les vendeurs **APPROVED** uniquement,
> exposé publiquement (pas d'auth). Aucun champ privé n'est projeté.

## Endpoint

`GET /api/v1/marketplace/catalog/sellers`

Décorateur `@Public()`. **Doit être déclaré avant** `GET /sellers/:slug` dans le
contrôleur — sinon Express considère "sellers" comme un slug et appelle la
mauvaise méthode (cf. commentaire `marketplace-catalog.controller.ts`).

### Query params (`SellersQueryDto`)

| Param      | Type    | Défaut     | Description                                                             |
| ---------- | ------- | ---------- | ----------------------------------------------------------------------- |
| `page`     | number  | 1          | Pagination 1-based                                                      |
| `limit`    | number  | 20         | Taille de page                                                          |
| `q`        | string  | —          | Recherche `contains` insensitive sur `publicDisplayName` ∪ `cityOrZone` |
| `country`  | string  | —          | Filtre exact ISO-2/3 (forcé en majuscules côté service)                 |
| `region`   | string  | —          | Filtre `contains` insensitive                                           |
| `featured` | boolean | —          | Si `true`, ne renvoie que les vendeurs `isFeatured=true`                |
| `sort`     | enum    | `featured` | `featured` \| `recent` \| `name_asc`                                    |

### Réponse

```ts
{
  data: PublicSeller[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
```

`PublicSeller` (15 champs **strictement** projetés) :

```ts
interface PublicSeller {
  id: string;
  slug: string;
  publicDisplayName: string;
  country: string;
  region: string | null;
  cityOrZone: string | null;
  descriptionShort: string | null;
  logoMediaId: string | null;
  bannerMediaId: string | null;
  averageLeadTimeDays: number | null;
  destinationsServed: unknown; // JSON liste de pays
  supportedIncoterms: unknown; // JSON liste d'incoterms
  isFeatured: boolean;
  publishedProductsCount: number; // _count.marketplaceProducts where publicationStatus=PUBLISHED
}
```

## Invariants de sécurité

1. **Hard filter `status: APPROVED`** dans `buildSellersWhere`. Aucun query
   param ne peut l'écraser. Les profils `DRAFT`, `PENDING_REVIEW`, `REJECTED`,
   `SUSPENDED`, `ARCHIVED` ne sortent jamais.
2. **Projection whitelist Prisma `select`** — aucun des champs suivants n'est
   jamais émis : `legalName`, `companyId`, `salesEmail`, `salesPhone`,
   `rejectionReason`, `suspendedAt`, `createdById`, `updatedById`, `approvedAt`,
   `descriptionLong`, `story`, `languages`, `website`. La page détail
   `/sellers/:slug` reste seule responsable d'exposer ces enrichissements
   (descriptionLong, story, etc.).
3. Les tests `marketplace-catalog.service.spec.ts` couvrent les deux
   contraintes (assertion sur le `select` + assertion sur l'absence dans
   `data[0]`).

## Frontend

- Page RSC `apps/frontend/src/app/marketplace/sellers/page.tsx` (force-dynamic).
- Filtres URL-state `SellersFilters.tsx` (controlled state, pas de
  react-hook-form, pour rester homogène avec `CatalogFilters`).
- Carte `SellerCard.tsx` alignée DS Neon (glass card, gradient cyan→violet,
  badge "Vedette" pour `isFeatured`).
- Helper `fetchSellers()` dans `lib/marketplace/api.ts` partage le routage
  client/SSR avec les autres endpoints publics.
- Header `PublicMarketplaceHeader` ajoute le lien "Producteurs" / "Sellers"
  avec highlight `aria-current` quand le pathname commence par
  `/marketplace/sellers`.

## Limitations courantes

- Les médias `logoMediaId` / `bannerMediaId` sont projetés comme **simples
  identifiants** ; aucune URL signée n'est exposée par cet endpoint. La carte
  `SellerCard` les utilise comme indicateurs binaires (présent/absent) — un
  futur lot ajoutera la résolution publique.
- Pas de filtre `incoterm` ni `destination` à l'index — le détail vendeur
  reste la source d'autorité.
