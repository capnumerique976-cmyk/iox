# Prompt Claude Code — Push + PR + merge FP-3 puis FP-4

> **Usage** : à coller tel quel dans Claude Code (CLI ou agent). Lot court, faible risque, séquentiel.
> **Pré-requis (à vérifier en premier, stop si non remplis)** :
>
> - être sur la machine où le repo est cloné ;
> - `git` configuré avec accès SSH à `origin` (`git remote -v` affiche `git@github.com:.../iox.git`) ;
> - **`gh` CLI installé et authentifié** : `which gh` doit renvoyer un chemin, et `gh auth status` doit dire "Logged in to github.com". Si absent : stopper et demander à l'utilisateur d'installer (`brew install gh && gh auth login`).

---

## Contexte canonique IOX (rappel)

- IOX = "Indian Ocean Xchange" — plateforme B2B marketplace + socle MCH (Mayotte Connect Hub).
- Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js (App Router).
- Marketplace : `SellerProfile`, `MarketplaceProduct`, `MarketplaceOffer`, `MarketplaceDocument`, `Certification`, `MediaAsset`. Trois surfaces seller / admin / public. Projection publique filtrée. Statuts marketplace ≠ statuts MCH internes.
- Conventional commits : `feat(scope): ...` / `docs(scope): ...` / `test(...): ...`.
- Tests doivent rester verts à chaque commit.

## État avant ce prompt

- Branche `main` (origin/main) = Lot-8 + Lot-9 + FP-1 + FP-2.
- Branche locale `fp-3-seller-self-edit` (depuis `main`) : 3 commits, verte, **non poussée**.
- Branche locale `fp-4-seasonality-seller-input` (depuis `fp-3-seller-self-edit`) : 4 commits, verte, **non poussée**, **branche actuelle**.
- Tests au handoff : backend 450/450, frontend 117/117, lint clean.
- Mandat : **push + PR + merge FP-3 d'abord, puis rebase et push + PR + merge FP-4**.

## Mission

Pousser et merger les deux branches dans cet ordre exact, sans empiler de nouveau travail. Aucun changement de code en dehors de la résolution éventuelle d'un conflit de rebase trivial sur FP-4.

## Règles absolues

- Ne pas modifier le code des branches FP-3 et FP-4 sauf si la CI échoue ou s'il y a un vrai conflit de rebase.
- Ne pas merger FP-4 avant que FP-3 soit mergée sur main et que FP-4 soit rebasée sur main.
- Ne pas force-push avant rebase (et alors uniquement avec `--force-with-lease`).
- Ne pas modifier la CI ni les workflows GitHub.
- Ne pas démarrer de nouveau lot FP-x.
- Si la CI échoue, ne pas tenter de bypass : analyser, corriger sur la branche, repousser, et attendre verte.

## Plan d'exécution

### Étape 1 — Vérification santé

```bash
git status                                            # working tree clean attendu
git branch --show-current                             # fp-4-seasonality-seller-input attendu

# Re-vérifier que les deux branches sont vertes localement
git checkout fp-3-seller-self-edit
pnpm install --frozen-lockfile
pnpm --filter @iox/backend  exec tsc --noEmit
pnpm --filter @iox/backend  test
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec next lint
pnpm --filter @iox/frontend exec vitest run
```

Si rouge à cette étape sur fp-3 : stop, analyser, corriger, recommit, retester. Ne pas pousser tant que vert.

### Étape 2 — Push + PR FP-3

```bash
git checkout fp-3-seller-self-edit
git push -u origin fp-3-seller-self-edit

gh pr create --base main --head fp-3-seller-self-edit \
  --title "feat(marketplace): FP-3 auto-édition profil vendeur" \
  --body "$(cat <<'EOF'
## FP-3 — Auto-édition profil vendeur

### Backend
- `UpdateMySellerProfileDto` (bornes alignées sur le DTO admin) — pas de `slug`, `legalName`, `status`, `companyId`, `isFeatured`.
- `SellerProfilesService.findMine(actor)` → 404 si 0 profil, 409 si plusieurs, delegate `findById` sinon.
- `SellerProfilesService.updateMine(dto, actor)` → résout via `findMine`, delegate `update(id, dto, actor)`.
- `GET /marketplace/seller-profiles/me` et `PATCH .../me` enregistrés **avant** `:id` (Express router order).
- 4 tests unitaires service ajoutés (29/29 sur le module, 450/450 full).

### Frontend
- Helper `sellerProfilesApi.getMine` / `updateMine` + interfaces.
- Page `/seller/profile/edit` (controlled state, mirror /profile pattern).
- Avatar/bannière en read-only (pas d'uploader dans ce lot).
- Lien dashboard ajouté + QuickLink dans Raccourcis.
- 3 tests vitest (104→107).

### Doc
- `docs/marketplace/SELLER_PROFILE.md` : section FP-3 complète.

### Decisions clés
1. Pas de react-hook-form — controlled state.
2. Routes Nest : `/me` avant `:id`.
3. Bascule vitrine APPROVED → PENDING_REVIEW préservée.

### Tests
- backend 450/450 ✅
- frontend 117/117 ✅ (à l'origine de FP-4 qui suit)

### Smoke à valider après merge
- [ ] `/seller/profile/edit` avec un seller approuvé → bascule en PENDING_REVIEW dans audit log.
- [ ] Buyer reçoit 403 sur `PATCH /marketplace/seller-profiles/me`.
- [ ] Catalogue public toujours fonctionnel (FP-1 non touché).
EOF
)"
```

Attendre que la CI GitHub passe au vert. Ne pas merger avant.

### Étape 3 — Merge FP-3

Une fois la CI verte et la PR approuvée (ou si auto-merge autorisé) :

```bash
gh pr merge --squash --delete-branch                  # ou --merge selon convention du repo
git checkout main
git pull --ff-only origin main
```

Vérifier que main est bien fast-forward et que FP-3 est dedans :

```bash
git log --oneline -5 main
```

### Étape 4 — Rebase FP-4 sur main

```bash
git checkout fp-4-seasonality-seller-input
git rebase main
```

**Si conflit** : résoudre **uniquement** ce qui est nécessaire (typiquement aucun conflit attendu, FP-4 ne touche pas aux fichiers FP-3 sauf possiblement `notes/handoff-2026-04-26.md` et `docs/marketplace/SELLER_PROFILE.md`). En cas de doute, garder la version la plus récente (de FP-4) pour les fichiers de doc/notes, et arbitrer côté code uniquement si nécessaire.

```bash
# Re-vérifier la santé après rebase
pnpm install --frozen-lockfile
pnpm --filter @iox/backend  exec tsc --noEmit
pnpm --filter @iox/backend  test
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec next lint
pnpm --filter @iox/frontend exec vitest run
```

### Étape 5 — Push + PR FP-4

```bash
git push --force-with-lease -u origin fp-4-seasonality-seller-input

gh pr create --base main --head fp-4-seasonality-seller-input \
  --title "feat(marketplace): FP-4 saisonnalité — saisie seller" \
  --body "$(cat <<'EOF'
## FP-4 — SeasonalityPicker (saisie seller)

### Backend
- Aucune modification (PATCH déjà disponible via FP-1).

### Frontend
- Composant `SeasonalityPicker` (éditable, contrôlé) miroir de `SeasonalityCalendar`.
- Toggles D / R indépendants par mois ; case "toute l'année" verrouille la grille sans purger les valeurs locales.
- Helper `marketplaceProductsApi` (`listMine`, `getById`, `updateSeasonality`).
- Page `/seller/marketplace-products/[id]/seasonality` — hydratation, validation client (≥1 mois si !isYearRound), warning bascule revue qualité si APPROVED/PUBLISHED, hints 403/404.
- Page index `/seller/marketplace-products` (liste minimaliste, lien Saisonnalité par ligne).
- Lien `Mes produits marketplace` dans Raccourcis dashboard seller.
- 13 tests vitest (107→117 frontend, +10 net après dédup).

### Doc
- Nouveau : `docs/marketplace/MARKETPLACE_PRODUCT_SEASONALITY.md` (FP-1 + FP-4).
- `SELLER_PROFILE.md` : table lots livrés mise à jour (FP-4 livré).

### Decisions clés
1. FP-4 sans nouveau endpoint : on s'appuie sur le PATCH générique produit, ownership déjà imposée backend.
2. Picker ne normalise pas (vidage `availabilityMonths` quand `isYearRound=true`) — la normalisation reste backend.

### Tests
- backend 450/450 ✅
- frontend 117/117 ✅

### Smoke à valider après merge
- [ ] `/seller/marketplace-products` → click "Saisonnalité" → toggle un mois → Enregistrer → audit + completion score recalculé.
- [ ] Buyer reçoit 403 sur `PATCH /marketplace/products/:id`.
EOF
)"
```

Attendre CI verte.

### Étape 6 — Merge FP-4

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull --ff-only origin main
git log --oneline -10 main                            # vérifier l'ordre FP-3 puis FP-4
```

### Étape 7 — Nettoyage local

```bash
git branch -d fp-3-seller-self-edit                   # déjà supprimée côté origin par --delete-branch
git branch -d fp-4-seasonality-seller-input
git remote prune origin
```

## Critères de succès

- main contient FP-3 puis FP-4, dans cet ordre, sur origin.
- Aucune branche FP-3 / FP-4 résiduelle (locale ou origin).
- Working tree clean sur main.
- CI verte sur main après chaque merge.
- Pas de force-push sauvage : seulement `--force-with-lease` après rebase autorisé.

## En cas de blocage majeur

- **CI rouge sur FP-3 après push** : analyser le job en échec via `gh pr checks` et `gh run view`. Corriger sur la branche, recommit, repush. Ne pas merger en force.
- **Conflit de rebase FP-4 non trivial** : abandonner le rebase (`git rebase --abort`), demander arbitrage humain. Ne pas inventer de résolution sur du code métier.
- **PR refusée par review** : appliquer les retours, recommit, repush. La PR est mise à jour automatiquement.

## Rapport attendu en fin

Mettre à jour `notes/handoff-2026-04-26.md` (ou créer `notes/handoff-<date>.md`) avec :

- État final main (commits ajoutés, hash courts).
- Liens des PR mergées.
- Confirmation des smoke tests si effectués (sinon les laisser comme TODO ouverts).
- Working tree clean confirmé.
