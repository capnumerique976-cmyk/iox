/**
 * SEED-DEMO — CLI shim.
 *
 * Délègue toute la logique au runner testable
 * `apps/backend/src/seed-demo/runner.ts`.
 *
 * Activation : `IOX_DEMO_SEED=1 pnpm db:seed:demo` (ou `pnpm --filter @iox/backend seed:demo`).
 * Sans le flag, le script se termine sans rien écrire (no-op silencieux).
 * En `NODE_ENV=production` sans flag, il throw — double opt-in obligatoire.
 */
import { PrismaClient } from '@prisma/client';
import { runDemoSeed } from '../apps/backend/src/seed-demo/runner';

const prisma = new PrismaClient();

runDemoSeed({ prisma, env: process.env, log: (m) => console.log(m) })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
