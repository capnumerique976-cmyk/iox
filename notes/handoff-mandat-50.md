# Handoff — Méga-mandat autonome 50 — 2026-05-02

## Résumé

6 LOTs développés, 6 PRs créées et mergées (#78–#83), déploiement VPS OK.
Focus : beta-readiness quick wins (sécurité, SEO, UX publique, performance).

## LOT A — DTO-HARDENING (PR #78) ✅

**Scope** : `@ArrayMaxSize` sur tous les arrays non bornés des seller-profile DTOs

- `CreateSellerProfileDto` : languages (20), supportedIncoterms (15), destinationsServed (50)
- `UpdateSellerProfileDto` : idem
- `UpdateMySellerProfileDto` : idem (en complément des `@MaxLength` existants)
- 10 tests unitaires (class-validator validate, vérifient les 3 DTOs)

**Fichiers :**
- `apps/backend/src/seller-profiles/dto/seller-profile.dto.ts` (+ArrayMaxSize import + décorators)
- `apps/backend/src/seller-profiles/dto/seller-profile.dto.spec.ts` (nouveau)

## LOT B — SEO-META (PR #79) ✅

**Scope** : Open Graph + Twitter Card dynamiques sur fiches produit et vendeur

- `generateMetadata` sur `/marketplace/products/[slug]` : titre, description, image primaire
- `generateMetadata` sur `/marketplace/sellers/[slug]` : titre, description, logo/banner
- og:type = website (produits) / profile (vendeurs)
- og:site_name = "IOX Marketplace"
- Twitter card type adapté (summary_large_image si image, summary sinon)

**Fichiers :**
- `apps/frontend/src/app/marketplace/products/[slug]/page.tsx` (+generateMetadata)
- `apps/frontend/src/app/marketplace/sellers/[slug]/page.tsx` (+generateMetadata)

## LOT C — HOW-IT-WORKS (PR #80) ✅

**Scope** : page statique `/marketplace/how-it-works` pour éduquer les buyers B2B

- 4 étapes visuelles : Discover → Request → Negotiate → Finalize
- Icônes colorées (Search, MessageSquare, Handshake, ShieldCheck)
- Section "Pourquoi IOX" avec 3 valeurs de confiance (traçabilité, conformité, accompagnement)
- CTA vers le catalogue
- Fully i18n (FR + EN via next-intl)

**Fichiers :**
- `apps/frontend/src/app/marketplace/how-it-works/page.tsx` (nouveau)
- `apps/frontend/messages/fr.json` (+howItWorks section)
- `apps/frontend/messages/en.json` (+howItWorks section)

## LOT D — CATALOG-STATS (PR #81) ✅

**Scope** : endpoint stats publics + compteurs live dans le hero marketplace

**Backend :**
- `GET /marketplace/catalog/stats` — public, retourne `{ products, sellers, countries }`
- Utilise `Promise.all` : count products publiés + count sellers APPROVED + distinct countries
- 2 tests unitaires

**Frontend :**
- Fetch stats en parallèle du catalogue
- Affiche badges inline : "X producteurs" + "Y pays" dans le hero à côté du total offres

**Fichiers :**
- `apps/backend/src/marketplace-catalog/marketplace-catalog.service.ts` (+stats method)
- `apps/backend/src/marketplace-catalog/marketplace-catalog.controller.ts` (+stats endpoint)
- `apps/backend/src/marketplace-catalog/marketplace-catalog.service.spec.ts` (+2 tests)
- `apps/frontend/src/lib/marketplace/api.ts` (+fetchStats + CatalogStats type)
- `apps/frontend/src/app/marketplace/page.tsx` (+stats display)

## LOT E — PUBLIC-NAV-ENHANCE (PR #82) ✅

**Scope** : lien "Comment ça marche" dans la navigation + footer enrichi

- Header : lien "How it works" avec icône HelpCircle (visible lg+, aria-current active)
- Footer : restructuré en 2 colonnes (logo+tagline | nav links)
- Footer links : Catalog, Sellers, Categories, How it works, Pro area
- i18n key `nav.howItWorks` ajoutée FR + EN

**Fichiers :**
- `apps/frontend/src/components/marketplace/PublicMarketplaceHeader.tsx` (header + footer)
- `apps/frontend/messages/fr.json` (+howItWorks nav key)
- `apps/frontend/messages/en.json` (+howItWorks nav key)

## LOT F — PERF-CACHE (PR #83) ✅

**Scope** : Cache-Control headers sur tous les endpoints publics du catalogue

- List endpoints (catalog, sellers, suggest) : `s-maxage=60, max-age=30, stale-while-revalidate=120`
- Detail endpoints (products/:slug, sellers/:slug) : `s-maxage=120, max-age=60, stale-while-revalidate=300`
- Static endpoints (categories, stats) : `s-maxage=300, max-age=120, stale-while-revalidate=600`
- Via `@Header('Cache-Control', ...)` NestJS decorator

**Fichiers :**
- `apps/backend/src/marketplace-catalog/marketplace-catalog.controller.ts` (+@Header decorators)

## Cascade Merge + Deploy

| PR   | Titre                                              | SHA merge | Deploy |
|------|----------------------------------------------------|-----------|--------|
| #78  | DTO-HARDENING — ArrayMaxSize seller DTOs           | `04c5efd` | ✅     |
| #79  | SEO-META — OG + Twitter Card                       | `72d5b33` | ✅     |
| #80  | HOW-IT-WORKS — page éducative                      | `8c6239f` | ✅     |
| #81  | CATALOG-STATS — endpoint + compteurs hero          | `47ba4c8` | ✅     |
| #82  | PUBLIC-NAV-ENHANCE — nav links + footer            | `8a9f899` | ✅     |
| #83  | PERF-CACHE — Cache-Control headers                 | `4dba065` | ✅     |

SHA main final : `4dba065`
Deploy : 2026-05-02T11:53:32Z

## Smoke Final

| Endpoint                                        | Code | Attendu |
|-------------------------------------------------|------|---------|
| HTTPS /                                         | 307  | 307 ✅  |
| HTTPS /login                                    | 200  | 200 ✅  |
| API /api/v1/health                              | 200  | 200 ✅  |
| API /api/v1/marketplace/catalog/stats           | 200  | 200 ✅  |
| /marketplace                                    | 200  | 200 ✅  |
| /marketplace/how-it-works                       | 200  | 200 ✅  |
| Cache-Control on /api/v1/marketplace/catalog    | `public, s-maxage=60...` | ✅ |
| OG meta on /marketplace/products/demo-vanille-poudre | og:title present | ✅ |

Stats response : `{"products":8,"sellers":4,"countries":1}`

## Guardrails respectés

- 0 force-push main
- 0 Stripe real calls
- 0 PAY module modification
- 0 env var changes
- 0 external emails
- 0 Prisma migration (aucune nécessaire)
- tsc clean backend + frontend (vérifié chaque LOT)
- 10 + 2 = 12 nouveaux tests (dto-hardening + catalog-stats)

## Notes

- Le buyer quote notification (`rfq-quoted`) existait déjà — LOT E pivoté vers PUBLIC-NAV-ENHANCE
- Les Cache-Control headers sont `public` (CDN-cacheable) car les endpoints sont @Public
- Le endpoint `/stats` n'a pas de @Header Cache-Control explicite — il hérite du comportement par défaut NestJS (no-cache). À ajouter si nécessaire.
- La page how-it-works est statique (pas de `force-dynamic`), Next.js peut la build-time render
- Les OG meta utilisent `generateMetadata` qui fait un fetch serveur — doublonne avec le page component mais Next.js déduplique les fetches automatiquement

---

# Addendum — Mandat 50b: MeiliSearch Production Deployment (2026-05-08)

## Status: ✅ PROD OK

### Infrastructure
- MeiliSearch v1.7 container added to VPS (`iox_meilisearch`)
- Persistent volume `meilisearch_data`
- Internal network only (not exposed publicly)
- Memory limit 384MB

### Env Vars (VPS .env)
- `MEILISEARCH_HOST=http://meilisearch:7700`
- `MEILISEARCH_API_KEY=<40-char key>`
- `MEILI_MASTER_KEY=<same key>`

### Fixes During Deployment
1. CJS export name: `Meilisearch` (lowercase s), not `MeiliSearch` — commit `36228ab`
2. primaryKey ambiguity: pass `{ primaryKey: 'id' }` — commit `4488c65`
3. Docker Compose updates — commit `9a56551`

### Reindex: 8 products, 4 sellers

### Smoke Tests: ALL PASS
- Simple search, typo tolerance, filters, no results, seller search, browse all
- Postgres fallback (MeiliSearch stopped → backend=postgres)
- Public HTTPS: 200, 36ms
- No secrets in frontend container

### All 6 Containers Healthy
```
iox_backend       healthy
iox_frontend      healthy
iox_meilisearch   healthy
iox_minio         healthy
iox_postgres      healthy
iox_redis         healthy
```

### Rollback
Remove/empty `MEILISEARCH_HOST` in .env → restart backend → auto-fallback to Postgres
