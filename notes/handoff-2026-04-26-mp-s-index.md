# Handoff — MP-S-INDEX (annuaire public seller)

Date : 2026-04-26
Branche : `mp-s-index-public-seller-directory` (5 commits au-dessus de `main`)
Statut : **prêt à pousser** — aucun push/PR/merge n'a été effectué côté agent.

## Ce qui a été livré

Remplacement du 404 `/marketplace/sellers` par un annuaire public paginé,
filtré et trié des vendeurs **APPROVED uniquement**.

### Backend (`apps/backend/src/marketplace-catalog/`)

- `dto/sellers-query.dto.ts` — `SellersQueryDto` (page, limit, q, country,
  region, featured, sort `featured|recent|name_asc`).
- `marketplace-catalog.service.ts` — méthode `listSellers()` :
  - **Hard filter** `status: APPROVED` non-overridable dans `buildSellersWhere`.
  - **Whitelist Prisma `select`** stricte (15 champs publics + `_count`).
  - `_count.marketplaceProducts` filtré sur `publicationStatus=PUBLISHED`.
  - `$transaction([findMany, count])` pour la pagination.
- `marketplace-catalog.controller.ts` — route `@Get('sellers')` déclarée
  **avant** `@Get('sellers/:slug')` (commentaire explicite : Express ordering).
- `marketplace-catalog.service.spec.ts` — +5 cas (force APPROVED, country
  upper-case, featured, sort featured default, projection sans champs privés).

### Frontend (`apps/frontend/`)

- `lib/marketplace/types.ts` — `PublicSeller`, `SellersResult`.
- `lib/marketplace/api.ts` — `fetchSellers(URLSearchParams)`.
- `components/marketplace/SellerCard.tsx` — carte DS Neon (glass, gradient
  banner placeholder, logo overlap, badge Vedette, compteur produits, premier
  incoterm).
- `components/marketplace/SellersFilters.tsx` — URL-state controlled (router
  push), pas de react-hook-form.
- `app/marketplace/sellers/page.tsx` — RSC, hero, aside filtres, grille,
  pagination conditionnelle (totalPages>1), états vide / erreur.
- `components/marketplace/PublicMarketplaceHeader.tsx` — lien "Producteurs"
  (FR) / "Sellers" (EN) avec `usePathname()` + `aria-current`.
- `lib/i18n.ts` — clés FR + EN (`nav.sellers`, `sellers.*`, `sellers.sort.*`,
  `sellers.filters.*`).
- Tests vitest : `SellerCard.test.tsx` (4), `SellersFilters.test.tsx` (3),
  `app/marketplace/sellers/page.test.tsx` (4).

### Doc

- `docs/marketplace/MARKETPLACE_SELLERS_PUBLIC_INDEX.md` — contrat endpoint,
  invariants sécurité, intégration frontend.
- `notes/mp-s-index-plan.md` — plan d'exécution (committé en début de boucle).

## Tests

- **Backend Jest** : 458/458 ✅ (was 453, +5).
- **Frontend Vitest** : 151/151 ✅ (was 140, +11).
- **Frontend `tsc --noEmit`** : clean ✅.
- **Frontend `next lint`** : clean ✅.

## Commits (5)

```
77f1480 chore(notes): plan MP-S-INDEX (public seller directory)
3c05459 feat(backend): MP-S-INDEX list public sellers (DTO + service + controller + tests)
c5c6e57 feat(frontend): MP-S-INDEX public sellers directory page + filters + cards
b488b6a test(frontend): MP-S-INDEX cover SellerCard, SellersFilters and sellers page
c864441 docs: MP-S-INDEX public sellers directory reference
```

## Invariants vérifiés

- ✅ Aucune migration / aucun changement schema Prisma.
- ✅ Aucun changement backend hors `marketplace-catalog/`.
- ✅ Projection whitelist (les tests asserent l'absence de `legalName`,
  `companyId`, `salesEmail`, `salesPhone`, `rejectionReason`, `suspendedAt`,
  `createdById`, `updatedById`, `approvedAt`, `descriptionLong`, `story`,
  `languages`, `website` à la fois dans le `select` ET dans `data[0]`).
- ✅ Hard `status: APPROVED` (test dédié — aucun query param ne l'écrase).
- ✅ Route ordering Express (`sellers` avant `sellers/:slug`).
- ✅ Conventional commits atomiques.

## À faire côté utilisateur

```bash
# Push + PR
git push -u origin mp-s-index-public-seller-directory
gh pr create --base main \
  --title "feat: MP-S-INDEX public seller directory" \
  --body "..."

# Après merge, sur le VPS — smoke recommandés :
# 1) GET /api/v1/marketplace/catalog/sellers              → 200 + meta + data[]
# 2) GET /api/v1/marketplace/catalog/sellers?featured=true → uniquement isFeatured=true
# 3) GET /api/v1/marketplace/catalog/sellers/:slug        → fiche détail (régression)
# 4) curl <production>/marketplace/sellers (HTML SSR)     → page rendue (pas de 404)
```

## Hors-scope (futurs lots)

- Résolution publique signée des médias `logoMediaId` / `bannerMediaId` (la
  carte les utilise actuellement comme indicateurs binaires).
- Filtres incoterm / destination à l'index.
- Tri "alphabétique inversé" `name_desc` (non demandé dans le DTO V1).
