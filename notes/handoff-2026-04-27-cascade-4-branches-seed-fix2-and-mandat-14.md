# Handoff — Cascade 4 branches : SEED-DEMO-FIX-2 + MP-OFFER-VIEW + MP-OFFER-EDIT-1 + MP-EDIT-PRODUCT.3-light

Date : 2026-04-27 — Pré-prod `iox.mycloud.yt` uniquement.

## TL;DR

- 4 PR mergées dans l'ordre exact (#17 → #18 → #19 → #20), CI verte sur les 4.
- 4 déploiements VPS terminés avec healthchecks 4/4 OK.
- Seed VPS activé entre #17 et #18 → produits demo hydratés FP-5/FP-7/FP-8.
- 3 filtres MP-FILTERS-1 retournent les compteurs attendus
  (`ORGANIC=4`, `FAIR_TRADE=2`, `Frozen=1`).
- Catalog public toujours à `total: 8`, sellers `total: 4`.
- Smoke `smoke-seller@iox.mch` voit ses 2 offres via `GET /marketplace/offers`.
- Working tree propre (untracked handoffs hors scope).
- Aucune branche résiduelle des 4 lots.
- main = `8c50026` (était `0c2a385`).

## État final main (4 nouveaux squash commits)

```
8c50026 feat(marketplace): MP-EDIT-PRODUCT.3-light — InlineMediaUploader sur mainMediaId produit (#20)
ed0ff98 feat(marketplace): MP-OFFER-EDIT-1 — création + édition champs sûrs + workflow soumission seller offer (#19)
01b292f feat(marketplace): MP-OFFER-VIEW — page seller lecture détaillée d'une offre (#18)
82421b1 feat(seed-demo): SEED-DEMO-FIX-2 hydrate FP-5/FP-7/FP-8 (#17)
0c2a385 feat(marketplace): MP-FILTERS-1 — filtres catalog publique enrichis (#16)
```

main HEAD = `8c50026a503ee639f95e609b8e3dabbcaf02ecc9`.

## PR mergées

| #   | Titre                                                                                    | Branche source                          | Merged               |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------- | -------------------- |
| 17  | feat(seed-demo): SEED-DEMO-FIX-2 hydrate FP-5/FP-7/FP-8                                  | seed-demo-fix-2-quality-and-logistics   | 2026-04-27T06:25:00Z |
| 18  | feat(marketplace): MP-OFFER-VIEW — page seller lecture détaillée d'une offre             | mp-offer-view-1-seller-detail           | 2026-04-27T13:13:20Z |
| 19  | feat(marketplace): MP-OFFER-EDIT-1 — création + édition champs sûrs + soumission offer    | mp-offer-edit-1-create-and-update       | 2026-04-27T13:19:47Z |
| 20  | feat(marketplace): MP-EDIT-PRODUCT.3-light — InlineMediaUploader sur mainMediaId produit | mp-edit-product-3-light-main-media      | 2026-04-27T13:26:18Z |

## Déploiements VPS

4 runs `./deploy/vps/deploy.sh all` — tous `✅ Déploiement OK` :

- SEED-DEMO-FIX-2 : 2026-04-27T13:10:16Z, healthchecks 4/4
- MP-OFFER-VIEW : 2026-04-27T13:19:02Z, healthchecks 4/4
- MP-OFFER-EDIT-1 : 2026-04-27T13:25:31Z, healthchecks 4/4
- MP-EDIT-PRODUCT.3-light : 2026-04-27T13:31:56Z, healthchecks 4/4

## Activation seed VPS (entre #17 et #18)

`pnpm` n'étant pas présent dans l'image backend prod, l'activation a été
déclenchée via `node` direct sur le `runner.js` compilé :

```
ssh rahiss-vps "... docker compose ... exec -T -e IOX_DEMO_SEED=1 backend
  sh -c 'node -e \"const{PrismaClient}=require(...);
  const{runDemoSeed}=require(\\\"./dist/.../runner.js\\\");
  ...; runDemoSeed({prisma:p, env:process.env, log:console.log})...\"'"
```

Output capturé :
```
🌱 Demo seed starting…
✅ Demo seed done — sellers: 4, products: 8, offers: 8, certifications: 6, mediaAssets: 8, smokeSeller: smoke-seller@iox.mch
{"enabled":true,"sellers":4,"products":8,"offers":8,"certifications":6,"smokeSeller":"smoke-seller@iox.mch","mediaAssets":8}
```

→ idempotent (compteurs stables), 8 produits hydratés en place avec FP-5/FP-7/FP-8.

## Validations curl prod (preuves fonctionnelles)

```
=== health ===
{"success":true,"data":{"status":"ok","info":{"database":{"status":"up"},
"storage":{"status":"up","endpoint":"minio","bucket":"iox-prod"}},...},
"timestamp":"2026-04-27T13:33:09.472Z"}

=== filtres FP-7 / FP-8 (compteurs attendus = compteurs obtenus) ===
qualityAttribute=ORGANIC          → 4
qualityAttribute=FAIR_TRADE       → 2
temperatureRequirements=Frozen    → 1

=== cardinalités ===
catalog total = 8  (inchangé)
sellers total = 4  (inchangé)

=== smoke seller authentifié (smoke-seller@iox.mch) ===
GET /marketplace/offers → total: 2
titles: ["Poudre de Vanille pure 100% — offre principale",
         "Vanille Bourbon de Mayotte — Grade A — offre principale"]
```

→ Le smoke seller (rattaché à `demo-coop-vanille`) voit bien **uniquement
ses 2 offres** (scoping ownership backend OK).

## Rebase notes

- **MP-OFFER-VIEW sur main post-#17** : `git rebase --onto main 0c2a385`
  (pré-#17 SHA). 6 commits replayés sans conflit (seed et MP-OFFER-VIEW
  touchent à des fichiers disjoints).
- **MP-OFFER-EDIT-1 sur main post-#18** : `git rebase --onto main 0a2766a`
  (dernier commit MP-OFFER-VIEW avant squash). 6 commits replayés sans
  conflit (#18 squashé est désormais sur main, le rebase saute par-dessus).
- **MP-EDIT-PRODUCT.3-light sur main post-#19** : `git rebase --onto main
  cab5a2f`. 5 commits replayés sans conflit (l'assouplissement de
  `UpdateMarketplaceProductInput` n'a pas conflicté avec le helper
  marketplace-products.ts).
- Aucun `git rebase --abort` nécessaire.

## Working tree

```
On branch main
Your branch is up to date with 'origin/main'.
Untracked files:
  docs-projet/
  notes/handoff-2026-04-27-cascade-3-branches-fp5-fp7-filters.md
  notes/handoff-2026-04-27-cascade-4-branches.md
  notes/handoff-2026-04-27-seed-demo-fix-2.md
```

→ Propre côté code. Le `.claude/settings.json` modifié + un stash de
formatage linter (`stash@{0}` "linter-formatting-mandat-cascade-4-resume")
sont hors scope, à arbitrer par l'utilisateur.

## Branches résiduelles

```
$ git branch -a | grep -E "(seed-demo-fix-2|mp-offer-view|mp-offer-edit|mp-edit-product-3)" || echo "✓ aucune"
✓ aucune branche résiduelle
```

`gh pr merge --delete-branch` a supprimé branches locales et remote, et
`git remote prune origin` confirme.

## Limitations connues

- 2 suites jest auth pré-existantes (`src/auth/auth.service.spec.ts`)
  restent en échec local depuis `39bfbd0` (mandat antérieur). En CI elles
  passent. Hors scope ce mandat ; les 4 PR sont passées CI verte malgré
  tout.
- Stash `stash@{0}` contient des reformattages linter sur ~120 fichiers.
  Décision à prendre : ré-appliquer (`git stash pop`) puis commit
  formatter dédié, ou supprimer (`git stash drop`).
- Smoke `./scripts/smoke-authenticated.sh` ignore les variables d'env
  exportées et lit `~/.iox-smoke.env` en priorité (qui contient
  `admin@iox.mycloud.yt`). La validation seller a été faite via curl
  direct.
- Container backend prod n'a pas pnpm/tsx → activation seed via `node`
  + runner compilé. Pattern à documenter pour la prochaine activation.

## Prochaines pistes

- Wrapper script `scripts/activate-demo-seed-vps.sh` qui encapsule la
  commande `node -e ...` pour les futures activations.
- Picker visuel `MarketplaceCategory` (futur lot, demande endpoint backend
  list).
- Multi-OR sur `qualityAttribute` (CSV ou répétition param query).
- Filtre catalog par certification.
- Gallery produit (multi-images), gestion `MarketplaceOfferBatch`,
  archive offer (MP-OFFER-EDIT-2).
