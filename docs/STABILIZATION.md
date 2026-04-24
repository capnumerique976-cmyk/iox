# Stabilisation technique — IOX

Ce document décrit les fondations techniques mises en place avant reprise du développement métier.

## 1. CI (`.github/workflows/ci.yml`)

Déclenché sur `push` / `pull_request` vers `main` et `develop`.

**Jobs** :

- `install` : setup pnpm + cache, `prisma generate`, build `@iox/shared`
- `backend` : typecheck, lint (max 100 warnings), jest, build
- `frontend` : typecheck, lint (max 50 warnings), vitest, build Next
- `summary` : échoue si l'un des deux jobs principaux a échoué

Concurrency group par ref ⇒ annule les runs obsolètes.

## 2. Tests

### Backend

- Framework : Jest + ts-jest
- 16 suites, 118 tests
- Lancer : `cd apps/backend && npx jest`

### Frontend

- Framework : Vitest + @testing-library/react + jsdom
- Setup : `vitest.config.ts`, `vitest.setup.ts`
- 3 suites, 21 tests critiques :
  - `lib/auth.test.ts` — authStorage, hasPermission, ROLE_LABELS
  - `lib/api.test.ts` — client HTTP, ApiError, unwrap `{ data }`, erreurs HTML
  - `lib/utils.test.ts` — `cn` class-name merger
- Lancer : `cd apps/frontend && npx vitest run`

## 3. Observabilité

### Request-id

Middleware `RequestIdMiddleware` (`src/common/middleware/`) attache un UUID à chaque requête (ou réutilise `x-request-id` si présent). Exposé sur la réponse.

### Logging HTTP structuré

`LoggingInterceptor` (`src/common/interceptors/`) émet un JSON par requête :

```json
{
  "requestId": "…",
  "method": "GET",
  "url": "/api/v1/…",
  "status": 200,
  "durationMs": 12,
  "userId": "u-1"
}
```

Prêt à être ingéré par Loki / Datadog / CloudWatch.

### Rate limiting

- Global : 100 req / 60s par IP (via `ThrottlerGuard`)
- `/auth/login` : 10 req / 60s (anti brute-force)
- `/auth/refresh` : 30 req / 60s

### Health

- `GET /api/v1/health/live` — liveness (process vivant, uptime)
- `GET /api/v1/health` — readiness (Postgres ping + config MinIO)

## 4. Qualité

### Lint frontend (réparé)

Downgrade `eslint` à `^8.57.0` dans `apps/frontend` (incompatibilité ESLint 9 / next-lint 14). Config `.eslintrc.json` étend `next/core-web-vitals`.

### Toasts globaux

`sonner` intégré dans `app/layout.tsx` (top-right, richColors). Remplace les `catch { /* silent */ }` sur les pages critiques (ex. distributions).

## 5. Scripts disponibles

Racine :

- `pnpm lint` — tous les workspaces
- `pnpm test` — tous les workspaces
- `pnpm build` — tous les workspaces
- `pnpm db:generate` / `db:migrate` / `db:seed`

Backend :

- `pnpm --filter @iox/backend test`
- `pnpm --filter @iox/backend lint`
- `pnpm --filter @iox/backend build`

Frontend :

- `pnpm --filter @iox/frontend test`
- `pnpm --filter @iox/frontend lint`
- `pnpm --filter @iox/frontend build`
