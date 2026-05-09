# Handoff — Mandat 53

**Date** : 2026-05-02  
**PRs** : #96 → #107 (12 LOTs, squash-merged)  
**Déploiement** : ✅ VPS OK — healthchecks pass  

---

## LOTs livrés

| LOT | Branche | PR | Scope |
|-----|---------|-----|-------|
| A | `lot-a-suggest-category-ui` | #96 | SearchSuggest : support catégories + navigation clavier (ArrowUp/Down/Enter/Escape) + aria-activedescendant |
| B | `lot-b-marketplace-loading` | #97 | Skeletons shimmer pour /marketplace et /marketplace/sellers (catalog + directory) |
| C | `lot-c-mobile-sellers-filters` | #98 | MobileSellersFiltersTrigger — Sheet Radix pour filtres sellers mobile |
| D | `lot-d-rate-limit-toast` | #99 | Toast sonner sur HTTP 429 avec Retry-After countdown |
| E | `lot-e-marketplace-error` | #100 | error.tsx marketplace — error boundary DS Neon avec retry + nav |
| F | `lot-f-jsonld-product` | #101 | JSON-LD schema.org/Product sur fiches produit (SEO rich snippets) |
| G | `lot-g-buyer-rfq-badges` | #102 | Badges RFQ buyer avec dots colorés + pulse NEGOTIATING |
| H | `lot-h-skip-to-content` | #103 | Lien skip-to-content a11y dans marketplace layout |
| I | `lot-i-backend-internal-url` | #104 | docker-compose.vps.example.yml template (BACKEND_INTERNAL_URL) |
| J | `lot-j-etag-interceptor` | #105 | ETagInterceptor backend — conditional 304 + 4 unit tests |
| K | `lot-k-sellers-not-found` | #106 | 404 pages spécifiques sellers + products (DS Neon) |
| L | `lot-l-detail-loading-skeletons` | #107 | Skeletons shimmer pour product detail + seller detail pages |

---

## Impact

- **UX** : Skeletons sur 4 routes marketplace, error boundary, 404 contextuelles, mobile filters
- **SEO** : JSON-LD structured data, skip-to-content
- **Perf** : ETag 304 (bandwidth savings sur GET), rate-limit toast (user feedback)
- **DX/Ops** : docker-compose template, idempotency-key pattern documenté

## Notes techniques

- ETagInterceptor placé dernier dans `useGlobalInterceptors()` → exécute en premier sur response (avant ResponseInterceptor qui wrap en `{ data }`)
- JSON-LD utilise `dangerouslySetInnerHTML` dans `<script type="application/ld+json">` — safe car données serveur-only
- Rate-limit toast dedupliqué via `id: 'rate-limit-429'` (sonner)
- SearchSuggest catégories navigue vers `?categorySlug=slug` (filtrage côté catalog)

## Rollback

```bash
./deploy/vps/rollback.sh all
```
