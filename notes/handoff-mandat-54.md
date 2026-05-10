# Handoff — Mandat 54

**Date** : 2026-05-02  
**PRs** : #108 → #119 (12 LOTs, squash-merged)  
**Déploiement** : ✅ VPS OK — healthchecks pass  

---

## LOTs livrés

| LOT | Branche | PR | Scope |
|-----|---------|-----|-------|
| A | `lot-a-marketplace-sub-loading` | #108 | Skeletons shimmer pour categories, favorites, how-it-works |
| B | `lot-b-exception-filter-spec` | #109 | HttpExceptionFilter unit tests (8 cas) |
| C | `lot-c-response-interceptor-spec` | #110 | ResponseInterceptor unit tests (6 cas) |
| D | `lot-d-catalog-throttle` | #111 | @Throttle(60/min) catalog controller + 30/min suggest |
| E | `lot-e-offers-throttle` | #112 | @Throttle(15/min) offer creation endpoint |
| F | `lot-f-dashboard-loading-error` | #113 | Dashboard loading.tsx skeleton + error.tsx boundary |
| G | `lot-g-jsonld-seller` | #114 | JSON-LD Organization structured data sur fiches vendeur |
| H | `lot-h-nextjs-middleware` | #115 | Next.js middleware: trailing slash 308 + security headers |
| I | `lot-i-logging-interceptor-spec` | #116 | LoggingInterceptor unit tests (6 cas) |
| J | `lot-j-i18n-gaps` | #117 | i18n common.errors + common.pagination (fr + en) |
| K | `lot-k-media-upload-throttle` | #118 | @Throttle(20/min) media upload endpoint |
| L | `lot-l-og-image-route` | #119 | Dynamic OG image generation (/marketplace/og?title=...) |

---

## Impact

- **Sécurité** : Rate-limiting sur 4 endpoints sensibles (catalog, suggest, offers create, media upload), security headers via middleware
- **UX** : Loading skeletons sur 5 nouvelles routes (categories, favorites, how-it-works, dashboard), error boundary dashboard
- **SEO** : JSON-LD Organization vendeurs, OG image dynamique, trailing slash redirect (canonical)
- **DX/Tests** : 20 nouveaux unit tests (HttpExceptionFilter 8 + ResponseInterceptor 6 + LoggingInterceptor 6)
- **i18n** : 22 nouvelles clés (errors + pagination) en fr + en

## Notes techniques

- Middleware matcher exclut `_next/static`, `_next/image`, favicon et assets statiques
- OG image route utilise `runtime = 'edge'` pour perf
- @Throttle au niveau méthode override le limit global (100/min) pour les endpoints annotés
- JSON-LD seller inclut address conditionnelle (country/region/city)

## Rollback

```bash
./deploy/vps/rollback.sh all
```
