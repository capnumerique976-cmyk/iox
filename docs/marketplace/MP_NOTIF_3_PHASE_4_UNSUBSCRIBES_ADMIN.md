# MP-NOTIF-3 phase 4 — Page admin désinscriptions

Symétrique de la page `/admin/notif-email/logs`. Liste paginée + filtrée
des `EmailUnsubscribe`. Lecture seule (audit trail).

## Backend

### Endpoint

`GET /api/v1/notif-email/unsubscribes` — `@Roles(ADMIN, COORDINATOR)`.

### DTO query

`ListUnsubscribesQueryDto` :
- `page` int ≥ 1 (défaut 1)
- `limit` int [1, 100] (défaut 20)
- `type` enum `ALL | RFQ_NOTIFICATIONS | TRANSACTIONAL`
- `email` string (contains, insensitive)

### Service

`UnsubscribeService.listUnsubscribes(query)` :
- compose `where` Prisma (type + email contains).
- `orderBy createdAt desc`.
- `Promise.all` count + findMany.
- mapping `createdAt` → ISO string.

## Frontend

### Helper

`apps/frontend/src/lib/notif-email.ts` ajoute :
- `notifEmailApi.listUnsubscribes(params, token)`
- types `EmailUnsubscribeType`, `EmailUnsubscribeItem`, `UnsubscribeListResponse`, `ListUnsubscribesParams`

### Page

`/admin/notif-email/unsubscribes` (`apps/frontend/src/app/(dashboard)/admin/notif-email/unsubscribes/page.tsx`).

Filtres : type select (Tous / ALL / RFQ_NOTIFICATIONS / TRANSACTIONAL),
email contains. Pagination 20/page. Affichage tableau (Email · Type ·
User ID · Raison · Date).

Badges colorés par type :
- `ALL` → rouge (override global)
- `RFQ_NOTIFICATIONS` → orange
- `TRANSACTIONAL` → bleu

## Tests

### Backend

`unsubscribe.service.spec.ts` — 4 nouveaux specs `listUnsubscribes` :
- pagination défaut + orderBy
- filtres type + email contains insensitive
- mapping rows ISO
- limit cappé 100, page min 1

Total `unsubscribe.service.spec` : **12 specs passants** (8 + 4).

### Frontend

`page.test.tsx` — 4 specs :
- rendu lignes (email, type, user, raison)
- empty state
- filtre type ALL
- filtre email contains

Total `/admin/notif-email/*` : **13 specs passants** (4 logs list + 5 logs detail + 4 unsubscribes).

```bash
pnpm --filter @iox/backend exec jest --testPathPattern unsubscribe.service.spec
# Tests: 12 passed

pnpm --filter @iox/frontend exec vitest run "src/app/(dashboard)/admin/notif-email"
# Test Files 3 passed — Tests 13 passed
```

## Décisions

- **Pas de mutation** : la table est immutable (audit trail). Pour
  réinscrire un user, il faut DELETE row côté DB (admin manuel) — pas
  d'endpoint exposé V1.
- **Pas d'export CSV** : reportée à phase 5+ avec stats agrégées.
- **Aucun click-through user/email** : symétrique avec EmailLog (page
  détail si pertinent en phase 5+).

## Hors scope

- Endpoint DELETE `/notif-email/unsubscribes/:id` (re-souscrire).
- Détail unitaire `/admin/notif-email/unsubscribes/[id]`.
- Export CSV.
- Statistiques agrégées (% opt-out par type, par jour).
