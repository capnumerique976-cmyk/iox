# I18N-2 — Couverture catalogue public

Étend I18N-1 phase 1 (29 clés) à 70 clés couvrant le catalogue public.
Migrations server components vers next-intl. Legacy `useLang` continue
en parallèle pour les composants client non encore migrés.

## Périmètre

### Clés ajoutées (70 total, +41 vs phase 1)

```
common.actions.{close, search}                    [+2]
nav.{catalog, sellers, favorites, proArea, marketplaceBadge, homeAlt}  [+6]
marketplace.catalog.{unavailable, heroBadge, heroTitleHighlight, heroDescription, heroAvailable}  [+5]
marketplace.catalog.filters.{searchPlaceholder, all, readiness, priceMode, sort}  [+5]
marketplace.catalog.card.{ask, loginRequired}     [+2]
marketplace.catalog.readinessLabels.*             [+3]
marketplace.catalog.sortLabels.*                  [+5]
marketplace.sellers.*                             [+13]
footer.tagline                                    [+1]
```

Coverage script : `pnpm i18n:check` → **0 missing** (parité fr/en 100%).

### Server components migrés

| Fichier | Migration |
|---------|-----------|
| `app/marketplace/page.tsx` | hero badge + heroDescription + unavailable error message via `getTranslations('marketplace.catalog')` |

### Client components migrés

| Fichier | Migration |
|---------|-----------|
| `components/marketplace/PublicMarketplaceHeader.tsx` | `marketplaceBadge`, `homeAlt` via `useTranslations('nav')` |
| `components/marketplace/PublicMarketplaceFooter` | `footer.tagline` via `useTranslations('footer')` |

## Légacy `useLang` cohabitation

Le DICT legacy de `lib/i18n.ts` reste en place pour les composants client
plus complexes (`CatalogFilters`, `ProductCard`, `SellersFilters`) qui
n'ont pas encore été migrés. Le **bridge** (PR #36) garantit la
cohérence : `useLang.setLang` pose désormais le cookie `NEXT_LOCALE` et
les server components next-intl picked up la même locale.

## Tests

271/271 vert (aucune régression).

```bash
pnpm --filter @iox/frontend exec vitest run
# Test Files 42 passed — Tests 271 passed

pnpm --filter @iox/frontend run i18n:check
# Total missing: 0 — ✓ done

pnpm --filter @iox/frontend exec next build
# Build OK
```

## Décisions

- **Pas de migration des composants client lourds** dans cette phase :
  CatalogFilters utilise `useLang.t` avec ~12 clés et fallbacks — la
  migration en bloc imposerait de réécrire tous les call-sites.
  Approche progressive : phase 3 + (composant par composant).
- **Hardcoded `marketplace` dans `heroTitleHighlight`** : plus simple
  pour l'effet de gradient. Le titre reste traduit via `t('title')`.
- **Footer migré seul** : 1 seule clé, transition simple.

## Hors scope (I18N-3+)

- Migration `CatalogFilters` (12 clés) vers next-intl + remove from legacy DICT.
- Migration `ProductCard` vers next-intl.
- Migration `SellersFilters` vers next-intl.
- Migration page `/marketplace/sellers` server component.
- Migration page `/marketplace/products/[slug]` (lourde, ~30 clés).
- Migration page `/marketplace/sellers/[slug]`.
- Suppression dépendance legacy `useLang` (final phase 4).
