# Marketplace B2B Export — MVP

Ce document décrit le module marketplace tel que livré au terme des phases
P9 → P13 + finition MVP. Il sert de référence pour les équipes produit,
qualité et intégration.

## 1. Vue d'ensemble

La marketplace IOX est une place de marché B2B export qui met en relation :

- **Sellers** (producteurs Mayotte) — créent profil vendeur, produits, médias,
  documents et offres.
- **Quality / Admin** — modèrent profils, produits, médias, documents et
  publient / suspendent les offres.
- **Buyers** (importateurs, distributeurs) — consultent le catalogue public,
  demandent un devis (RFQ), échangent avec le vendeur.

Les modules Nest et pages Next concernés :

| Domaine               | Backend                  | Frontend                                          |
| --------------------- | ------------------------ | ------------------------------------------------- |
| Profils vendeurs      | `seller-profiles/`       | `seller/profile/`, `admin/review-queue/`          |
| Médias                | `media-assets/`          | composants `MediaUploader`, `MediaGallery`        |
| Produits marketplace  | `marketplace-products/`  | `seller/products/`, `marketplace/products/[slug]` |
| Offres marketplace    | `marketplace-offers/`    | `seller/offers/`, `marketplace/products/[slug]`   |
| Documents marketplace | `marketplace-documents/` | `seller/documents/[type]/[id]`, fiche produit     |
| Review queue          | `marketplace-review/`    | `admin/review-queue/`                             |
| Catalogue public      | `marketplace-catalog/`   | `marketplace/`, `marketplace/sellers/[slug]`      |
| RFQ                   | `quote-requests/`        | `quote-requests/`, `quote-requests/new`           |

## 2. Règles de visibilité publique

Quatre projections sont appliquées côté backend (`marketplace-catalog.service.ts`)
et répliquées dans le mock SSR E2E (`e2e/helpers/ssr-mock-server.mjs`) :

| Projection         | Condition                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `isOfferPublic`    | `status ∉ {ARCHIVED, SUSPENDED, DRAFT}` ∧ `isPublished = true` ∧ `publishedAt ≤ now`       |
| `isProductPublic`  | Au moins une offre publique ∧ seller `status ≠ SUSPENDED` ∧ produit `status = PUBLISHED`   |
| `isMediaPublic`    | `moderationStatus = APPROVED`                                                              |
| `isDocumentPublic` | `visibility = PUBLIC` ∧ `verificationStatus = VERIFIED` ∧ (`validUntil` absent ou `> now`) |

**Règles dérivées** (verrouillées par les E2E P13-E) :

- Un seller `SUSPENDED` rend la fiche produit publique en 404, même si offres
  et médias sont valides.
- Une offre `SUSPENDED` ou `DRAFT` retire le produit du catalogue.
- Un document expiré (`validUntil < now`) disparaît de la fiche publique sans
  avoir à être re-modéré.
- Un média `REJECTED` ou `PENDING` laisse le placeholder "Pas d'image".

## 3. Machine à états

### Produit marketplace (`MarketplacePublicationStatus`)

```
DRAFT ──submit──▶ IN_REVIEW ──approve──▶ APPROVED ──publish──▶ PUBLISHED
                         └──reject──▶ REJECTED ──submit──▶ IN_REVIEW
                                                      PUBLISHED ──suspend──▶ SUSPENDED
                                                      any ──archive──▶ ARCHIVED
```

Toute modification de champ "vitrine" (commercialName, descriptions, packaging…)
d'un produit `APPROVED` ou `PUBLISHED` repasse automatiquement en `IN_REVIEW`.

### Offre marketplace

- `DRAFT` → `PUBLISHED` nécessite produit `PUBLISHED`, seller `APPROVED`, et
  image principale `APPROVED`.
- `SUSPENDED` retire l'offre du public instantanément.

### RFQ (`QuoteRequestStatus`)

`ALLOWED_TRANSITIONS` dans `quote-requests.service.ts` :

| De                   | Vers autorisés                            |
| -------------------- | ----------------------------------------- |
| `NEW`                | `QUALIFIED`, `CANCELLED`, `LOST`          |
| `QUALIFIED`          | `QUOTED`, `CANCELLED`, `LOST`             |
| `QUOTED`             | `NEGOTIATING`, `WON`, `LOST`, `CANCELLED` |
| `NEGOTIATING`        | `QUOTED`, `WON`, `LOST`, `CANCELLED`      |
| `WON/LOST/CANCELLED` | — (terminal)                              |

Côté UI, le buyer voit uniquement `CANCELLED` ; `WON/LOST` sont réservés au
vendeur et au staff.

### Note interne (RFQ)

Les messages avec `isInternalNote = true` sont filtrés à la source :
`quote-requests.service.findMessages` masque ces entrées pour le rôle
`MARKETPLACE_BUYER`. L'UI retire aussi la case "Note interne" côté buyer.

## 4. Flux end-to-end (cibles des E2E P13)

1. **Seller** prépare le bundle : profil, produit, médias, documents PUBLIC,
   offre (DRAFT). Les éléments entrent en `PENDING` / `IN_REVIEW`.
2. **Admin / Quality** approuve médias + documents depuis
   `/admin/review-queue`, puis publie l'offre.
3. **Buyer public** consulte le catalogue SSR ; la fiche rend uniquement les
   items validés (cf. §2).
4. **Buyer connecté** clique "Demander un devis" → `/login?redirect=…` → le
   buyer atterrit sur `/quote-requests/new?offerId=…` après login.
5. **Seller** répond dans le fil, éventuellement avec notes internes invisibles
   pour le buyer ; fait progresser la RFQ dans la machine d'états.

## 5. Harness E2E

- **Routes dashboard** : `page.route('**/api/v1/**')` avec state machines en
  mémoire (`e2e/helpers/marketplace.ts`, `marketplace-documents.ts`).
- **Routes SSR publiques** : mock HTTP séparé sur `:3199`
  (`e2e/helpers/ssr-mock-server.mjs`), Next proxy via
  `BACKEND_INTERNAL_URL=http://127.0.0.1:3199`.
- **Cache** : `NEXT_PUBLIC_E2E=1` force `cache: 'no-store'` dans
  `lib/marketplace/api.ts`, garantissant qu'aucune réponse n'est mise en cache
  entre deux `ssrMock.reset()`.
- **Contrôle plan mock SSR** : `POST /__e2e/reset`, `POST /__e2e/seed`,
  `POST /__e2e/patch`, `GET /__e2e/state`.

Scénarios couverts (spec `e2e/marketplace-global.spec.ts`) :

| Code  | Scénario                                                                          |
| ----- | --------------------------------------------------------------------------------- |
| P13-A | Seller publie bundle → doc PENDING + review-queue + 404 public                    |
| P13-B | Admin approuve bundle → fiche publique montre image + doc                         |
| P13-C | Visibilité multi-médias + multi-docs + catalogue filtré                           |
| P13-D | CTA public → login?redirect → RFQ créée + note interne filtrée                    |
| P13-E | Seller/offre SUSPENDED 404, doc rejeté/expiré invisible, média rejeté placeholder |
| P13-F | Login `?redirect=…` (happy path + anti open-redirect)                             |

## 6. Limites connues (cf. `docs/GO-LIVE-CHECKLIST.md`)

- **Ownership seller** : les endpoints `PATCH` produit/offre/profil/document
  n'enforcent pas encore que le seller authentifié possède la ressource (le
  modèle User n'a pas de `companyId`/`sellerProfileId`). Défense en profondeur
  à ajouter en V2, voir `docs/MARKETPLACE.md#mvp-closure`.
- **Notifications e-mail** non branchées (approval, rejet, RFQ reçue).
- **Next `build` de production** jamais exécuté dans la boucle E2E — seul
  `next dev` l'est. À couvrir en préprod.

## 7. Matrice de validation

Commandes à exécuter avant merge :

```bash
pnpm --filter @iox/backend  exec tsc --noEmit
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/backend  lint
pnpm --filter @iox/frontend lint
pnpm --filter @iox/backend  test
pnpm --filter @iox/frontend test
pnpm --filter @iox/frontend exec playwright test
```

État au terme du MVP marketplace (cf. rapport de clôture) :
backend **345/345**, frontend **46/46**, Playwright **30/30**.
