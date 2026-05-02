# Handoff — Méga-mandat autonome 51 — 2026-05-02

## Résumé

6 LOTs développés, 6 PRs créées et mergées (#84–#89), déploiement VPS OK.
Focus : admin tooling, SEO, sécurité, UX erreurs, observabilité marketplace.

## LOT A — SELLER-PUBLIC-LINK (PR #84) ✅

**Scope** : bouton "Voir ma vitrine" dans le header du dashboard seller

- Bouton ExternalLink dans le PageHeader du seller dashboard
- Visible uniquement quand le profil a un slug publié
- Ouvre la page publique `/marketplace/sellers/:slug` dans un nouvel onglet

**Fichiers :**
- `apps/frontend/src/app/(dashboard)/seller/dashboard/page.tsx` (+ExternalLink import + bouton conditionnel)

## LOT B — ADMIN-STALE-RFQ (PR #85) ✅

**Scope** : endpoint alertes RFQ stagnantes pour admin/staff

- `GET /marketplace/quote-requests/alerts/stale` — staff-only (admin, coordinator, quality_manager)
- Retourne les RFQ avec status NEW ou QUALIFIED et updatedAt > 7 jours
- Payload : count, threshold, data[] avec id, status, offerTitle, sellerName, buyerCompany, buyerEmail, assignedTo, daysStale, createdAt, updatedAt
- 3 tests unitaires

**Fichiers :**
- `apps/backend/src/quote-requests/quote-requests.controller.ts` (+route alerts/stale)
- `apps/backend/src/quote-requests/quote-requests.service.ts` (+findStaleAlerts method)
- `apps/backend/src/quote-requests/quote-requests.service.spec.ts` (+3 tests)

## LOT C — DYNAMIC-SITEMAP (PR #86) ✅

**Scope** : sitemap.xml + robots.txt dynamiques via Next.js App Router

- `sitemap.ts` : 6 routes statiques + produits publiés + sellers approuvés (try/catch gracieux)
- `robots.ts` : allow marketplace, disallow dashboard/auth routes
- Base URL via `NEXT_PUBLIC_SITE_URL` (fallback: https://iox.mycloud.yt)

**Fichiers :**
- `apps/frontend/src/app/sitemap.ts` (nouveau)
- `apps/frontend/src/app/robots.ts` (nouveau)

**Note :** Les URLs dynamiques (produits/sellers) ne s'affichent que si le frontend peut fetch le backend via `BACKEND_INTERNAL_URL`. En prod actuelle, cette variable n'est pas configurée dans le container frontend → seules les routes statiques apparaissent. À fixer en ajoutant `BACKEND_INTERNAL_URL=http://iox_backend:3001` dans le docker-compose frontend.

## LOT D — ERROR-PAGES (PR #87) ✅

**Scope** : pages 404 et erreur améliorées avec CTAs marketplace

- Global `not-found.tsx` : 3 CTAs (Marketplace, Tableau de bord, Accueil) avec icônes
- Global `error.tsx` : Retry + Marketplace + Dashboard CTAs
- `marketplace/not-found.tsx` : nouveau, DS Neon dark, CTAs catalogue/producteurs

**Fichiers :**
- `apps/frontend/src/app/not-found.tsx` (enrichi)
- `apps/frontend/src/app/error.tsx` (enrichi)
- `apps/frontend/src/app/marketplace/not-found.tsx` (nouveau)

## LOT E — RFQ-RATE-LIMIT (PR #88) ✅

**Scope** : throttle strict sur création RFQ et messages

- `POST /marketplace/quote-requests` : 5 req/min par IP (@Throttle)
- `POST /marketplace/quote-requests/:id/messages` : 20 req/min par IP
- Utilise l'infra `@nestjs/throttler` existante (ThrottlerGuard global + override par route)

**Fichiers :**
- `apps/backend/src/quote-requests/quote-requests.controller.ts` (+import Throttle + 2 decorators)

## LOT F — MARKETPLACE-ADMIN-STATS (PR #89) ✅

**Scope** : endpoint KPIs marketplace pour dashboard admin + fix cache stats

**Backend :**
- `GET /dashboard/marketplace` — staff-only, retourne :
  - sellers: approved/pending/suspended/total
  - catalog: productsPublished/productsDraft/offersPublished
  - rfq: total/new/qualified/quoted/negotiating/won/lost/cancelled/stale/createdLast7d
- Fix : ajout `@Header('Cache-Control', CACHE_STATIC)` sur endpoint `/marketplace/catalog/stats`
- 2 tests unitaires

**Fichiers :**
- `apps/backend/src/dashboard/dashboard.service.ts` (+getMarketplaceStats method)
- `apps/backend/src/dashboard/dashboard.controller.ts` (+GET marketplace endpoint)
- `apps/backend/src/dashboard/dashboard.service.spec.ts` (nouveau, 2 tests)
- `apps/backend/src/marketplace-catalog/marketplace-catalog.controller.ts` (+Cache-Control on stats)

## Cascade Merge + Deploy

| PR   | Titre                                              | SHA merge | Deploy |
|------|----------------------------------------------------|-----------|--------|
| #84  | SELLER-PUBLIC-LINK — bouton Voir ma vitrine        | `ce19c10` | ✅     |
| #85  | ADMIN-STALE-RFQ — endpoint alertes stagnantes      | `bd21319` | ✅     |
| #86  | DYNAMIC-SITEMAP — sitemap.xml + robots.txt         | `e267eca` | ✅     |
| #87  | ERROR-PAGES — custom 404 + error pages             | `1ca3be4` | ✅     |
| #88  | RFQ-RATE-LIMIT — throttle strict                   | `ca87c2e` | ✅     |
| #89  | MARKETPLACE-ADMIN-STATS — KPIs + fix cache         | `2c028d8` | ✅     |

SHA main final : `2c028d8`
Deploy : 2026-05-02T13:24:32Z

## Smoke Final

| Endpoint                              | Code | Attendu |
|---------------------------------------|------|---------|
| HTTPS /                               | 307  | 307 ✅  |
| HTTPS /login                          | 200  | 200 ✅  |
| API /api/v1/health                    | 200  | 200 ✅  |
| /sitemap.xml                          | 200  | 200 ✅  |
| /robots.txt                           | 200  | 200 ✅  |
| /marketplace                          | 200  | 200 ✅  |
| Cache-Control /api/v1/marketplace/catalog/stats | `s-maxage=300...` | ✅ |

## Guardrails respectés

- 0 force-push main
- 0 Stripe real calls
- 0 PAY module modification
- 0 env var changes
- 0 external emails
- 0 Prisma migration (aucune nécessaire)
- tsc clean backend + frontend (vérifié chaque LOT)
- 3 + 2 = 5 nouveaux tests (stale-rfq + dashboard marketplace)

## Notes

- Sitemap dynamique : les routes produits/sellers ne s'affichent pas tant que `BACKEND_INTERNAL_URL` n'est pas ajouté au container frontend. Les 6 routes statiques sont valides.
- Le rate-limit est basé IP via ThrottlerGuard — en mode reverse-proxy, s'assurer que `trust proxy` est bien configuré (déjà fait dans main.ts).
- L'endpoint `/dashboard/marketplace` n'a pas de cache header car authentifié (données fraîches).
- La page `marketplace/not-found.tsx` s'affiche quand `notFound()` est appelé depuis une page marketplace.
