# Auth specs — exécution locale

## TL;DR

Au mandat 36 (avril 2026), les specs auth backend passent en local **sans config supplémentaire** :

```
$ pnpm --filter @iox/backend test src/auth
PASS src/auth/dto/refresh.dto.spec.ts
PASS src/auth/auth.service.spec.ts
Test Suites: 2 passed, 2 total
Tests:       28 passed, 28 total
```

Suite complète backend également verte : **51 suites, 673 tests**.

## Historique du fail

Un fail historique avait été observé en local depuis `39bfbd0` (L9-5 metrics auth instrumentation), avec env-dépendance sur la machine dev. La situation a été résolue depuis — probablement par les commits I18N-3 `0040929` (#46) et `41eedd6` (#47) qui ont remanié `auth.service.spec.ts` et ses providers. Aucun fix dédié requis lors du méga-mandat 36.

## Cause probable de l'historique

- Les mocks Prisma de `auth.service.spec.ts` n'incluaient initialement pas tous les nouveaux champs ajoutés par les migrations (`preferredLocale`, etc.).
- Les PR I18N-3 ont aligné les mocks Prisma avec le shape `User` complet (incluant `preferredLocale`).

## Pré-requis env

Aucun `.env.test` requis pour les specs unitaires actuels (mocks Prisma in-memory, pas de connexion DB réelle, JWT secrets injectés via mocks `ConfigService`).

Si dans le futur des specs nécessitent des env vars réelles (e.g. e2e jest `test/jest-e2e.json`), créer un `.env.test` avec :

```
JWT_SECRET=dummy-jwt-secret-for-tests-only
JWT_REFRESH_SECRET=dummy-refresh-secret-for-tests-only
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800
BCRYPT_ROUNDS=4
DATABASE_URL=postgresql://iox_test:iox_test@localhost:5433/iox_test
```

(Valeurs dummy non-secrètes, OK à committer.)

## Lancer les specs auth

```bash
# Specs auth uniquement
pnpm --filter @iox/backend test src/auth

# Suite backend complète
pnpm --filter @iox/backend test

# Watch mode
pnpm --filter @iox/backend test:watch src/auth
```

## En cas de régression future

1. Vérifier que `Test.createTestingModule` mocke `PrismaService` avec le shape `User` complet (notamment `preferredLocale`).
2. Vérifier les providers `MetricsService`, `AuditService`, `ConfigService` — tous mockés in-memory.
3. Vérifier que `bcrypt.hash` mock n'attend pas un round count précis (utiliser `jest.fn()` neutre).
4. Si fail uniquement local et vert en CI : suspecter env vars locales polluant le test (e.g. `NODE_ENV=production` exporté dans le shell).
