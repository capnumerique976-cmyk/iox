# Handoff — Cascade 3 branches mandate 11 (FP-5 + FP-7 + MP-FILTERS-1)

Date : 2026-04-27 — Pré-prod `iox.mycloud.yt` uniquement.

## TL;DR

- 3 PR mergées dans l'ordre exact (#14 → #15 → #16), CI verte sur les 3.
- 3 déploiements VPS terminés avec healthchecks 4/4 OK.
- 2 migrations Prisma additives appliquées (volumes_and_capacities, quality_attributes).
- Catalog public toujours à `total: 8` (cardinalité inchangée — attendu).
- 3 nouveaux filtres `qualityAttribute`, `seasonalityMonth`, `temperatureRequirements` répondent en HTTP 200.
- Working tree propre côté code (modifs résiduelles `.claude/settings.json` + untracked `docs-projet/`/`notes/handoff-*` hors scope).
- Aucune branche `fp-5-*`, `fp-7-*`, `mp-filters-1-*` résiduelle (locale ou remote).

## État final main

```
0c2a385 feat(marketplace): MP-FILTERS-1 — filtres catalog publique enrichis (#16)
3210c29 feat(marketplace): FP-7 — qualité structurée produit (enum + colonne) (#15)
59a5058 feat(marketplace): FP-5 — volumes & capacités produit (additif) (#14)
441cc46 feat(seed-demo): MediaAssets PRIMARY APPROVED par produit demo (idempotent) (#13)
```

main HEAD = `0c2a385f4d7dc06296a79d30489e4960aff89c8c`.

## PR mergées

| #   | Titre                                                                 | Branche source                      | Merged               |
| --- | --------------------------------------------------------------------- | ----------------------------------- | -------------------- |
| 14  | feat(marketplace): FP-5 — volumes & capacités produit (additif)       | fp-5-product-volumes-and-capacities | 2026-04-27T04:46:26Z |
| 15  | feat(marketplace): FP-7 — qualité structurée produit (enum + colonne) | fp-7-product-quality-attributes     | 2026-04-27T04:53:11Z |
| 16  | feat(marketplace): MP-FILTERS-1 — filtres catalog publique enrichis   | mp-filters-1-catalog-public-rich    | 2026-04-27T04:59:14Z |

## Déploiements VPS

3 runs `./deploy/vps/deploy.sh all` — tous `✅ Déploiement OK` :

- FP-5 : 2026-04-27T04:52:01Z, healthchecks 4/4.
- FP-7 : 2026-04-27T04:58:28Z, healthchecks 4/4.
- MP-FILTERS-1 : 2026-04-27T05:05:44Z, healthchecks 4/4.

Migrations Prisma appliquées par `docker-entrypoint.sh` au démarrage backend
(idempotent, déjà appliquées) :

- `20260427010000_add_marketplace_product_volumes_and_capacities`
- `20260427020000_add_marketplace_product_quality_attributes`

## Rebase notes

- **FP-7 sur main post-FP-5** : `git rebase --onto main 00b1661` (premier
  commit FP-5 squashé n'existait plus en local après --delete-branch). 6
  commits replayés sans aucun conflit.
- **MP-FILTERS-1 sur main post-FP-7** : `git rebase --onto main ac1e8ac`. 5
  commits replayés sans conflit. Les modifs FP-5/FP-7 sur le service catalog
  étaient déjà sur main post-merge ; les ajouts MP-FILTERS-1 (filtres `where`)
  ont cohabité proprement.
- Aucun `git rebase --abort` nécessaire.

## Validations curl prod (preuves)

```
=== health ===
{"success":true,"data":{"status":"ok","info":{"database":{"status":"up"},
"storage":{"status":"up","endpoint":"minio","bucket":"iox-prod"}},"error":{},
"details":{"database":{"status":"up"},"storage":{"status":"up",
"endpoint":"minio","bucket":"iox-prod"}}},"timestamp":"2026-04-27T05:05:44.819Z"}

=== catalog total === 8

=== filter qualityAttribute=ORGANIC ===
HTTP 200 → total=0 (attendu : aucun produit demo n'a d'attribut qualité)

=== filter seasonalityMonth=JUN ===
HTTP 200 → total=4 (les seeds ont des saisonnalités, plusieurs matchent juin)

=== filter temperatureRequirements=ambiant === HTTP 200

=== ProductDetail FP-5/FP-7 sur demo-vanille-bourbon-grade-a ===
{
  "annualProductionCapacity": null,
  "capacityUnit": null,
  "qualityAttributes": [],
  "packagingFormats": [],
  "temperatureRequirements": null
}
```

→ Les nouveaux champs sont **bien projetés publiquement**, valeurs vides
attendues (le seed pré-date FP-5/FP-7).

## Branches résiduelles

```
$ git branch -a | grep -E "(fp-5-product|fp-7-product|mp-filters-1)" || echo "✓ aucune branche résiduelle"
✓ aucune branche résiduelle
```

`gh pr merge --delete-branch` a supprimé branches locales et remote, et
`git remote prune origin` confirme.

## Limitations connues

- 2 suites jest auth pré-existantes (`src/auth/auth.service.spec.ts`)
  restent en échec local depuis `39bfbd0` (mandat antérieur). En CI elles
  passent (env différent). Hors scope ce mandat ; les 3 PR sont passées
  CI verte.
- Les produits demo ont leurs nouveaux champs FP-5/FP-7 à `null/[]`.
  Activer/étendre le seed pour les hydrater serait un futur lot
  cosmétique — sans impact fonctionnel.
- `qualityAttribute` ne supporte qu'une seule valeur à la fois (pas de OR
  multi-tag MVP).

## Prochaines pistes possibles

- Hydrater le seed demo avec `qualityAttributes` + `annualProductionCapacity`
  pour rendre les badges/cards visibles en démo.
- Picker visuel `MarketplaceCategory` (besoin d'un nouvel endpoint backend
  `GET /marketplace/categories` actives).
- Filtre catalog par certification (joinure `Certification`).
- Multi-OR sur `qualityAttribute` en query string (CSV ou répétition param).
