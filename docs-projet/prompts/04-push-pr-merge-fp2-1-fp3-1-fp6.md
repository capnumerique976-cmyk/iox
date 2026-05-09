# Prompt Claude Code — Push + PR + merge FP-2.1, FP-3.1, FP-6

> **Usage** : à coller tel quel dans Claude Code après le retour du méga-mandat 6h. Lot court, séquentiel, faible risque.
> **Pré-requis (à vérifier en premier, stop si non remplis)** :
>
> - être sur la machine où le repo IOX est cloné ;
> - working tree clean ;
> - `git remote -v` affiche `git@github.com:capnumerique976-cmyk/iox.git` ;
> - **`gh` CLI installé et authentifié** : `which gh` doit renvoyer un chemin, et `gh auth status` doit dire "Logged in to github.com". Si absent : stopper et demander à l'utilisateur d'installer (`brew install gh && gh auth login`).

---

## Contexte canonique IOX (rappel)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js (App Router).

Conventional commits : `feat(scope): ...`, `docs(scope): ...`, `test(scope): ...`. Tests doivent rester verts à chaque commit.

## État avant ce mandat

- Branche `main` (origin/main) = Lot-8 + Lot-9 + FP-1 + FP-2 + FP-3 + FP-4. HEAD attendu : `2d28d4c`.
- Trois branches locales chaînées, **non poussées**, livrées par le méga-mandat 6h précédent :
  - `fp-2-1-seller-certifications-edition` (depuis main) — 4 commits, FP-2.1 édition certifications par seller.
  - `fp-3-1-seller-media-uploader` (depuis fp-2-1) — 4 commits, FP-3.1 uploader inline logo + bannière.
  - `fp-6-product-fine-origin` (depuis fp-3-1) — 5 commits + 1 commit handoff, FP-6 origine fine produit.
- Tests au handoff : backend 453/453, frontend 140/140, lint clean, tsc strict clean front + back.
- Migration FP-6 : 4 ALTER TABLE ADD COLUMN nullable, strictement additive.

## Mandat

Pousser et merger les **3 branches dans l'ordre exact** : FP-2.1 → FP-3.1 → FP-6, avec **rebase `--onto main`** entre chaque pour éviter que les PRs en cascade contiennent les modifications des lots précédents.

## Règles absolues

- Pas de modification du code des branches sauf si :
  - la CI échoue (corriger la cause sur la branche, repush) ;
  - un conflit de rebase apparaît (résoudre proprement, pas inventer de résolution sur du code métier).
- Pas de merge dans le désordre. Toujours FP-2.1 → FP-3.1 → FP-6.
- Pas de force-push sauf après rebase, et alors uniquement avec `--force-with-lease`.
- Pas de modification de la CI ni des workflows GitHub.
- Pas de démarrage de nouveau lot.
- Si la CI échoue, ne pas tenter de bypass (`--no-verify`, push admin, etc.). Analyser, corriger, repush, attendre verte.
- Pas de conflit de fichiers entre branches attendu : FP-2.1 touche `seller/profile/certifications` + `marketplace-products/[id]/certifications` + `marketplace-certifications.ts` + dashboard ; FP-3.1 touche `seller/profile/edit/page.tsx` + `marketplace-media-assets.ts` + `InlineMediaUploader.tsx` ; FP-6 touche backend DTOs + service + schema Prisma + page publique fiche produit. Les seuls fichiers communs sont des notes/handoff/SELLER_PROFILE.md — résoudre simplement en gardant la version la plus récente sur ces fichiers de doc/notes.

## Plan d'exécution

### Étape 1 — Vérification santé

```bash
git status                                            # working tree clean attendu
git log -1 main --oneline                             # 2d28d4c attendu
git branch --show-current                             # une branche fp-* attendue (probablement fp-6-product-fine-origin)
git log --oneline main..HEAD                          # 13 commits attendus depuis main
```

Re-vérifier que la branche `fp-6-product-fine-origin` est verte localement (puisqu'elle contient tout le travail des 3 lots) :

```bash
git checkout fp-6-product-fine-origin
pnpm install --frozen-lockfile
pnpm --filter @iox/backend  exec tsc --noEmit
pnpm --filter @iox/backend  test
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec next lint
pnpm --filter @iox/frontend exec vitest run
```

Si rouge : stopper, analyser, corriger, retester. Ne rien pousser tant que vert.

### Étape 2 — Push FP-2.1 + ouverture PR

```bash
git checkout fp-2-1-seller-certifications-edition
git push -u origin fp-2-1-seller-certifications-edition

gh pr create --base main --head fp-2-1-seller-certifications-edition \
  --title "feat(marketplace): FP-2.1 édition certifications par seller" \
  --body "$(cat <<'EOF'
## FP-2.1 — Édition certifications par seller

Permet au seller d'auto-éditer ses certifications, à la fois pour son `SellerProfile` et pour chacun de ses `MarketplaceProduct`. Backend FP-2 déjà câblé (CRUD seller + verify staff + projection publique) ; ce lot ajoute uniquement la couche frontend.

### Frontend
- Helper API `apps/frontend/src/lib/marketplace-certifications.ts` (list/create/update/remove + types).
- Composant `SellerCertificationsManager` paramétré par `(relatedType, relatedId)`, formulaire contrôlé (pas de RHF), suppression via `useConfirm()`, validation cohérence dates et `OTHER` requiert code/issuingBody.
- Page `/seller/profile/certifications` (résolution profil via `findMine()`).
- Page `/seller/marketplace-products/[id]/certifications` (scope MARKETPLACE_PRODUCT).
- Liens d'accès : QuickLink dashboard, action dans PageHeader profile/edit, lien dans liste produits.

### Backend
- Aucune modification — l'endpoint `POST/PATCH/DELETE /marketplace/certifications` ouvre déjà `MARKETPLACE_SELLER` avec ownership polymorphe.

### Tests
- +15 vitest (manager 9, profil 3, produit 3, présence dans liste +1)
- frontend total 117 → 132 (puis +8 dans FP-3.1)
- backend inchangé (450/450)

### Décisions clés
1. Pas d'uploader pour `documentMediaId` — déféré aux uploads génériques.
2. `useConfirm` mocké en test plutôt que monter le provider ConfirmDialog complet.
3. Validation seller-side : `OTHER` exige au moins code ou issuingBody.

### Smoke à valider après merge
- [ ] Seller approuvé : ajouter une certification BIO_EU sur son profil → statut PENDING.
- [ ] Staff QUALITY_MANAGER : verify la certif → badge VERIFIED apparaît côté public.
- [ ] Seller modifie cette certif → repasse PENDING, badge disparaît du public.
- [ ] Buyer reçoit 403 sur `POST /marketplace/certifications`.
EOF
)"
```

Attendre que la CI GitHub passe au vert. Ne pas merger avant. Si la CI échoue, analyser via `gh pr checks` et `gh run view`, corriger sur la branche, repush.

### Étape 3 — Merge FP-2.1

Une fois la CI verte :

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull --ff-only origin main
git log --oneline -3 main                             # vérifier que FP-2.1 est en tête
```

### Étape 4 — Rebase FP-3.1 sur le nouveau main

`fp-3-1-seller-media-uploader` était basée sur `fp-2-1-seller-certifications-edition`. Maintenant que FP-2.1 est dans main (sous forme squash), il faut **détacher** les commits propres à FP-3.1 et les replanter sur main :

```bash
git checkout fp-3-1-seller-media-uploader
git rebase --onto main fp-2-1-seller-certifications-edition fp-3-1-seller-media-uploader
```

**En cas de conflit** : typiquement sur `notes/`, `docs/marketplace/SELLER_PROFILE.md`, ou `apps/frontend/src/app/(dashboard)/seller/profile/edit/page.tsx` (FP-2.1 et FP-3.1 ont tous deux ajouté des éléments à cette page : lien "Gérer mes certifications" pour FP-2.1, uploaders LOGO+BANNER pour FP-3.1). Garder les deux changements en parallèle : la version finale de la page contient à la fois le lien certifs et les uploaders. Pas d'arbitrage métier nécessaire — c'est de la cohabitation simple.

Re-vérifier la santé après rebase :

```bash
pnpm install --frozen-lockfile
pnpm --filter @iox/backend  exec tsc --noEmit
pnpm --filter @iox/backend  test
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec next lint
pnpm --filter @iox/frontend exec vitest run
```

### Étape 5 — Push FP-3.1 + ouverture PR

```bash
git push --force-with-lease -u origin fp-3-1-seller-media-uploader

gh pr create --base main --head fp-3-1-seller-media-uploader \
  --title "feat(marketplace): FP-3.1 uploader inline logo + bannière seller" \
  --body "$(cat <<'EOF'
## FP-3.1 — Uploader inline logo + bannière

Câble côté seller un uploader d'image inline pour `logoMediaId` et `bannerMediaId` du `SellerProfile`, depuis `/seller/profile/edit`. Backend `media-assets/upload` déjà ouvert au rôle MARKETPLACE_SELLER ; ce lot est strictement frontend.

### Frontend
- Helper `apps/frontend/src/lib/marketplace-media-assets.ts` :
  - `upload(file, meta, token)` via `fetch` direct (le wrapper `api` partagé force `Content-Type: application/json`, incompatible avec multipart) ;
  - `getUrl(id, token)` pour URL signée temporaire.
- Validation client miroir backend : 5 Mo max, MIME whitelist `image/jpeg|png|webp`.
- Composant `InlineMediaUploader` contrôlé, machine à états `idle | preview | uploading | success | error`, preview via `URL.createObjectURL` + révocation au unmount.
- Intégration `/seller/profile/edit` : 2 uploaders (LOGO + BANNER) qui enchaînent `sellerProfilesApi.updateMine({ logoMediaId | bannerMediaId })` après upload puis ré-hydratent le formulaire.

### Backend
- Aucune modification.

### Tests
- +8 vitest (uploader 7 + presence 1)
- frontend total 132 → 140

### Décisions clés
1. Multipart fetch direct (le wrapper `api` impose `Content-Type: application/json` qui empêche le navigateur de poser le boundary `multipart/form-data`).
2. Token JWT transmis uniquement en header `Authorization`, pas en query string.
3. Validation MIME stricte côté client (whitelist `as const`) avant upload.

### Smoke à valider après merge
- [ ] Seller upload un logo PNG < 5 Mo → asset créé en `PENDING`, profil mis à jour.
- [ ] Seller upload un fichier > 5 Mo → refus client avec message clair.
- [ ] Seller upload un .gif → refus client (MIME non supporté).
- [ ] Buyer reçoit 403 sur `POST /marketplace/media-assets/upload`.
EOF
)"
```

Attendre CI verte.

### Étape 6 — Merge FP-3.1

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull --ff-only origin main
git log --oneline -4 main                             # FP-3.1 puis FP-2.1 en tête
```

### Étape 7 — Rebase FP-6 sur le nouveau main

```bash
git checkout fp-6-product-fine-origin
git rebase --onto main fp-3-1-seller-media-uploader fp-6-product-fine-origin
```

**En cas de conflit** : possiblement sur `notes/handoff-2026-04-26-mega-mandat.md` (le commit handoff `f939fa2` est sur fp-6 et référence les hash des branches précédentes). Garder la version finale du handoff comme commit séparé — il sera quand même utile en archive.

Re-vérifier la santé :

```bash
pnpm install --frozen-lockfile
pnpm --filter @iox/backend  exec tsc --noEmit
pnpm --filter @iox/backend  test
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec next lint
pnpm --filter @iox/frontend exec vitest run
```

### Étape 8 — Push FP-6 + ouverture PR

```bash
git push --force-with-lease -u origin fp-6-product-fine-origin

gh pr create --base main --head fp-6-product-fine-origin \
  --title "feat(marketplace): FP-6 origine fine produit (locality, altitude, GPS)" \
  --body "$(cat <<'EOF'
## FP-6 — Origine fine produit

Ajoute 4 champs optionnels d'origine fine sur `MarketplaceProduct` : `originLocality`, `altitudeMeters`, `gpsLat`, `gpsLng`. Migration strictement additive, projection publique sur la fiche produit, pas d'écran d'édition seller dédié dans ce lot (à venir avec un futur écran d'édition produit complet).

### Migration Prisma
- `prisma/migrations/20260426010000_add_marketplace_product_fine_origin/migration.sql` — 4 ALTER TABLE ADD COLUMN nullable, aucun défaut, aucun index.
- Lignes existantes restent à NULL ; aucun risque pour la prod.

### Backend
- DTO Create + Update étendus avec bornes class-validator :
  - `originLocality` : `MaxLength(160)`
  - `altitudeMeters` : `Int [0, 9000]`
  - `gpsLat` : `Number [-90, 90]`
  - `gpsLng` : `Number [-180, 180]`
- Helper `assertGpsPairCoherence()` service-side : `BadRequestException` si exactement un des deux GPS est fourni (cohérence imposée).
- Mapper public `marketplace-catalog.service.ts → ProductDetail` : ajoute les 4 champs ; `gpsLat/gpsLng` sérialisés via `Decimal.toString()` pour rester JSON-safe sans perte de précision.

### Frontend public
- Section "Origine détaillée" sur `/marketplace/products/[slug]` : affichée seulement si ≥ 1 champ présent.
- Lien GPS externe Google Maps (`target="_blank"`, `rel="noopener noreferrer"`).

### Tests
- +3 jest backend (create propage, create rejette orphelin GPS, update rejette orphelin GPS).
- backend total 450 → 453.

### Décisions clés
1. Cohérence GPS service-side plutôt que décorateur class-validator custom — plus testable.
2. `Decimal.toString()` pour préserver la précision JSON.
3. Pas d'index sur les 4 colonnes — données vitrine, jamais filtrées au MVP.

### Smoke à valider après merge
- [ ] Admin / staff crée un produit avec `originLocality="Combani"`, `altitudeMeters=350`, `gpsLat=-12.8275`, `gpsLng=45.166` → ok.
- [ ] Tentative de création avec `gpsLat` seul (sans `gpsLng`) → 400 BadRequest avec message "doivent être fournis ensemble".
- [ ] Page publique `/marketplace/products/[slug]` affiche la section "Origine détaillée" avec lien Maps fonctionnel.
- [ ] Produit sans aucun champ fine origin : section absente.
EOF
)"
```

Attendre CI verte (la migration sera appliquée par CI au build).

### Étape 9 — Merge FP-6

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull --ff-only origin main
git log --oneline -6 main                             # FP-6, FP-3.1, FP-2.1, FP-4, FP-3, Lot-9
```

### Étape 10 — Cleanup local

```bash
git branch -d fp-2-1-seller-certifications-edition  # déjà supprimée côté origin par --delete-branch
git branch -d fp-3-1-seller-media-uploader
git branch -d fp-6-product-fine-origin
git remote prune origin
```

Optionnel : nettoyer aussi les vieilles branches legacy si pas déjà fait (`fp-1-seasonality`, `fp-2-certifications`, `lot-7-bis`, `lot-8`, `lot-9`).

## Critères de succès

- main contient FP-2.1, FP-3.1, FP-6, dans cet ordre, sur origin.
- Aucune branche `fp-2-1-*`, `fp-3-1-*`, `fp-6-*` résiduelle (locale ou origin).
- Working tree clean sur main.
- CI verte sur main après chaque merge.
- Pas de force-push sauvage : seulement `--force-with-lease` après rebase autorisé.

## Gestion des blocages

- **CI rouge** : analyser `gh pr checks` et `gh run view`. Corriger sur la branche, recommit, repush. Ne pas merger en force.
- **Conflit de rebase non trivial** (autre que les conflits doc/notes attendus) : abandonner avec `git rebase --abort`, demander arbitrage humain. Ne pas inventer de résolution sur du code métier.
- **PR refusée par review** : appliquer les retours, recommit, repush. La PR est mise à jour automatiquement.
- **Migration FP-6 refusée par CI Prisma drift** : vérifier que la migration SQL et le schéma Prisma sont cohérents (mêmes noms de colonnes, mêmes types, mêmes nullabilités). Si OK, vérifier qu'aucune autre migration entre-temps n'a touché `marketplace_products`.

## Rapport attendu en fin

Mettre à jour `notes/handoff-<date>-push-fp2-1-fp3-1-fp6.md` avec :

- État final main : 3 nouveaux commits squash, hash courts.
- Liens des 3 PR mergées (#5, #6, #7 probablement).
- Confirmation que la CI a passé sur chacune des 3 PR.
- Smoke tests effectués ou laissés comme TODO ouverts.
- Working tree clean confirmé.
