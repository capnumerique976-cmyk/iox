# Handoff — Cascade 4 branches (PR #10 → #11 → #12 → #13)

Date : 2026-04-27.
Périmètre : push + PR + merge + deploy en cascade des 4 branches du
méga-mandat 9 + activation seed sur VPS.

## TL;DR

- **4 PR mergées** dans l'ordre : #10 MP-EDIT-PRODUCT.1, #11 MP-EDIT-PRODUCT.2,
  #12 FP-8, #13 SEED-DEMO-FIX.
- **4 déploiements VPS** OK (healthchecks 4/4 à chaque round).
- **Seed activé** sur VPS → `mediaAssets: 8` créés.
- **Catalog public passé de `total: 0` à `total: 8`** ✓
- 1 fix mineur en cours de cascade : extraction de `slugify` hors module Page
  (Next.js refuse les exports nommés non standard sur les pages App Router).
- main local et origin/main alignés à `441cc46`. Branches locales et remotes
  nettoyées.

## État final main

```
$ git log --oneline -6 main
441cc46 feat(seed-demo): MediaAssets PRIMARY APPROVED par produit demo (idempotent) (#13)
87a6ed2 feat(marketplace): FP-8 — logistique structurée produit (additif) (#12)
fbc403d feat(marketplace): MP-EDIT-PRODUCT.2 — création produit seller + workflow soumission/archivage (#11)
9967893 feat(marketplace): MP-EDIT-PRODUCT.1 — page seller détail+édition champs sûrs (#10)
9f9fddd feat: SEED-DEMO marketplace fixtures (idempotent, flag-gated) (#9)
3c00c6f feat(marketplace): MP-S-INDEX public seller directory (#8)
$ git rev-parse main
441cc46153ace2df3b566eb75c5db4baf2faf5c9
```

## PR mergées

| #   | Titre                                                      | Mergé à              |
| --- | ---------------------------------------------------------- | -------------------- |
| 10  | MP-EDIT-PRODUCT.1 — page seller détail+édition champs sûrs | 2026-04-26T21:52:16Z |
| 11  | MP-EDIT-PRODUCT.2 — création produit seller + workflow     | 2026-04-26T21:59:56Z |
| 12  | FP-8 — logistique structurée produit (additif)             | 2026-04-26T22:13:13Z |
| 13  | SEED-DEMO-FIX — MediaAssets PRIMARY APPROVED               | 2026-04-26T22:43:10Z |

## Healthchecks VPS post-deploy final

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "info": {
      "database": { "status": "up" },
      "storage": { "status": "up", "endpoint": "minio", "bucket": "iox-prod" }
    },
    "error": {},
    "details": {
      "database": { "status": "up" },
      "storage": { "status": "up", "endpoint": "minio", "bucket": "iox-prod" }
    }
  },
  "timestamp": "2026-04-26T22:50:51.451Z"
}
```

Healthchecks deploy.sh : `✓ HTTPS / 307 | ✓ HTTPS /login 200 | ✓ API
/health 200 | ✓ API /health/live 200` à chaque round.

## Activation seed VPS

Commande utilisée (le container backend n'a pas `pnpm` ; on appelle le runner
directement via `node -e` — pattern hérité du handoff du SEED-DEMO initial) :

```bash
ssh rahiss-vps "cd /opt/apps/iox && IOX_DEMO_SEED=1 docker compose \
  -f docker-compose.vps.yml exec -T -e IOX_DEMO_SEED=1 backend node -e \"
  const { PrismaClient } = require('@prisma/client');
  const { runDemoSeed } = require('./dist/apps/backend/src/seed-demo/runner');
  const p = new PrismaClient();
  runDemoSeed({ prisma: p, env: process.env, log: console.log })
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => p.\\\$disconnect());\""
```

Output réel :

```
🌱 Demo seed starting…
✅ Demo seed done — sellers: 4, products: 8, offers: 8, certifications: 6, mediaAssets: 8, smokeSeller: smoke-seller@iox.mch
```

`mediaAssets: 8` ✓ — le SEED-DEMO-FIX a bien créé les 8 MediaAsset PRIMARY
APPROVED qui débloquent le catalog public.

## Validation finale catalog

```
catalog?limit=24  → data.meta.total = 8   ✓ (était 0 avant ce mandat)
catalog/sellers?limit=10 → data.meta.total = 4   ✓
fiche produit FP-8 fields exposés (null car non renseignés sur dataset demo) ✓
```

Réponse fiche `demo-vanille-bourbon-grade-a` (1ère fiche du catalog) :

```json
{
  "packagingFormats": null,
  "temperatureRequirements": null,
  "grossWeight": null
}
```

Les colonnes FP-8 sont exposées par la projection publique (preuve que la
migration s'est appliquée + que le service projette les 5 champs). Le dataset
demo n'est pas mis à jour pour les renseigner — c'est un futur lot
SEED-DEMO-FIX-2 si nécessaire.

## Working tree clean

```
On branch main
Your branch is up to date with 'origin/main'.

Untracked files:
  docs-projet/
  notes/handoff-2026-04-26-seed-demo-deployed.md

nothing added to commit but untracked files present
```

Untracked = hors scope de ce mandat (présents dès le début). Pas de fichier
modifié non commité. ✓

## Branches résiduelles

```
$ git branch -a | grep -E "(mp-edit-product-|fp-8-|seed-demo-fix-)"
✓ aucune branche résiduelle
```

`git remote prune origin` a aussi nettoyé les remote-tracking refs des
4 branches (et de 2 anciennes : `mp-s-index-public-seller-directory`,
`seed-demo-marketplace-fixtures`).

## Incident en cours de cascade — PR #11 fix slugify

**Symptôme** : la première CI du PR #11 a échoué à l'étape `next build`
avec :

```
Type error: Page "src/app/(dashboard)/seller/marketplace-products/new/page.tsx"
does not match the required types of a Next.js Page.
  "slugify" is not a valid Page export field.
```

**Cause** : Next.js App Router interdit les exports nommés non standard sur
les modules Page. `slugify` était exporté pour être réutilisé par le test
vitest.

**Fix** : extraction dans `apps/frontend/.../new/slugify.ts`, import dans
`page.tsx` et dans `page.test.tsx`. Commit `a344b7b` :
`fix(frontend): MP-EDIT-PRODUCT.2 — extraire slugify hors module Page`.

CI re-run verte. Pas de bypass, pas de force-push hors `--force-with-lease`.

**Note** : l'erreur n'est pas reproduite par `tsc --noEmit` ni `vitest run`
locaux — uniquement par `next build`. À ajouter aux smoke pre-push pour les
prochains lots impactant des modules Page.

## Smoke à jouer manuellement (post-merge)

À refaire par l'utilisateur, 30s chacun :

- [ ] Login `smoke-seller@iox.mch` / `IoxSmoke2026!` →
      `/seller/marketplace-products` → bouton "Nouveau produit" présent.
- [ ] Click "Nouveau produit" → formulaire `/new` → créer un produit DRAFT.
- [ ] Click "Détails" sur un produit existant → page édition →
      modifier descriptionShort → enregistrer → toast OK.
- [ ] Sur ce même produit → bouton "Soumettre à validation" si DRAFT, ou
      bouton "Archiver" si PUBLISHED → confirmation → action OK.
- [ ] Sur ce même produit → section "Logistique (FP-8)" → renseigner
      `1kg, 5kg` + poids → enregistrer → re-fetch → données persistées.
- [ ] `https://iox.mycloud.yt/marketplace` → 8 cartes produit affichées.
- [ ] Click sur une carte → fiche détail rendue.

## Limitations connues

- Les MediaAssets demo sont des placeholders externes (placehold.co), pas de
  vraie image S3. Le composant doit gérer le fallback (déjà le cas pour le
  seed initial).
- Les 5 champs FP-8 sont vides sur les 8 produits demo (dataset non mis à
  jour). Futur lot SEED-DEMO-FIX-2 si pertinent.
- Le container backend prod n'a pas `pnpm` — l'activation seed utilise
  `node -e` direct sur le runner buildé. À documenter dans `SEED_DEMO.md`.

## Prochain lot

Méga-mandat 11 (LOCAL-ONLY, 6h autonome) : FP-5 (volumes/capacités) +
FP-7 (qualityAttributes) + MP-FILTERS-1 (filtres catalog enrichis).
Démarré immédiatement après ce handoff.
