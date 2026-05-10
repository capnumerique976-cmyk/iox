# Prompt Claude Code — MP-S-INDEX — Annuaire seller public

> **Usage** : à coller tel quel dans Claude Code. Lot court (S-M, ~1.5 à 2 jours), faible risque, fort impact démo (résout le 404 actuel sur `/marketplace/sellers`).
> **Pré-requis (à vérifier en premier, stop si non remplis)** :
>
> - être sur la machine où le repo IOX est cloné ;
> - working tree clean ;
> - branche courante : `main` à `00ac8aa` ou plus récent ;
> - `git remote -v` affiche `git@github.com:capnumerique976-cmyk/iox.git` ;
> - `gh` CLI installé et authentifié (`gh auth status` → "Logged in to github.com").

---

## Contexte canonique IOX (rappel concis — voir `docs-projet/13-contexte-canonique-marketplace.md`)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma 5 + PostgreSQL, Next.js (App Router), controlled state (pas de react-hook-form).

**Cinq invariants à respecter** :

1. `MarketplaceProduct` ≠ `MarketplaceOffer` ≠ `SellerProfile`.
2. **Projection publique filtrée** : aucun champ n'apparaît en public sans projection explicite côté `marketplace-catalog`.
3. Statuts marketplace ≠ statuts MCH internes.
4. `FP-x` ≠ `Lot X` ≠ `MP-x`.
5. Seller = rôle marketplace.

## Constat de départ

- `https://iox.mycloud.yt/marketplace/sellers` retourne actuellement un 404 Next.js : la page `apps/frontend/src/app/marketplace/sellers/page.tsx` **n'existe pas**.
- Backend `marketplace-catalog.controller.ts` expose **uniquement** `GET /marketplace/catalog/sellers/:slug` (fiche détail), **pas** de liste.
- Le header public (`PublicMarketplaceHeader.tsx`) propose : Catalogue, Favoris, Espace pro, FR/EN. Aucun lien "Producteurs" / "Vendeurs".
- **Conséquence** : la marketplace publique manque d'un point d'entrée vers les sellers, alors même que la fiche détail seller existe et que les profils ont récemment été enrichis (FP-3 auto-édition + FP-3.1 logo/bannière).

## Objectif

Livrer un annuaire seller public minimaliste mais complet : endpoint backend `GET /marketplace/catalog/sellers` (liste paginée filtrable), page Next.js `/marketplace/sellers`, lien dans le header public, composants réutilisables. Aucune migration. Aucune modification backend hors scope.

## Branche

```
mp-s-index-public-seller-directory
```

depuis `main` à jour.

## Règles absolues

- Aucune migration Prisma. Aucune modification du schéma.
- Aucune modification du backend en dehors de `marketplace-catalog/`. Pas de touche aux modules `seller-profiles`, `marketplace-products`, `marketplace-offers`, `marketplace-certifications`, etc.
- Aucune modification de la fiche détail seller existante (`/marketplace/sellers/[slug]`) ni de son endpoint backend (`GET /marketplace/catalog/sellers/:slug`).
- **Projection publique stricte** : la réponse de `GET /marketplace/catalog/sellers` ne doit JAMAIS contenir : `legalName`, `companyId`, `salesEmail`, `salesPhone`, `rejectionReason`, `suspendedAt`, `createdById`, `updatedById`, `approvedAt` exposé tel quel, ni aucun champ technique non listé dans le périmètre. Tester explicitement l'absence de ces champs.
- **Filtre dur `status = APPROVED`** sur tous les sellers retournés. Les sellers `DRAFT`, `PENDING_REVIEW`, `SUSPENDED`, `REJECTED` ne doivent JAMAIS apparaître dans la réponse publique. Tester ce filtre explicitement.
- Pas de refacto large, pas de renommage opportuniste, pas d'amélioration de fichiers hors scope.
- Conventional commits, atomiques par sous-étape.
- Préserver la CI : `pnpm lint`, `pnpm typecheck`, `pnpm test` verts à chaque commit.

## Périmètre

### A. Backend

#### A.1. Nouveau DTO `apps/backend/src/marketplace-catalog/dto/sellers-query.dto.ts`

```typescript
import { IsOptional, IsString, IsEnum, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SellersSort {
  FEATURED = 'featured',
  RECENT = 'recent',
  NAME_ASC = 'name_asc',
}

export class SellersQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Recherche texte (publicDisplayName, cityOrZone)' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Code ISO pays (ex: YT, FR)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Région' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Filtre featured = true' })
  @IsOptional()
  @IsBooleanString()
  featured?: string;

  @ApiPropertyOptional({ enum: SellersSort, default: SellersSort.FEATURED })
  @IsOptional()
  @IsEnum(SellersSort)
  sort?: SellersSort = SellersSort.FEATURED;
}
```

#### A.2. Méthode `listSellers` dans `marketplace-catalog.service.ts`

Pseudo-code (à respecter strictement) :

- Construire un `where` Prisma :
  - `status: SellerProfileStatus.APPROVED` **toujours**, en dur.
  - Si `q` : `OR: [{ publicDisplayName: { contains: q, mode: 'insensitive' } }, { cityOrZone: { contains: q, mode: 'insensitive' } }]`.
  - Si `country` : `country: country.toUpperCase()`.
  - Si `region` : `region: { contains: region, mode: 'insensitive' }`.
  - Si `featured === 'true'` : `isFeatured: true`.
- Construire un `orderBy` selon `sort` :
  - `featured` (default) → `[{ isFeatured: 'desc' }, { approvedAt: 'desc' }]`
  - `recent` → `[{ approvedAt: 'desc' }]`
  - `name_asc` → `[{ publicDisplayName: 'asc' }]`
- Récupérer en une transaction `findMany` + `count`, avec pagination `skip = (page - 1) * limit, take = limit`.
- `select` Prisma **strictement limité aux champs autorisés** :
  ```
  id, slug, publicDisplayName, country, region, cityOrZone,
  descriptionShort, logoMediaId, bannerMediaId, averageLeadTimeDays,
  destinationsServed, supportedIncoterms, isFeatured,
  _count: { select: { marketplaceProducts: { where: { publicationStatus: PUBLISHED } } } }
  ```
- Mapper la réponse : pour chaque seller, retourner exactement ces champs + `publishedProductsCount` (alias de `_count.marketplaceProducts`). **Aucun autre champ.**
- Retourner `{ data, meta: { page, limit, total, totalPages } }` cohérent avec le pattern existant.

#### A.3. Route `@Public() @Get('sellers')` dans `marketplace-catalog.controller.ts`

Ajoutée **avant** la route `@Get('sellers/:slug')` existante (sinon Express l'avalerait en pensant que `sellers` est un slug). Vérifier l'ordre.

```typescript
@Public()
@Get('sellers')
listSellers(@Query() query: SellersQueryDto) {
  return this.service.listSellers(query);
}
```

#### A.4. Tests `marketplace-catalog.service.spec.ts`

Ajouter une suite `describe('listSellers (MP-S-INDEX)')` avec au minimum 5 cas :

1. Renvoie uniquement les sellers `APPROVED` (un seller `PENDING_REVIEW` / `SUSPENDED` / `REJECTED` n'apparaît pas).
2. Filtre `country=YT` ne retourne que les sellers de Mayotte.
3. Filtre `featured=true` retourne les sellers featured.
4. Tri `featured` place les featured en tête.
5. Réponse ne contient **pas** `legalName`, `salesEmail`, `companyId`, `rejectionReason` (assertion explicite — utiliser `expect(body.data[0]).not.toHaveProperty(...)` pour chaque champ interdit).

Cible : **+5 jest backend** (passer de 453 à 458).

### B. Frontend

#### B.1. Helper API `apps/frontend/src/lib/marketplace/api.ts`

Ajouter une fonction `fetchSellers(params)` à l'image de `fetchCatalog`, mais ciblant `/marketplace/catalog/sellers`. Types :

```typescript
export interface PublicSeller {
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
  destinationsServed: string[] | null;
  supportedIncoterms: string[] | null;
  isFeatured: boolean;
  publishedProductsCount: number;
}

export interface SellersResult {
  data: PublicSeller[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
```

#### B.2. Page `apps/frontend/src/app/marketplace/sellers/page.tsx`

Page server-side Next.js App Router. Pattern miroir de `apps/frontend/src/app/marketplace/page.tsx` (catalog) : récupère les `searchParams`, appelle `fetchSellers`, gère erreur soft (try/catch, fallback empty state).

Sections :

- Hero court ("Producteurs sélectionnés", baseline orientée confiance/qualité).
- Filtres (composant `SellersFilters`) : recherche, pays, "vedettes uniquement".
- Liste de `SellerCard` en grid.
- État vide quand 0 résultat.
- Pagination simple (page suivante/précédente si `totalPages > 1`).

#### B.3. Composant `apps/frontend/src/components/marketplace/SellerCard.tsx`

Carte cliquable :

- Bannière (si `bannerMediaId`) — placeholder gradient sinon.
- Logo circulaire (si `logoMediaId`) — initiales sinon.
- Nom (`publicDisplayName`).
- Pays + ville (`country`, `cityOrZone`).
- Badge "Vedette" si `isFeatured`.
- Compteur "X produits publiés".
- Tag du premier incoterm si disponible.
- Lien vers `/marketplace/sellers/[slug]`.

Style cohérent avec le reste du marketplace public (DS Neon, glass cards).

#### B.4. Composant `apps/frontend/src/components/marketplace/SellersFilters.tsx`

Mini-version inspirée de `CatalogFilters.tsx` (à lire avant pour cohérence) : URL-state (sync `searchParams`), submit qui pousse `router.push`, reset.

Filtres :

- Recherche (input texte).
- Pays (input texte simple, ex. "YT", "FR", "MG").
- Checkbox "Vedettes uniquement".
- Sélecteur tri : "Vedettes d'abord", "Récents", "Nom A→Z".

#### B.5. Header public `PublicMarketplaceHeader.tsx`

Ajouter un lien "Producteurs" (FR) / "Sellers" (EN) entre "Catalogue" et "Favoris", pointant vers `/marketplace/sellers`. Mise en surbrillance si actif.

#### B.6. Tests frontend

- `SellerCard.test.tsx` : rendu avec données minimales, rendu avec données complètes, badge featured, compteur produits.
- `apps/frontend/src/app/marketplace/sellers/page.test.tsx` : page render avec données, état vide, filtres présents, pagination affichée si `totalPages > 1`.

Cible : **+6 à +9 vitest** (passer de 140 à ~148).

### C. Documentation

#### C.1. `notes/mp-s-index-plan.md`

Mini-plan 5-10 lignes avant de coder. Commit `chore(notes): plan MP-S-INDEX`.

#### C.2. `docs/marketplace/MARKETPLACE_SELLERS_PUBLIC_INDEX.md`

Nouveau document de référence :

- Objectif et contexte.
- Schéma de réponse `GET /marketplace/catalog/sellers` (champs exposés, champs **volontairement masqués**).
- Filtres et tri supportés.
- Pagination.
- Hors-scope explicite : recherche full-text, filtres avancés (certification, catégorie produits), pagination cursor-based, i18n.

## Méthodologie

1. **Lire avant de coder** :
   - `apps/backend/src/marketplace-catalog/marketplace-catalog.controller.ts` et `marketplace-catalog.service.ts` (pattern existant `catalog`, `productBySlug`, `sellerBySlug`).
   - `apps/backend/src/marketplace-catalog/dto/catalog-query.dto.ts` (pattern DTO).
   - `apps/backend/src/marketplace-catalog/marketplace-catalog.service.spec.ts` (pattern de tests).
   - `apps/frontend/src/app/marketplace/page.tsx` (page catalog).
   - `apps/frontend/src/components/marketplace/CatalogFilters.tsx` (pattern filtres URL-state).
   - `apps/frontend/src/lib/marketplace/api.ts` (helper fetchCatalog).
   - `apps/frontend/src/components/marketplace/PublicMarketplaceHeader.tsx` (header public).
2. Écrire `notes/mp-s-index-plan.md`. Commit `chore(notes)`.
3. **Boucle courte** côté backend en premier (DTO → service → controller → tests), commit atomique par sous-étape.
4. Lancer la santé backend après les tests : `pnpm --filter @iox/backend test`.
5. Passer au frontend : helper API → composants (SellerCard puis SellersFilters) → page → tests → header.
6. Lancer la santé frontend : `pnpm --filter @iox/frontend exec next lint && pnpm --filter @iox/frontend exec vitest run && pnpm --filter @iox/frontend exec tsc --noEmit`.
7. Documentation : commit final `docs(marketplace)`.

## Critères de succès

- Branche locale `mp-s-index-public-seller-directory` verte.
- `pnpm --filter @iox/backend test` : 458/458 (au moins +5 nets).
- `pnpm --filter @iox/frontend exec vitest run` : ≥ 146 (au moins +6 nets).
- `pnpm lint` et `pnpm typecheck` (front + back) propres.
- Aucun champ privé (`legalName`, `salesEmail`, `companyId`, `rejectionReason`, `suspendedAt`, `createdById`, `updatedById`) dans la réponse de `GET /marketplace/catalog/sellers` — vérifié par test explicite.
- Aucun seller non-`APPROVED` dans la réponse — vérifié par test explicite.
- Doc `MARKETPLACE_SELLERS_PUBLIC_INDEX.md` créée.
- `notes/mp-s-index-plan.md` créé.
- Working tree clean.
- Branche prête à pousser : à la fin du mandat, **NE PAS** pousser ; rendre la main pour que l'utilisateur exécute le push + PR + merge via le prompt 06 dédié (ou à la main).

## Smoke tests à valider après merge sur le déployé (à lister dans le handoff)

- [ ] `https://iox.mycloud.yt/marketplace/sellers` ne renvoie plus 404 (200 + page rendue).
- [ ] La liste affiche au moins les sellers `APPROVED` existants.
- [ ] Les filtres (recherche, pays, vedettes) fonctionnent (URL state).
- [ ] Le header public affiche le nouveau lien "Producteurs" et la mise en surbrillance fonctionne.
- [ ] Un seller `SUSPENDED` ou `PENDING_REVIEW` ne doit JAMAIS apparaître (test manuel via API si possible).
- [ ] La fiche détail `/marketplace/sellers/[slug]` continue à fonctionner (non-régression).

## Gestion des blocages

- **Pattern `_count` Prisma non exploitable** comme attendu : utiliser une requête SQL annexe ou un map post-fetch. Documenter le choix.
- **`isBooleanString` ne marche pas comme attendu** sur `featured` : transformer côté DTO via `@Transform`.
- **Style header conflictuel** lors de l'ajout du lien "Producteurs" : adapter sans toucher au design system.
- **Si le backend `select` Prisma refuse `_count` avec ce filtre `where`** (rare avec Prisma récent, mais possible) : retourner sans compteur dans une première itération, ajouter le compteur dans un commit suivant.
- **Blocage majeur** (pattern fondamentalement incompatible) : arrêter, documenter dans le handoff, rendre la main.

## Rapport attendu en fin

Mettre à jour `notes/handoff-<date>-mp-s-index.md` avec :

- État final : 1 nouvelle branche, N commits (cible 4-6 commits).
- Fichiers créés / modifiés (par couche : backend, frontend, doc).
- Tests : avant / après (backend, frontend).
- Décisions clés (pagination offset, projection stricte, filtres URL-state).
- Smoke tests à effectuer après merge sur déployé.
- Branche prête à pousser : `git push -u origin mp-s-index-public-seller-directory && gh pr create ...` (à exécuter par l'utilisateur).

## Périmètre exclu (à ne PAS faire dans ce lot)

- Pagination cursor-based.
- Recherche full-text (`tsvector`).
- Filtres avancés (par certification, par catégorie produit, par incoterm).
- i18n contenu seller.
- Carte interactive géographique.
- SEO Open Graph spécifique aux sellers (à faire dans un lot SEO dédié).
- Modification de la fiche détail seller existante.
- Modification de l'admin (`/admin/sellers`).
- Modification du backend hors `marketplace-catalog/`.

## Rappel final

- **Prudence > vitesse.**
- **Projection publique > tout.**
- En cas de doute, livre moins mais propre.
- Aucune action sur `origin` : ni push, ni PR, ni merge. Rendre la main à l'utilisateur.
