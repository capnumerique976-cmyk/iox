# I18N-1 phase 1 — POC `next-intl` + page `/marketplace` traduite

Setup `next-intl` v3.x sans i18n routing (locale via cookie). Page POC :
catalogue public `/marketplace`. Composant `LocaleSwitcher` réutilisable.

## Stack

- **`next-intl@^3.26.0`** — App Router compatible, server components OK,
  ICU MessageFormat (pluralisation/interpolation).
- **Sans i18n routing** : `/marketplace` reste valide en FR (rétrocompat
  100%). La locale est portée par le cookie `NEXT_LOCALE`. Pas de prefix
  `/en/...` dans cette phase POC. (Routing locale-prefixed à évaluer en
  I18N-2 si SEO multi-locale prioritaire.)

## Fichiers ajoutés

| Fichier | Rôle |
|---------|------|
| `apps/frontend/src/i18n/config.ts` | locales = ['fr', 'en'], defaultLocale = 'fr', cookie name. |
| `apps/frontend/src/i18n/request.ts` | next-intl request config server (lit cookie + Accept-Language fallback). |
| `apps/frontend/messages/fr.json` | Référence FR (29 clés POC). |
| `apps/frontend/messages/en.json` | EN (29 clés, parité 100%). |
| `apps/frontend/src/components/ui/locale-switcher.tsx` | Toggle FR/EN client component. |
| `apps/frontend/src/components/ui/locale-switcher.test.tsx` | 3 specs. |
| `apps/frontend/scripts/i18n-coverage.ts` | Script CLI coverage clés. |

## Modifications

| Fichier | Diff |
|---------|------|
| `apps/frontend/next.config.mjs` | + `createNextIntlPlugin('./src/i18n/request.ts')`. |
| `apps/frontend/src/app/layout.tsx` | Wrap `<NextIntlClientProvider>` avec `getLocale()` + `getMessages()` server-side. |
| `apps/frontend/src/app/marketplace/page.tsx` | Utilise `getTranslations('marketplace.catalog')` pour 3 strings (title, subtitle, empty). |
| `apps/frontend/package.json` | + scripts `i18n:check` et `i18n:check:strict`. |

## Architecture clés (29 clés POC)

```
common.actions.{save, cancel, delete, edit, submit, back, refresh}
common.states.{loading, empty, error}
common.language.{label, fr, en}
marketplace.catalog.{title, subtitle, empty}
marketplace.catalog.filters.{search, category, country, reset}
marketplace.catalog.card.{viewOffer, from, moq, leadTime, leadTimeDays, soldBy}
marketplace.catalog.priceMode.{FIXED, QUOTE_ONLY, FROM_PRICE}
```

`subtitle` et `card.leadTimeDays` utilisent ICU MessageFormat pluralisation :
```json
"subtitle": "{count, plural, =0 {Aucune offre publiée} one {1 offre publiée} other {# offres publiées}}"
```

## Détection locale

Ordre dans `src/i18n/request.ts` :
1. Cookie `NEXT_LOCALE` (set par `LocaleSwitcher`).
2. Header `Accept-Language` du navigateur (premier match `fr`/`en`).
3. Fallback `DEFAULT_LOCALE = 'fr'`.

Pas d'écriture cookie automatique au premier chargement (le user n'a
rien explicité). Le cookie est posé uniquement par clic explicite sur le
`LocaleSwitcher` (1 an de lifetime, samesite=lax).

## Tests

| Type | Fichier | Specs |
|------|---------|-------|
| Vitest | `locale-switcher.test.tsx` | 3 (rendu, clic switch + cookie + refresh, no-op si même locale). |
| Coverage | `i18n-coverage.ts` | exécution = 0 missing en/fr (parité totale). |

```bash
pnpm --filter @iox/frontend exec vitest run src/components/ui/locale-switcher
# Test Files 1 passed — Tests 3 passed

pnpm --filter @iox/frontend run i18n:check
# Total missing: 0 — ✓ done
```

Build Next.js complet `pnpm build` : ✅ 247 specs vert + build OK.

## Décisions

- **Sans i18n routing** : moindre risque de breakage URLs existantes
  (catalogue public `/marketplace` reste indexé tel quel). À reconsidérer
  en I18N-2 si SEO multi-locale critique.
- **Cookie 1 an** : fournit persistance long-terme côté navigateur sans
  base de données. La synchronisation avec `User.preferredLocale`
  arrivera en I18N-3.
- **3 strings traduites seulement** sur `/marketplace` POC : titre, sous-titre
  pluriel, empty state. Le reste de la page (description hero, badge,
  filtres, cards) n'est pas encore traduit — cible I18N-2 (couverture
  intégrale catalogue public).
- **Fallback FR auto** : si une clé manque en `en.json`, next-intl émet
  un warning console mais ne crash pas. Coverage script signale les
  manques en pre-commit (manuel pour V1, CI gate possible en V2 via
  `i18n:check:strict`).

## Smoke local

```bash
pnpm --filter @iox/frontend dev
# Visiter http://localhost:3000/marketplace
# Title FR: "Catalogue marketplace"
# Cookie: document.cookie = 'NEXT_LOCALE=en'
# Refresh — title EN: "Marketplace catalog"
# Subtitle pluriel: "12 offres publiées" / "12 published offers"
```

## Hors-scope (suite I18N-2..6)

- I18N-2 : couverture intégrale catalogue public + auth + unsubscribe (~150 clés).
- I18N-3 : buyer dashboard `/buyer/*` + `User.preferredLocale` Prisma + endpoint PATCH.
- I18N-4 : refactor registry templates emails par locale (rfq-* en FR + EN).
- I18N-5 : seller dashboard `/seller/*`.
- I18N-6 (V2) : champs métier multi-lingues (`MarketplaceOffer.title` + `titleEn`).
- Locale switcher dans top-nav (sera intégré en I18N-2).
- Routing locale-prefixed (à évaluer si SEO multi-locale prioritaire).
