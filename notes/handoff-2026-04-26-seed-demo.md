# Handoff — SEED-DEMO marketplace

Date : 2026-04-26
Branche : `seed-demo-marketplace-fixtures` (5 commits au-dessus de `main` à `3c00c6f`).
Statut : **prêt à pousser** — aucun push/PR/merge effectué côté agent.

## Ce qui a été livré

Seed démo marketplace **idempotent**, gated par `IOX_DEMO_SEED=1`, peuplant
la base avec :

- 4 sellers `APPROVED` (dont 2 `isFeatured`) avec descriptions complètes
- 8 produits marketplace `PUBLISHED` (FP-1 saisonnalité + FP-6 origine fine + descriptions)
- 8 offres marketplace `PUBLISHED` (mix `FIXED` / `FROM_PRICE` / `QUOTE_ONLY`, incoterms variés)
- 6 certifications `VERIFIED` (3 sellers + 3 produits, types BIO_EU / ECOCERT / FAIRTRADE / HACCP / ISO_22000 / GLOBALGAP)
- 1 user smoke-seller `smoke-seller@iox.mch` lié à la 1ʳᵉ company demo

Toutes les clés naturelles préfixées `demo-` / `DEMO-` pour cleanup ciblé.

## Architecture des fichiers

```
apps/backend/src/seed-demo/runner.ts          # Logique testable (export runDemoSeed)
apps/backend/src/seed-demo/dataset.ts         # Données déclaratives
apps/backend/src/seed-demo/seed-demo.spec.ts  # 6 cas Jest
prisma/seed-demo.ts                           # CLI shim (PrismaClient + dispatch)
docs/marketplace/SEED_DEMO.md                 # Runbook complet
```

Note : le spec est à `apps/backend/src/seed-demo/seed-demo.spec.ts` (pas
`prisma/seed-demo.spec.ts` proposé initialement) car Jest a `rootDir=src`
dans le config backend — le fichier hors `src/` ne serait pas découvert.

## Commits (4)

```
1fd10d3 docs: SEED_DEMO operations runbook
022ae57 test(backend): SEED-DEMO runner safeguards + idempotence
816e344 feat(backend): SEED-DEMO runner + dataset + CLI shim + flag gating
bbe493d chore(notes): plan SEED-DEMO
```

Le commit du présent handoff sera ajouté juste après.

## Garde-fous vérifiés (Jest 6/6)

- `IOX_DEMO_SEED` absent + `NODE_ENV=development` → no-op, **0 appel Prisma** (asserté).
- `NODE_ENV=production` sans flag → throw `Demo seed disabled in production…`.
- `NODE_ENV=production` + `IOX_DEMO_SEED=1` → exécute (double opt-in).
- `IOX_DEMO_SEED=1` → cardinalité dataset respectée (4 sellers, 8 produits, 8 offres, 6 certifs).
- 2ᵉ run avec offres préexistantes → **0 create** sur les offres (uniquement `update`).
- `SMOKE_SELLER_PASSWORD` env override → bcrypt hash distinct du clair.

## Output brut des 5 commandes de preuve (anti-hallucination)

### 1. Branche + commits

```
seed-demo-marketplace-fixtures
1fd10d3 docs: SEED_DEMO operations runbook
022ae57 test(backend): SEED-DEMO runner safeguards + idempotence
816e344 feat(backend): SEED-DEMO runner + dataset + CLI shim + flag gating
bbe493d chore(notes): plan SEED-DEMO
```

### 2. Fichiers sur disque

```
-rw-r--r--@ 1 ahmedabdoullahi  staff  21403 Apr 26 22:29 apps/backend/src/seed-demo/dataset.ts
-rw-r--r--@ 1 ahmedabdoullahi  staff  13386 Apr 26 22:27 apps/backend/src/seed-demo/runner.ts
-rw-r--r--@ 1 ahmedabdoullahi  staff   7105 Apr 26 22:31 apps/backend/src/seed-demo/seed-demo.spec.ts
-rw-r--r--@ 1 ahmedabdoullahi  staff   7299 Apr 26 22:33 docs/marketplace/SEED_DEMO.md
-rw-r--r--@ 1 ahmedabdoullahi  staff   1836 Apr 26 22:26 notes/seed-demo-plan.md
-rw-r--r--@ 1 ahmedabdoullahi  staff    736 Apr 26 22:29 prisma/seed-demo.ts
```

### 3. Entrées package.json

```
package.json:23:    "db:seed:demo": "tsx prisma/seed-demo.ts",
apps/backend/package.json:14:    "seed:demo": "cd ../.. && tsx prisma/seed-demo.ts"
```

### 4. Tests Jest

```
PASS src/seed-demo/seed-demo.spec.ts

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        1.487 s
```

Suite complète backend : **464/464** (was 458, +6).

### 5. Run réel sans flag (no-op confirmé)

```
> @iox/backend@0.1.0 seed:demo /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox/apps/backend
> cd ../.. && tsx prisma/seed-demo.ts

Demo seed skipped (set IOX_DEMO_SEED=1 to enable).
```

Note : l'idempotence "2 runs avec DB réelle" n'a pas pu être validée
end-to-end (pas de DB locale dans cette session). Le comportement est
**couvert par le test Jest #5** ("idempotence : 2ᵉ run avec offres déjà
présentes → 0 create offer (uniquement update)") et garanti par le design
(tous les writes passent par `upsert` sur clés naturelles uniques + le
seul `create` non-upsert — les offres — est gardé par `findFirst` sur
`marketplaceProductId+title`).

## Compte smoke-seller

| Champ      | Valeur                                                       |
| ---------- | ------------------------------------------------------------ |
| Email      | `smoke-seller@iox.mch`                                       |
| Password   | `IoxSmoke2026!` (override via env `SMOKE_SELLER_PASSWORD`)   |
| Rôle       | `MARKETPLACE_SELLER`                                         |
| Membership | Lié à `DEMO-SUP-001` (Coopérative Vanille de Mayotte)        |

## TODO côté utilisateur

```bash
# 1. Push + PR
git push -u origin seed-demo-marketplace-fixtures
gh pr create --base main \
  --title "feat: SEED-DEMO marketplace fixtures (idempotent, flag-gated)" \
  --body "..."

# 2. Après merge, sur le VPS pré-prod (PAS la prod réelle) :
ssh preprod
cd /opt/iox
git pull
pnpm install
IOX_DEMO_SEED=1 pnpm db:seed:demo

# 3. Smoke post-merge
curl -s https://preprod.iox.mch/api/v1/marketplace/catalog?limit=5 | jq '.meta.total'        # ≥ 8
curl -s https://preprod.iox.mch/api/v1/marketplace/catalog/sellers?limit=5 | jq '.meta.total' # ≥ 4

# 4. Relancer smoke-authenticated.sh
./scripts/smoke-authenticated.sh   # Les skips dataset-vide doivent disparaître sur FP-1/2/2.1/3.1/6.
```

## Cleanup (si besoin)

Cf. `docs/marketplace/SEED_DEMO.md` § "Désactiver / nettoyer" — script SQL
ciblé sur les préfixes `demo-` / `DEMO-` ou `prisma migrate reset` sur
les environnements non-prod uniquement.

## Hors-scope (futurs lots éventuels)

- `MarketplaceOfferBatch` + `ProductBatch` réels (traçabilité fine).
- `MarketplaceDocument` (PDFs publics).
- Médias S3 réels derrière `logoMediaId` / `bannerMediaId`.
- Variantes EN du dataset.
