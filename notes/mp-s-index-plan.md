# MP-S-INDEX — Annuaire seller public (plan)

> Branche : `mp-s-index-public-seller-directory` depuis `main` @ `3281671` (post-handoff smoke addendum).
> Objectif : remplacer le 404 actuel sur `/marketplace/sellers` par un annuaire seller public minimaliste, projection stricte (filtre `status=APPROVED`, jamais de champ privé exposé).

## Découpage commits (cible 4-6)

1. `chore(notes): plan MP-S-INDEX` — ce fichier.
2. `feat(backend): MP-S-INDEX list public sellers (DTO + service + controller + tests)`
   - `dto/sellers-query.dto.ts` (page/limit/q/country/region/featured/sort).
   - `service.listSellers()` : filtre dur `status=APPROVED`, projection `select` whitelist (id, slug, publicDisplayName, country, region, cityOrZone, descriptionShort, logoMediaId, bannerMediaId, averageLeadTimeDays, destinationsServed, supportedIncoterms, isFeatured) + `_count.marketplaceProducts (publicationStatus=PUBLISHED)`.
   - `controller @Get('sellers')` AVANT `@Get('sellers/:slug')` (ordre Express).
   - Tests Jest : 5 cas — APPROVED only, country=YT, featured=true, sort featured, projection ne contient pas `legalName`/`salesEmail`/`companyId`/`rejectionReason`.
3. `feat(frontend): MP-S-INDEX public sellers directory page + filters + cards`
   - `lib/marketplace/api.ts` : `fetchSellers(URLSearchParams)` + types `PublicSeller`/`SellersResult`.
   - `components/marketplace/SellerCard.tsx` (bannière, logo, nom, pays/ville, badge featured, compteur produits, premier incoterm).
   - `components/marketplace/SellersFilters.tsx` (URL-state — pattern `CatalogFilters`).
   - `app/marketplace/sellers/page.tsx` (RSC, hero, filtres, grid, pagination, état vide).
4. `feat(frontend): MP-S-INDEX header link + i18n keys`
   - `PublicMarketplaceHeader.tsx` : lien "Producteurs"/"Sellers" entre Catalogue et Favoris.
   - `lib/i18n.ts` : clés `nav.sellers`, `sellers.title`, `sellers.empty`, etc.
5. `test(frontend): MP-S-INDEX SellerCard + page render`
   - `SellerCard.test.tsx` (4 cas).
   - `app/marketplace/sellers/page.test.tsx` (3-4 cas — render, empty, filters present, pagination).
6. `docs(marketplace): MARKETPLACE_SELLERS_PUBLIC_INDEX` — schéma de réponse, champs masqués, hors-scope.

## Contraintes / invariants

- Aucune migration. Aucune modification du schéma.
- Aucune modification backend hors `marketplace-catalog/`.
- `select` Prisma whitelist stricte — interdiction d'ajouter `companyId`, `legalName`, `salesEmail`, `salesPhone`, `rejectionReason`, `suspendedAt`, `createdById`, `updatedById`, `approvedAt` à la projection.
- `status: APPROVED` dur dans le `where` — assertion par test explicite.
- Ordre des routes controller : `@Get('sellers')` AVANT `@Get('sellers/:slug')`.
- Pattern `CatalogFilters` (URL-state controlled) — pas de react-hook-form.

## Hors-scope (explicite)

- Pagination cursor-based.
- Recherche full-text (`tsvector`).
- Filtres avancés (certifs, catégories produits, incoterms multi).
- i18n contenu seller (descriptions traduites).
- Carte géo interactive.
- SEO Open Graph dédié sellers.
- Modification fiche détail seller existante (`/marketplace/sellers/[slug]`).
- Modification admin (`/admin/sellers`).

## Cible santé

- Backend : 453 → 458 jest (+5).
- Frontend : 140 → 146-149 vitest (+6 à +9).
- `pnpm lint` + `pnpm typecheck` propres.
