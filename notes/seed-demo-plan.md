# SEED-DEMO — plan

Branche : `seed-demo-marketplace-fixtures` (depuis `main` à `3c00c6f`).

## Architecture

- `apps/backend/src/seed-demo/runner.ts` — fonction `runDemoSeed({ prisma, env, log })`
  testable, contient toute la logique d'upsert + garde-fous.
- `apps/backend/src/seed-demo/dataset.ts` — données déclaratives (4 sellers,
  8 produits, 8 offres, 6 certifs, 1 smoke-seller).
- `apps/backend/src/seed-demo/seed-demo.spec.ts` — Jest, mock Prisma.
  Note : `prisma/seed-demo.spec.ts` ne fonctionnerait pas (jest `rootDir=src`),
  on garde donc le spec à côté du runner.
- `prisma/seed-demo.ts` — CLI shim (PrismaClient + appel runner + disconnect).
- Scripts npm : `db:seed:demo` (root) et `seed:demo` (apps/backend, forwarding).
- `docs/marketplace/SEED_DEMO.md` — runbook + identifiants smoke-seller.

## Garde-fous

1. `IOX_DEMO_SEED !== '1'` → no-op silencieux + log.
2. `NODE_ENV === 'production' && IOX_DEMO_SEED !== '1'` → throw.
3. Toutes les clés naturelles préfixées `demo-` (slugs, codes Company,
   codes Product, codes Beneficiary).
4. Tous les emails sur `@iox.test` sauf `smoke-seller@iox.mch` (compte
   contractuel pour le smoke authentifié).

## Commits cibles

1. `chore(notes): plan SEED-DEMO`
2. `feat(backend): seed-demo runner skeleton + flag gating + prod safeguard`
3. `feat(backend): seed-demo dataset (sellers + products + offers + certifs)`
4. `test(backend): seed-demo idempotence + safeguards`
5. `docs: SEED_DEMO operations runbook`
6. `chore(notes): SEED-DEMO handoff`

## Hors-scope

- Pas de modification du seed de référence `prisma/seed.ts`.
- Pas de migration ni schéma.
- Pas de medias S3 réels — `logoMediaId`/`bannerMediaId` restent des UUID
  stables non-résolvables (cf. `SellerCard` sait gérer ce cas en placeholder).
- Pas de UI admin de pilotage.
