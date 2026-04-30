# I18N-3 — User.preferredLocale + sync au login

Persiste la locale préférée du user dans la DB. Synchronisation
automatique avec le cookie `NEXT_LOCALE` au login. Endpoint dédié pour
maj depuis le LocaleSwitcher.

## Backend

### Migration Prisma

`prisma/migrations/20260430061049_i18n_3_user_preferred_locale/migration.sql` :

```sql
ALTER TABLE "users" ADD COLUMN "preferred_locale" TEXT NOT NULL DEFAULT 'fr';
```

Strict additive : tous les rows existants prennent `'fr'` au déploy.
Pas de downtime, pas de besoin de backfill.

### Schema

`User.preferredLocale String @default("fr") @map("preferred_locale")`.

### Endpoint

`PATCH /api/v1/users/me/locale` (body `{ locale: 'fr' | 'en' }`) — auth
requise. 400 si locale ≠ fr|en.

### RequestUser

`packages/shared` étendu : `RequestUser.preferredLocale?: string`. La
JWT strategy résout le champ à chaque requête authentifiée.

### Service

`UsersService.updateMyLocale(id, locale)` — update simple. `SAFE_SELECT`
inclut désormais `preferredLocale` (visible dans `/users/me`,
`/auth/login`, etc.).

## Frontend

### Sync au login

`auth.context.tsx` étendu : après `authStorage.save`, pose le cookie
`NEXT_LOCALE` depuis `authUser.preferredLocale` (si fr ou en). Effet :
les server components rendent en bonne locale dès le premier `router.push`
post-login, sans toggle manuel.

### LocaleSwitcher

`components/ui/locale-switcher.tsx` étendu : si user authentifié, appel
best-effort `PATCH /users/me/locale` côté toggle. Si l'appel échoue
(réseau), le cookie reste posé donc l'UI reste cohérente jusqu'au
prochain login (qui réécrira depuis DB).

## Tests

- 0 régression backend (605/605 verts) — auth.service.spec mis à jour
  avec `preferredLocale` dans `mockUser`.
- 0 régression frontend (284/284 verts).

```bash
pnpm --filter @iox/backend exec jest
# Test Suites: 42 passed — Tests: 605 passed

pnpm --filter @iox/frontend exec vitest run
# Test Files: 44 passed — Tests: 284 passed
```

## Décisions

- **Migration additive avec NOT NULL DEFAULT** : pas de downtime, pas
  de backfill nécessaire (les rows existants prennent 'fr' atomiquement).
- **`preferredLocale` dans le JWT au runtime** (pas dans le payload
  JWT signé lui-même) : la JWT strategy résout le champ à chaque requête
  via `usersService.findById`, ce qui garantit que les changements de
  locale sont pris en compte sans re-login.
- **Best-effort `PATCH` côté LocaleSwitcher** : silent fail si réseau —
  l'UX du toggle ne doit pas dépendre du backend (cookie déjà posé).
- **Pas de validation `class-validator` pour locale** : un `if` simple
  dans le controller suffit, le DTO serait sur-ingénierie pour 1 champ
  enum à 2 valeurs.
- **Endpoint `PATCH /users/me/locale`** plutôt que extension de
  `PATCH /users/me` (UpdateMyProfileDto) : permission boundary explicite
  (pas besoin de password current).

## Hors scope (I18N-4+)

- Templates emails par locale (refactor registry templates en
  `rfq-qualified.fr.template.ts` + `rfq-qualified.en.template.ts`).
- Locales additionnelles (ES, AR, ZH).
- Auto-détection initiale au signup (depuis `Accept-Language`).
- Fallback intelligent FR → EN (graceful degradation côté next-intl).
