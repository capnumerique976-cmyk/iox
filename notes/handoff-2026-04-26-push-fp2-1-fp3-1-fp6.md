# Handoff 2026-04-26 — Push + PR + merge FP-2.1 / FP-3.1 / FP-6

Suite directe du mega-mandat 6h : les 3 branches préparées localement
(`fp-2-1-seller-certifications-edition`, `fp-3-1-seller-media-uploader`,
`fp-6-product-fine-origin`) ont été poussées, mises en PR puis mergées
**séquentiellement** dans `main`, dans cet ordre exact, avec rebase
`--onto main` entre chaque pour éviter tout cascading PR.

## État final `main`

```
0dc448d feat(marketplace): FP-6 origine fine produit (locality, altitude, GPS) (#7)
d571d31 feat(marketplace): FP-3.1 uploader inline logo + bannière seller (#6)
df4cab3 feat(marketplace): FP-2.1 édition certifications par seller (#5)
2d28d4c docs(notes): handoff 2026-04-26 — état final post-merge FP-3 + FP-4
```

- Working tree : **clean** (seul `docs-projet/` untracked, préexistant et hors scope).
- Branches locales `fp-2-1-*`, `fp-3-1-*`, `fp-6-*` : supprimées (`gh pr merge --delete-branch`).
- Refs distantes : prunées (`git remote prune origin`).

## Pull Requests

| PR | Titre | Status | Lien |
| --- | --- | --- | --- |
| #5 | feat(marketplace): FP-2.1 édition certifications par seller | merged (squash) | https://github.com/capnumerique976-cmyk/iox/pull/5 |
| #6 | feat(marketplace): FP-3.1 uploader inline logo + bannière seller | merged (squash) | https://github.com/capnumerique976-cmyk/iox/pull/6 |
| #7 | feat(marketplace): FP-6 origine fine produit (locality, altitude, GPS) | merged (squash) | https://github.com/capnumerique976-cmyk/iox/pull/7 |

## CI

Tous les jobs verts sur les 3 PRs avant merge :

- `Install & cache`
- `Backend (typecheck + lint + test + build)`
- `Frontend (typecheck + lint + test + build)`
- `Frontend E2E (Playwright)`
- `Prisma schema ↔ migrations drift`
- `CI summary`

Aucun bypass (`--no-verify`, admin push, `-c hooks=false`) utilisé.
Force-push uniquement post-rebase, via `--force-with-lease`.

## Rebases

- **FP-2.1** : poussée directe (déjà sur main à jour). Push initial
  `[new branch]`, pas de rebase.
- **FP-3.1** : `git rebase --onto main af45a93 fp-3-1-seller-media-uploader`
  (af45a93 = ancien tip FP-2.1 récupéré via `git reflog` après suppression
  de la branche par `--delete-branch`). Rebase **clean, sans conflit**.
  Une **micro-correction TS** appliquée après rebase (commit `efca3c8`) :
  suppression de 2 directives `@ts-expect-error` devenues inutiles
  (TS2578) sur les stubs `URL.createObjectURL/revokeObjectURL` dans
  `InlineMediaUploader.test.tsx` — l'erreur que les directives
  supprimaient n'apparaît plus avec le tsconfig hérité du nouveau main.
- **FP-6** : `git rebase --onto main efca3c8 fp-6-product-fine-origin`
  (efca3c8 = tip post-rebase FP-3.1). Rebase **clean** ; les 4 commits
  FP-2.1 que la branche FP-6 avait inhérités via FP-3.1 ont été
  automatiquement détectés comme déjà upstream (squash merges) et
  droppés par git. Aucun conflit.

Aucun `rebase --abort` n'a été nécessaire.

## Health checks locaux pré-push (rappel)

Avant chaque push (et re-vérifiés après chaque rebase) :

- Backend : `tsc --noEmit` clean + Jest **453/453 green**.
- Frontend : `tsc --noEmit` clean + `next lint` clean + Vitest **140/140 green**.
- `pnpm install --frozen-lockfile` : Already up to date.

## Smoke tests à faire en environnement déployé

### FP-2.1 — édition certifications seller
- [ ] Login MARKETPLACE_SELLER → profil → « Gérer mes certifications » →
      créer une cert `BIO_EU` → vérifier qu'elle apparaît côté public sur
      la page seller.
- [ ] Tenter d'éditer une cert appartenant à un autre seller → **403**.
- [ ] Suppression d'une cert → disparaît de la liste publique.

### FP-3.1 — uploader inline logo + bannière
- [ ] Login seller → profil → uploader un logo PNG < 2 Mo → preview OK
      → reload page → preview persiste → vérifier rendu côté public.
- [ ] Idem bannière.
- [ ] Fichier > taille max → message d'erreur clair, pas d'upload S3.
- [ ] Vérifier que le lien « Gérer mes certifications » (FP-2.1) est
      toujours présent à côté des uploaders (cohabitation OK).

### FP-6 — origine fine produit
- [ ] PATCH `/marketplace/products/:id` avec `gpsLat` sans `gpsLng` → **400**
      (`assertGpsPairCoherence`).
- [ ] PATCH avec `originLocality` + `altitudeMeters` + paire GPS valide
      → 200 → section « Origine détaillée » visible sur la page publique.
- [ ] Produit sans aucun champ d'origine fine → **section absente**
      (rendu conditionnel, pas de bloc vide).
- [ ] Vérifier la migration `20260426010000_add_marketplace_product_fine_origin`
      appliquée en prod (4 colonnes nullables).

## Suivi

- Aucune branche locale FP en cours.
- Le note legacy `notes/handoff-2026-04-26-mega-mandat.md` (issu du PR #7,
  rédigé pendant le mega-mandat 6h) est désormais sur main et complète
  ce handoff côté contexte produit.
- Prochain lot suggéré : exploiter les nouveaux champs FP-6 côté seller
  (formulaire d'édition origine fine) — non couvert par ce sprint.
