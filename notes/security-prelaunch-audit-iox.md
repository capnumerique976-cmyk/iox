# IOX — Audit sécurité pré-production
**Date :** 2026-05-10
**Branche :** main
**Auditeur :** Claude Sonnet 4.6 (analyse statique — lecture seule, aucun code modifié)

---

## Résumé exécutif

| # | Catégorie | Statut | Criticité |
|---|---|---|---|
| 1 | Secrets & Env validation | ⚠️ | Haute |
| 2 | Authentification & Guards | ✅ | — |
| 3 | Rate limiting | ✅ | — |
| 4 | CORS | ⚠️ | Moyenne |
| 5 | Input validation (DTOs) | ⚠️ | Moyenne |
| 6 | Stripe webhook security | ✅ | — |
| 7 | File uploads | ✅ | — |
| 8 | Endpoints admin | ✅ | — |
| 9 | Bull Board | ✅ | — |
| 10 | Headers sécurité Next.js | ⚠️ | Faible |

**Score global : 7 ✅ / 3 ⚠️ / 0 ❌**

---

## 1. Secrets & Env validation

**Fichiers examinés :**
- `apps/backend/src/common/config/env.validation.ts`
- `apps/backend/.env.example`
- `apps/backend/.env` (fichier local, non tracké git)

### Ce qui est bien fait ✅

- `validateEnv()` s'exécute au démarrage via `ConfigModule.forRoot({ validate: validateEnv })` — le backend refuse de booter si un secret est absent ou trop court.
- `JWT_SECRET` et `JWT_REFRESH_SECRET` sont requis (`MinLength(32)`) — pas de token trop court possible.
- `MINIO_ACCESS_KEY` (`MinLength(3)`) et `MINIO_SECRET_KEY` (`MinLength(8)`) sont requis.
- La fonction `assertNoPlaceholder()` interdit explicitement les valeurs de démo (`change-me`, `minioadmin`, `secret`, `password`, etc.) en `staging` et `production`.
- Elle vérifie aussi que `JWT_SECRET !== JWT_REFRESH_SECRET` (rotation de tokens).
- Le `.gitignore` root exclut tous les `*.env` et `.env.*` sauf `.env.example`.
- Le `.env` local (dev) n'est pas tracké par git — confirmé par `git ls-files`.
- Aucun secret réel Stripe (`sk_live_`, `whsec_`) dans le fichier `.env.example`.

### Problèmes identifiés ⚠️

**1.1 — STRIPE_SECRET_KEY est `@IsOptional()` en env-validation**
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et `STRIPE_PUBLISHABLE_KEY` sont marqués optionnels dans `EnvSchema`. La documentation indique "si absent : les endpoints throwent au call time". Cela signifie qu'un démarrage en production sans clé Stripe **ne sera pas bloqué au boot** — une erreur ne surgira qu'au premier appel paiement. En production avec paiements actifs, cette omission devrait lever une erreur de démarrage.

**Recommandation :** Ajouter une assertion conditionnelle dans `assertNoPlaceholder()` : si `APP_ENV === 'production'` et que `STRIPE_SECRET_KEY` est absent, throw une erreur explicite.

**1.2 — METRICS_TOKEN est optionnel sans avertissement**
Si `METRICS_TOKEN` n'est pas défini, `/api/v1/metrics` est **public** (exposé à tout internet). L'endpoint retourne des métriques Prometheus pouvant révéler des informations opérationnelles (compteurs de requêtes, erreurs, latences). Acceptable derrière un réseau privé/mesh k8s, mais risqué si le port backend est exposé directement.

**Recommandation :** Documenter explicitement dans le runbook de déploiement que `METRICS_TOKEN` doit être défini en production si le backend est accessible publiquement. Idéalement, ajouter un `console.warn` au démarrage si `isProd && !METRICS_TOKEN`.

**1.3 — `.env` local avec credentials de démo commité dans le worktree (non tracké)**
Le fichier `apps/backend/.env` existe sur disk avec `APP_ENV="development"` et les credentials MinIO `minioadmin/minioadmin`. Il n'est pas tracké par git, donc pas de risque de fuite via le repo. Mais s'il était accidentellement ajouté (ex. `git add -A`), le `.gitignore` le protège grâce à `*.env` et `.env.*`.

---

## 2. Authentification & Guards

**Fichiers examinés :**
- `apps/backend/src/auth/guards/jwt-auth.guard.ts`
- `apps/backend/src/auth/guards/roles.guard.ts`
- `apps/backend/src/app.module.ts`
- `apps/backend/src/main.ts`

### Ce qui est bien fait ✅

**JwtAuthGuard :** Enregistré globalement via `APP_GUARD`. Toutes les routes sont protégées par défaut. Les routes publiques sont opt-in via `@Public()` (decorator `SetMetadata('isPublic', true)`). Pas de bypass possible par classe — la vérification combine handler ET classe via `getAllAndOverride`.

**RolesGuard :** Enregistré globalement après `JwtAuthGuard`. Si `requiredRoles` est vide, la route passe (comportement attendu pour les routes sans restriction de rôle mais avec auth). Si l'utilisateur est `ADMIN`, il a accès à tout (super-admin cohérent). Les utilisateurs sans rôle requis reçoivent un `ForbiddenException` avec message explicite.

**Swagger désactivé en production :** `main.ts` ligne 132 : `if (env !== 'production')` — Swagger n'est monté que hors production. Note : le Swagger est aussi actif en `staging` — acceptable si staging n'est pas public, mais à surveiller.

**Ordre des guards :** `ThrottlerGuard → JwtAuthGuard → RolesGuard` — le rate-limit s'applique avant l'auth, ce qui protège `/auth/login` contre le brute-force même sans token.

**Routes @Public() légitimes recensées :**
- `POST /auth/login`, `POST /auth/register` (avec `@Throttle` personnalisé)
- `GET /health`, `GET /health/ready`, `GET /health/live`
- `GET /metrics` (token optionnel)
- `POST /payments/webhook` (signature Stripe vérifiée en interne)
- `GET /search`, `GET /search/suggestions` (catalogue public)
- `GET /marketplace/catalog/*` (6 endpoints catalogue public)
- `GET /notif-email/unsubscribe` (désinscription email tokenisée)

Aucune route administrative ou mutation de données n'est annotée `@Public()`.

---

## 3. Rate limiting

**Fichiers examinés :**
- `apps/backend/src/app.module.ts`
- Résultat grep `@Throttle` dans `src/`

### Ce qui est bien fait ✅

**Throttle global :** `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])` — 100 requêtes par 60 secondes par IP pour toutes les routes. Appliqué en premier guard.

**Throttles spécifiques renforcés :**

| Route | Limite | TTL |
|---|---|---|
| `POST /auth/login` | 10 req | 60s |
| `POST /auth/register` | 30 req | 60s |
| `POST /marketplace/media-assets/upload` | 20 req | 60s |
| `GET /search` | 60 req | 60s |
| `GET /search/suggestions` | 60 req | 60s |
| `POST /marketplace-products` (création) | 10 req | 60s |
| `POST /quote-requests` (création RFQ) | **5 req** | 60s |
| `PATCH /quote-requests/:id/status` | 20 req | 60s |
| `POST /marketplace-offers` (création offre) | 10 req | 60s |
| `GET /marketplace/catalog` (classe entière) | 60 req | 60s |
| `GET /marketplace/catalog/:id` | 30 req | 60s |

Le throttle sur la création de RFQ (5/min) est particulièrement serré — approprié pour éviter le spam de demandes de devis.

**Note :** En production derrière un reverse proxy, `app.set('trust proxy', 1)` est activé pour que le rate-limit utilise l'IP réelle (via `X-Forwarded-For`) et non l'IP du proxy.

---

## 4. CORS

**Fichier examiné :** `apps/backend/src/main.ts`

### Ce qui est bien fait ✅

- Whitelist stricte d'origines : seuls `FRONTEND_URL` et `FRONTEND_URLS` (CSV optionnel) sont autorisés.
- La fonction origin callback rejette explicitement toute origine non listée avec une erreur nommée.
- `credentials: true` pour les cookies httpOnly.
- Méthodes HTTP restreintes : `GET, POST, PUT, PATCH, DELETE, OPTIONS`.

### Problèmes identifiés ⚠️

**4.1 — Requêtes sans `Origin` header autorisées**
Ligne 92 : `if (!origin) return cb(null, true)` — les requêtes sans header `Origin` (curl, outils server-to-server, certains health checks) sont autorisées sans vérification. En théorie, CORS ne s'applique qu'aux navigateurs, donc un attaquant utilisant curl peut déjà contourner CORS. Mais cette clarification devrait être documentée : la protection réelle contre les accès non autorisés repose sur JWT, pas sur CORS.

**4.2 — `serverActions.allowedOrigins` en Next.js hardcodé sur `localhost:3000`**
Dans `apps/frontend/next.config.mjs` ligne 13 : `allowedOrigins: ['localhost:3000']`. En production, les Server Actions Next.js seront bloquées si l'origine de la requête n'est pas `localhost:3000`. Il faut mettre l'URL de production ici.

**Recommandation :** Remplacer par `process.env.NEXT_PUBLIC_APP_URL ?? 'localhost:3000'` et configurer `NEXT_PUBLIC_APP_URL` en production.

---

## 5. Input validation (DTOs)

**Fichiers examinés :**
- `apps/backend/src/payments/dto/payments.dto.ts`
- `apps/backend/src/quote-requests/dto/quote-request.dto.ts`
- `apps/backend/src/media-assets/dto/media-asset.dto.ts`

### Ce qui est bien fait ✅

- `ValidationPipe` global avec `whitelist: true, forbidNonWhitelisted: true, transform: true` — les propriétés inconnues sont rejetées automatiquement.
- DTOs payments : `@IsUUID()` sur les IDs, `@IsInt() @Min(50)` sur `amountCents` (min Stripe), `@IsUrl()` sur les URLs de retour.
- DTOs quote-requests : `@MaxLength(4000)` sur les messages, `@MaxLength(20)` sur les unités, `@IsEnum(QuoteRequestStatus)` sur les transitions de statut.
- DTOs media-assets : `@ArrayMaxSize(50)` sur le bulk reorder, `@ValidateNested` récursif.

### Problèmes identifiés ⚠️

**5.1 — `currency` non contraint par enum dans le DTO payment**
Dans `CreateCheckoutSessionDto`, le champ `currency` est `@IsOptional() @IsString()` — pas de `@IsIn(['EUR', 'USD'])` ou `@IsEnum()`. La validation de la devise est déléguée à la fonction `normalizeCurrency()` dans le service, qui throw un `BadRequestException`. La protection existe mais elle est côté service, pas côté DTO — ce qui signifie qu'une valeur invalide traverse la désérialisation. C'est un écart de "defense in depth" : la validation devrait être au plus tôt dans le pipeline.

**Recommandation :** Ajouter `@IsIn(['EUR', 'USD', 'eur', 'usd'])` ou `@IsEnum(SupportedCurrency)` dans le DTO.

---

## 6. Stripe webhook security

**Fichiers examinés :**
- `apps/backend/src/payments/payments.controller.ts`
- `apps/backend/src/main.ts` (rawBody hook)

### Ce qui est bien fait ✅

La sécurité Stripe webhook est **rigoureusement implémentée** :

1. **Body raw préservé :** `main.ts` injecte `req.rawBody = Buffer.from(buf)` uniquement pour les URLs contenant `/payments/webhook` — nécessaire pour la vérification HMAC de Stripe.
2. **Signature obligatoire :** Si le header `stripe-signature` est absent → `400 BadRequest`.
3. **Secret requis :** Si `STRIPE_WEBHOOK_SECRET` n'est pas configuré → `400 BadRequest` (pas de fallback silencieux).
4. **`stripe.webhooks.constructEvent()`** est appelé avec `(rawBody, signature, webhookSecret)` — l'API officielle Stripe qui valide la signature HMAC-SHA256 et le timestamp (protection contre le replay).
5. En cas d'échec de vérification → `BadRequestException` avec log `warn`.
6. L'endpoint est `@Public()` (Stripe ne peut pas s'authentifier par JWT), ce qui est le comportement correct — la sécurité repose entièrement sur la vérification de signature.

---

## 7. File uploads

**Fichiers examinés :**
- `apps/backend/src/media-assets/media-assets.controller.ts`
- `apps/backend/src/media-assets/media-assets.service.ts`
- `apps/backend/src/media-assets/dto/media-asset.dto.ts`

### Ce qui est bien fait ✅

- **MIME type validé côté service** (pas seulement client) : `file.mimetype` est vérifié contre des listes blanches.
  - Images : `['image/jpeg', 'image/png', 'image/webp']`
  - Vidéos : `['video/mp4', 'video/webm', 'video/quicktime']`
  - Tout autre MIME → `BadRequestException`.
- **Taille limitée côté service :**
  - Images : 5 MB max (`MEDIA_MAX_BYTES = 5 * 1024 * 1024`)
  - Vidéos : 50 MB max (`MEDIA_VIDEO_MAX_BYTES = 50 * 1024 * 1024`)
- **Body limit global** : 2 MB par défaut pour JSON/urlencoded (Multer a sa propre limite pour multipart).
- **Stockage en mémoire** (`memoryStorage()`), jamais écrit en clair sur disque local — transféré directement vers MinIO.
- **Throttle upload** : 20 req/min.
- **Auth requise** : l'endpoint upload est protégé par `JwtAuthGuard + RolesGuard` avec `@Roles(SELLER_ROLES)`.

**Note mineure :** Multer en `memoryStorage` sans `limits` configurés dans le `FileInterceptor` lui-même signifie que la limite de taille est appliquée côté service après réception complète du fichier en mémoire. En cas de fichier très lourd (ex. 200 MB), la mémoire Node sera consommée avant le rejet. Pour mitiger, ajouter `limits: { fileSize: 50 * 1024 * 1024 }` dans `FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 50_000_000 } })`.

---

## 8. Endpoints admin

**Fichiers examinés :**
- Résultat grep `@Roles(UserRole.ADMIN)` sur tout `src/`

### Ce qui est bien fait ✅

Tous les endpoints identifiés avec `@Roles(UserRole.ADMIN)` sont correctement protégés :

| Module | Endpoints protégés |
|---|---|
| `users.controller.ts` | Gestion utilisateurs (4 endpoints) |
| `marketplace-categories.controller.ts` | CRUD catégories (3 endpoints) |
| `notif-email.controller.ts` | Envoi email admin |
| `search.controller.ts` | Réindexation MeiliSearch |
| `incidents.controller.ts` | Clôture incidents |

Le guard `RolesGuard` est global — il s'exécute sur toutes les routes. Les endpoints admin héritent aussi de `JwtAuthGuard` global. Un utilisateur non ADMIN reçoit un `403 ForbiddenException`.

---

## 9. Bull Board

**Fichiers examinés :**
- `apps/backend/src/queue/bull-board-auth.middleware.ts`
- `apps/backend/src/queue/queue.module.ts`

### Ce qui est bien fait ✅

- Le middleware `bullBoardAuthMiddleware(jwtSecret)` protège `/admin/queues`.
- **Double vérification :** (1) présence du token Bearer, (2) rôle `ADMIN` dans le payload JWT.
- Token absent ou invalide → `401`.
- Token valide mais rôle != ADMIN → `403`.
- Le middleware utilise `JwtService.verify()` avec le même secret que l'auth principale.
- La route `/admin/queues` est exclue du préfixe global `api/v1` (ligne 104-107 de `main.ts`) — accessible directement, ce qui est intentionnel pour Bull Board.
- Le secret JWT est injecté via `ConfigService` (async factory) — pas de secret hardcodé.

---

## 10. Headers sécurité Next.js (frontend)

**Fichiers examinés :**
- `apps/frontend/next.config.mjs`
- `apps/frontend/src/middleware.ts`

### Ce qui est bien fait ✅

**`next.config.mjs` headers (toutes routes `/(.*}`) :**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

**`middleware.ts` (edge middleware) :**
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy` renforcée avec `interest-cohort=()`
- `X-Frame-Options: SAMEORIGIN` pour les routes non-API

### Problèmes identifiés ⚠️

**10.1 — Incohérence `X-Frame-Options` entre `next.config.mjs` et `middleware.ts`**

- `next.config.mjs` applique `X-Frame-Options: DENY` sur `/(.*)`
- `middleware.ts` applique `X-Frame-Options: SAMEORIGIN` sur les routes non-API

Ces deux couches se superposent. En pratique, la valeur effective dépend de l'ordre de résolution des headers HTTP. `DENY` (plus restrictif) est la valeur correcte pour une marketplace — `SAMEORIGIN` dans le middleware devrait être `DENY` pour être cohérent.

**Recommandation :** Aligner `middleware.ts` sur `DENY`, ou supprimer la définition dans `middleware.ts` et laisser `next.config.mjs` faire autorité.

**10.2 — Absence de CSP (Content-Security-Policy) côté frontend**

`next.config.mjs` ne définit pas de header `Content-Security-Policy`. Le backend NestJS a une CSP stricte pour l'API (Helmet), mais le frontend Next.js (pages HTML, scripts) n'a pas de CSP. Une CSP frontend empêcherait les attaques XSS en limitant les sources de scripts.

**Recommandation :** Ajouter une CSP dans `next.config.mjs` headers. Exemple minimal pour une app Next.js :
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.stripe.com;
```
(Note : `unsafe-eval` peut être requis par Next.js en dev, à désactiver en prod.)

**10.3 — HSTS absent côté frontend**

`next.config.mjs` ne définit pas `Strict-Transport-Security`. Le backend NestJS active HSTS en production (`maxAge: 31536000, includeSubDomains: true`), mais si le frontend est servi indépendamment (reverse proxy différent), HSTS doit aussi être défini côté Next.js.

**Recommandation :** Ajouter conditionellement (si prod) :
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## Annexe — Points de vigilance opérationnels

### A. Swagger visible en staging

`main.ts` désactive Swagger uniquement si `env === 'production'`. En staging, `/api/docs` est accessible et expose la totalité de l'API. Si staging est accessible publiquement (URL de preview), Swagger révèle la structure des endpoints, les schémas de données, et les exemples.

**Recommandation :** Ajouter une auth basique sur `/api/docs` en staging, ou désactiver Swagger si `isProd` (c'est-à-dire `env === 'production' || env === 'staging'`).

### B. REDIS_URL sans authentification par défaut

`REDIS_URL` est optionnel et par défaut sans mot de passe (`redis://localhost:6381`). En production, Redis devrait être configuré avec un mot de passe (`redis://:password@host:port`). La validation d'env ne l'impose pas.

### C. `DATABASE_URL` dupliquée dans `.env` local

Le fichier `apps/backend/.env` définit `DATABASE_URL` deux fois (lignes 18 et 29). Bien que le dernier écrase le premier, cela indique une erreur de copier-coller qui peut générer de la confusion. À nettoyer avant la mise en production.

---

## Décision

### NO-GO — avec 3 conditions bloquantes avant mise en production

Les conditions suivantes doivent être résolues avant le lancement :

**Condition 1 (Haute) :** Vérifier que `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` sont définis et non-vides en production. Ajouter une assertion dans `assertNoPlaceholder()` pour bloquer le démarrage si `APP_ENV === 'production'` et que ces variables sont absentes.

**Condition 2 (Haute) :** Corriger `serverActions.allowedOrigins` dans `apps/frontend/next.config.mjs` pour inclure le domaine de production (pas seulement `localhost:3000`), sinon les Server Actions Next.js seront bloquées en production.

**Condition 3 (Moyenne) :** Aligner `X-Frame-Options` entre `next.config.mjs` (`DENY`) et `src/middleware.ts` (`SAMEORIGIN`). Utiliser `DENY` partout.

### Améliorations recommandées (non bloquantes)

- Ajouter CSP dans `next.config.mjs` (protection XSS frontend).
- Ajouter HSTS dans `next.config.mjs` headers (si Next.js est servi indépendamment).
- Ajouter `@IsIn(['EUR', 'USD'])` sur le champ `currency` du DTO `CreateCheckoutSessionDto`.
- Ajouter `limits: { fileSize: 50_000_000 }` dans `FileInterceptor` pour rejeter les fichiers trop volumineux avant chargement en mémoire.
- Documenter / alerter au boot si `METRICS_TOKEN` est absent en production.
- Désactiver Swagger en staging ou le protéger par auth.
- Nettoyer la duplication de `DATABASE_URL` dans `.env`.
