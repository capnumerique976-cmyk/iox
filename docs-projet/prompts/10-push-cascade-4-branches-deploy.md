# Prompt Claude Code — Push + PR + merge + deploy en cascade des 4 branches du méga-mandat 9

> **Usage** : à coller tel quel dans Claude Code. Lot court (~30-50 min selon vitesse CI), faible risque, **automatise les 4 cycles push/PR/merge/deploy** en cascade avec rebase `--onto main` entre chaque.
> **Pré-requis (à vérifier en premier — STOP si non remplis)** :
>
> - être sur la machine où le repo IOX est cloné, au chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - working tree clean (sauf untracked dans `docs-projet/` et éventuellement `notes/handoff-*` non commités hors scope)
> - 4 branches locales existantes dans cet ordre exact :
>   - `mp-edit-product-1-seller-edit-safe-fields` (mandat 08)
>   - `mp-edit-product-2-seller-create-and-workflow` (mandat 09 LOT 1)
>   - `fp-8-product-logistics-structured` (mandat 09 LOT 2)
>   - `seed-demo-fix-media-assets` (mandat 09 LOT 3)
> - `main` local à `9f9fddd` (intact)
> - `gh` CLI installé et authentifié (`gh auth status` → "Logged in to github.com")
> - SSH vers `rahiss-vps` configuré (`ssh -o BatchMode=yes -o ConnectTimeout=5 rahiss-vps true`)

---

## ⚠️ Garde-fou anti-hallucination

À la fin du mandat, **avant de rendre la synthèse**, tu DOIS exécuter et **recopier textuellement l'output** des 9 commandes de preuve listées en section "Preuves finales obligatoires". Toute synthèse rendue **sans ces 9 outputs réels** est invalide. Si tu ne peux pas exécuter l'une d'elles, rapporte l'erreur brute au lieu d'inventer un succès.

---

## Contexte canonique IOX (rappel concis)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js (App Router). Déploiement manuel via `./deploy/vps/deploy.sh all`.

État avant ce mandat :

- `main` = `9f9fddd` (origin/main aligné), 7 lots marketplace mergés (FP-3, FP-4, FP-2.1, FP-3.1, FP-6, MP-S-INDEX, SEED-DEMO).
- VPS `iox.mycloud.yt` aligné avec `9f9fddd`. Base peuplée : 4 sellers, 8 produits, 8 offres, 6 certifs, 1 compte smoke-seller. **Catalog public à `total: 0`** (gate `MediaAsset PRIMARY` non franchie).
- 4 branches locales du mandat 09 prêtes à pousser : MP-EDIT-PRODUCT.1, MP-EDIT-PRODUCT.2, FP-8, SEED-DEMO-FIX.

## Mandat

Pousser et merger les **4 branches dans l'ordre exact**, avec rebase `--onto main` entre chaque pour que chaque PR ne contienne que ses propres commits, redéployer le VPS après chaque merge, **activer le seed à la fin** pour appliquer les MediaAssets et faire passer enfin le catalog à `total: 8`.

## Règles absolues

- Pas de modification du code des branches sauf si :
  - la CI échoue (corriger la cause sur la branche, repush) ;
  - un conflit de rebase apparaît (résoudre proprement, pas inventer).
- Pas de merge dans le désordre. Toujours : MP-EDIT-PRODUCT.1 → MP-EDIT-PRODUCT.2 → FP-8 → SEED-DEMO-FIX.
- Pas de force-push sauf après rebase, et alors uniquement avec `--force-with-lease`.
- Pas de modification de la CI ni des workflows GitHub.
- Pas de bypass CI (`--no-verify`, admin merge non).
- Aucune action sur la production réelle — uniquement sur la pré-prod `iox.mycloud.yt`.
- Pas de réactivation seed `IOX_DEMO_SEED=1` AVANT le merge de SEED-DEMO-FIX (sinon les MediaAssets ne sont pas dans le code déployé).

## Conflits attendus / pas attendus

- **MP-EDIT-PRODUCT.2 sur main** (post-MP-EDIT-PRODUCT.1) : aucun conflit attendu. MP-EDIT-PRODUCT.2 ajoute la page `/new` et étend la page `[id]/page.tsx` livrée par .1. Le rebase `--onto main mp-edit-product-1-...` doit retirer naturellement les commits de .1 (déjà dans main via squash) et garder ceux de .2.
- **FP-8 sur main** (post-MP-EDIT-PRODUCT.2) : conflit possible sur `apps/frontend/src/lib/marketplace-products.ts` (le helper API où FP-8 a ajouté les 5 champs logistique au type) et sur la page `[id]/page.tsx` (FP-8 a ajouté la section logistique). Conflit additif, résolution = combiner les deux ajouts.
- **SEED-DEMO-FIX sur main** (post-FP-8) : conflit possible sur `apps/backend/src/seed-demo/runner.ts` ou `dataset.ts`. Conflit additif probable (FP-8 ne touche probablement pas au seed, mais à vérifier).

En cas de conflit non trivial sur du code métier (pas une simple cohabitation de blocs additifs) : **abandonner le rebase** (`git rebase --abort`), documenter dans le handoff, **stopper la cascade**. Ne pas inventer de résolution sur du code métier.

## Plan d'exécution

### Étape 0 — Vérification santé et pré-requis

```bash
# 0.1 — État initial
git status                                            # working tree clean attendu
git branch --show-current                             # une des 4 branches attendues
git log -1 main --oneline                             # 9f9fddd attendu

# 0.2 — Les 4 branches existent
for b in mp-edit-product-1-seller-edit-safe-fields \
         mp-edit-product-2-seller-create-and-workflow \
         fp-8-product-logistics-structured \
         seed-demo-fix-media-assets ; do
  git rev-parse --verify "$b" && echo "✓ $b OK" || { echo "✗ $b MANQUANTE — STOP"; exit 1; }
done

# 0.3 — gh + SSH
gh auth status
ssh -o BatchMode=yes -o ConnectTimeout=5 rahiss-vps "echo SSH_OK"

# 0.4 — Santé locale sur la dernière branche (qui contient tout)
git checkout seed-demo-fix-media-assets
pnpm install --frozen-lockfile
pnpm --filter @iox/backend exec tsc --noEmit
pnpm --filter @iox/backend test
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec next lint
pnpm --filter @iox/frontend exec vitest run
```

Si quelque chose échoue, stop. Pas de push.

### Étape 1 — MP-EDIT-PRODUCT.1 (PR #10)

```bash
git checkout mp-edit-product-1-seller-edit-safe-fields
git push -u origin mp-edit-product-1-seller-edit-safe-fields

gh pr create --base main --head mp-edit-product-1-seller-edit-safe-fields \
  --title "feat(marketplace): MP-EDIT-PRODUCT.1 — page seller détail+édition champs sûrs" \
  --body "$(cat <<'EOF'
## MP-EDIT-PRODUCT.1 — Page seller détail + édition des champs sûrs

Première brique du chantier d'autonomie seller : page \`/seller/marketplace-products/[id]/page.tsx\` qui permet à un seller de lire et éditer son produit marketplace sans passer par le staff.

### Périmètre

**Champs édités** (sûrs, sans conséquence taxonomie/SEO/workflow) : identité (commercialName, regulatoryName, subtitle), origine (originCountry, originRegion, originLocality, altitudeMeters, gpsLat, gpsLng — FP-6), variétés (varietySpecies, productionMethod), descriptions (descriptionShort, descriptionLong, usageTips), conservation (packagingDescription, storageConditions, shelfLifeInfo, allergenInfo).

**Champs interdits** (rejetés par tsc côté frontend) : slug, categoryId, mainMediaId, publicationStatus, harvestMonths/availabilityMonths/isYearRound (édition via /seasonality), defaultUnit/minimumOrderQuantity (FP-5 candidat), nutritionInfoJson, workflow.

### Backend
- Aucune modification (\`MARKETPLACE_SELLER\` autorisé sur \`GET /:id\` et \`PATCH /:id\`, ownership enforce via \`assertMarketplaceProductOwnership\`).

### Frontend
- Helper API \`marketplaceProductsApi.update(id, payload, token)\` avec type strict \`UpdateMarketplaceProductInput\` excluant les champs interdits (preuve par tsc dans le handoff).
- Page \`/seller/marketplace-products/[id]/page.tsx\` (28.5 KB) — controlled state, dirty/disabled, diff minimal, validation client (pair GPS), banner d'avertissement si APPROVED/PUBLISHED.
- Lien "Détails" sur l'index seller.

### Tests
- 8 tests vitest sur la nouvelle page.
- Frontend total 151 → 159.

### Décisions
1. Pattern controlled state miroir de \`/seller/profile/edit\` (pas de RHF).
2. Type \`UpdateMarketplaceProductInput\` exclut les champs interdits → tsc rejette à la compilation.
3. Banner \`publicationStatus ∈ {APPROVED, PUBLISHED}\` annonce la re-revue qualité au save.

### Smoke à valider après merge
- [ ] Seller smoke (\`smoke-seller@iox.mch\`) navigue vers \`/seller/marketplace-products\` → liste OK
- [ ] Click \"Détails\" sur un produit → page rendue
- [ ] Modifier descriptionShort → save OK + audit
- [ ] Tenter gpsLat seul → 400 BadRequest
EOF
)"

# Attendre CI verte (~5-12 min selon load)
gh pr checks --watch
```

Si CI rouge : analyser via `gh run view`, corriger sur la branche, repush. Pas de bypass.

### Étape 2 — Merge + sync + deploy (MP-EDIT-PRODUCT.1)

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull --ff-only origin main
git log --oneline -3 main                             # MP-EDIT-PRODUCT.1 squash en tête
./deploy/vps/deploy.sh all
```

Attendu : `✅ Déploiement OK` + healthchecks 4/4. Si échec, **stop** avant de continuer.

### Étape 3 — MP-EDIT-PRODUCT.2 (PR #11) — rebase --onto + push

```bash
git checkout mp-edit-product-2-seller-create-and-workflow
git rebase --onto main mp-edit-product-1-seller-edit-safe-fields
```

Si conflit non trivial → abort + stop. Si OK, repush :

```bash
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec vitest run
git push --force-with-lease -u origin mp-edit-product-2-seller-create-and-workflow

gh pr create --base main --head mp-edit-product-2-seller-create-and-workflow \
  --title "feat(marketplace): MP-EDIT-PRODUCT.2 — création produit seller + workflow soumission/archivage" \
  --body "$(cat <<'EOF'
## MP-EDIT-PRODUCT.2 — Création produit + workflow seller

Deuxième brique du chantier d'autonomie seller : page de création \`/seller/marketplace-products/new\` + actions submit/archive sur la page détail livrée par .1.

### Périmètre

#### Page \`/seller/marketplace-products/new/page.tsx\`
- Formulaire minimal : commercialName (required), slug (généré côté client + éditable + unique), originCountry (required), productId (UUID manuel — picker visuel hors scope ce lot).
- POST \`/marketplace/products\` → status DRAFT par défaut côté backend.
- Redirection \`/seller/marketplace-products/[id]\` après création.

#### Actions sur \`/seller/marketplace-products/[id]/page.tsx\`
- Bouton \"Soumettre à validation\" si \`publicationStatus ∈ {DRAFT, REJECTED}\` → POST \`/:id/submit\`.
- Bouton \"Archiver\" si \`publicationStatus !== ARCHIVED\` → POST \`/:id/archive\` (confirmation destructive).
- Refresh + mise à jour badge statut après chaque action.

### Backend
- Aucune modification — endpoints \`POST /marketplace/products\`, \`POST /:id/submit\`, \`POST /:id/archive\` ouverts à \`SELLER_EDIT\`.

### Frontend
- Helper API étendu : \`create()\`, \`submit()\`, \`archive()\`.
- \`CreateMarketplaceProductInput\` extends \`UpdateMarketplaceProductInput\` + ajoute productId + sellerProfileId + commercialName + slug + originCountry (required à la création).
- Bouton \"Nouveau produit\" sur l'index seller.

### Tests
- +N vitest (cible : 159 → ~167+).

### Décisions
1. Pas de picker visuel \`Product\` MCH → UUID manuel comme première itération.
2. \`slug\` autorisé à la création seulement (immuable après).
3. \`gh pr merge --squash\` après CI verte.
EOF
)"

gh pr checks --watch
```

### Étape 4 — Merge + sync + deploy (MP-EDIT-PRODUCT.2)

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only origin main
git log --oneline -4 main
./deploy/vps/deploy.sh all
```

### Étape 5 — FP-8 (PR #12) — rebase + push (avec migration Prisma)

```bash
git checkout fp-8-product-logistics-structured
git rebase --onto main mp-edit-product-2-seller-create-and-workflow
```

Conflit possible sur `marketplace-products.ts` et `[id]/page.tsx` (cohabitation des sections logistique + identité). Résolution = garder les deux blocs additifs.

```bash
pnpm install --frozen-lockfile
pnpm --filter @iox/backend exec tsc --noEmit
pnpm --filter @iox/backend test
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec vitest run
git push --force-with-lease -u origin fp-8-product-logistics-structured

gh pr create --base main --head fp-8-product-logistics-structured \
  --title "feat(marketplace): FP-8 — logistique structurée produit (additif)" \
  --body "$(cat <<'EOF'
## FP-8 — Logistique structurée produit

Ajoute 5 champs logistique sur \`MarketplaceProduct\` pour répondre aux attentes B2B export : packagingFormats[], temperatureRequirements, grossWeight, netWeight, palletization.

### Migration Prisma
- \`prisma/migrations/20260427000000_add_marketplace_product_logistics/migration.sql\`
- 5 ALTER TABLE ADD COLUMN, **strictement additif**, aucun DROP/RENAME.
- \`packaging_formats TEXT[] NOT NULL DEFAULT []\` (pattern miroir FP-1 saisonnalité).

### Backend
- DTO Create + Update étendus (class-validator : MaxLength 80/100/500, weight [0, 100000 kg]).
- Projection publique catalog inclut les 5 champs.

### Frontend
- Section "Logistique structurée" sur la page d'édition seller (\`[id]/page.tsx\`).
- Section sur la fiche publique \`/marketplace/products/[slug]\`.

### Tests
- +N jest backend, +N vitest frontend.

### Smoke à valider après merge
- [ ] Migration appliquée par docker-entrypoint au démarrage backend.
- [ ] Édition seller d'un produit demo → champs logistique modifiables.
- [ ] Fiche publique affiche la section si champs renseignés.
EOF
)"

gh pr checks --watch
```

### Étape 6 — Merge + sync + deploy (FP-8)

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only origin main
git log --oneline -5 main
./deploy/vps/deploy.sh all                            # docker-entrypoint applique la migration FP-8
```

Attendu : log au démarrage du backend qui mentionne `Applying migration: 20260427000000_add_marketplace_product_logistics`.

### Étape 7 — SEED-DEMO-FIX (PR #13) — rebase + push

```bash
git checkout seed-demo-fix-media-assets
git rebase --onto main fp-8-product-logistics-structured
```

Conflit improbable (le seed-fix touche `runner.ts` et `dataset.ts` que FP-8 ne touche pas).

```bash
pnpm install --frozen-lockfile
pnpm --filter @iox/backend exec tsc --noEmit
pnpm --filter @iox/backend test
git push --force-with-lease -u origin seed-demo-fix-media-assets

gh pr create --base main --head seed-demo-fix-media-assets \
  --title "feat(seed-demo): MediaAssets PRIMARY APPROVED par produit demo (idempotent)" \
  --body "$(cat <<'EOF'
## SEED-DEMO-FIX — Ajout des MediaAssets manquants

Comble la lacune du seed initial : 8 \`MediaAsset PRIMARY APPROVED\` (1 par MarketplaceProduct demo) pour franchir la gate \`findProductsWithPrimaryMedia\` du catalog public.

### Avant ce fix
- \`/api/v1/marketplace/catalog\` → \`total: 0\` malgré 8 produits PUBLISHED en base.
- Cause : la gate exige un MediaAsset (PRIMARY, APPROVED) par produit, le seed n'en créait aucun.

### Après ce fix
- 8 MediaAssets placeholder créés par le seed (storageKey \`demo/<slug>-primary.jpg\`, sans vrai fichier — placeholder text-only).
- Idempotence : \`findFirst\` sur \`(relatedType, relatedId, role)\` puis update/create.
- Test Jest dédié : 2ᵉ run → 0 nouveau MediaAsset créé.

### Run réel sur dev DB (cf. handoff méga-mandat 9)
\`\`\`
✅ Demo seed done — sellers: 4, products: 8, offers: 8,
   certifications: 6, mediaAssets: 8, smokeSeller: smoke-seller@iox.mch

primary_approved = 8 | with_main_media = 8
2ᵉ run idempotent : count stable à 8
\`\`\`

### Activation post-merge sur pré-prod
\`\`\`bash
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend sh -c 'IOX_DEMO_SEED=1 pnpm db:seed:demo'"
\`\`\`

Après cette commande, \`GET /api/v1/marketplace/catalog\` doit retourner \`total: 8\`.
EOF
)"

gh pr checks --watch
```

### Étape 8 — Merge + sync + deploy (SEED-DEMO-FIX)

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only origin main
git log --oneline -6 main
./deploy/vps/deploy.sh all
```

### Étape 9 — Activation seed sur le VPS (CRITIQUE)

```bash
# Le code SEED-DEMO-FIX est maintenant déployé. On active pour appliquer les MediaAssets en base prod.
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend sh -c 'IOX_DEMO_SEED=1 pnpm db:seed:demo'"
```

Attendu :

```
✅ Demo seed done — sellers: 4, products: 8, offers: 8, certifications: 6, mediaAssets: 8, smokeSeller: smoke-seller@iox.mch
```

Si la sortie n'inclut pas `mediaAssets: 8`, **stop** et rapporter — le seed-fix n'a pas tourné comme prévu.

### Étape 10 — Validations finales (catalog désormais peuplé)

```bash
# Le catalog doit maintenant être peuplé
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?limit=24" | jq '.data.meta.total // .data.total // "no jq"'
# Attendu : 8

# Les sellers (déjà OK)
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog/sellers?limit=10" | jq '.data.meta.total // "no jq"'
# Attendu : 4

# Une fiche publique avec section logistique (FP-8)
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog/products/$(curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?limit=1" | jq -r '.data.data[0].productSlug // .data[0].productSlug')" | jq '. | {commercialName: .data.commercialName, packagingFormats: .data.packagingFormats, temperatureRequirements: .data.temperatureRequirements, grossWeight: .data.grossWeight}'

# Page publique catalog
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://iox.mycloud.yt/marketplace
```

### Étape 11 — Cleanup local

```bash
git branch -d mp-edit-product-1-seller-edit-safe-fields
git branch -d mp-edit-product-2-seller-create-and-workflow
git branch -d fp-8-product-logistics-structured
git branch -d seed-demo-fix-media-assets
git remote prune origin
```

## Critères de succès

- 4 PR (#10, #11, #12, #13) mergées sur main, dans cet ordre, avec CI verte sur chaque.
- 4 déploiements VPS terminés avec healthchecks OK.
- Activation seed terminée avec log `mediaAssets: 8`.
- `GET /marketplace/catalog?limit=24` retourne `total: 8`.
- Working tree clean en fin sur main.
- Aucune branche `mp-edit-product-*`, `fp-8-*`, `seed-demo-fix-*` résiduelle (locale ou origin).

## Gestion des blocages

- **CI rouge** : analyser, corriger sur la branche en cours, repush, attendre verte. Pas de bypass.
- **Conflit de rebase non trivial** : `git rebase --abort`, documenter, **stopper la cascade**. Ne pas inventer.
- **Échec deploy** : récupérer log, rollback possible via `./deploy/vps/rollback.sh all`. Stop avant de continuer.
- **Échec activation seed** : récupérer log brut, vérifier que le code SEED-DEMO-FIX est bien dans le container backend (`docker exec backend sh -c 'cat apps/backend/src/seed-demo/runner.ts | grep -c mediaAsset'` doit retourner > 0).
- **Catalog total: 0 après activation seed** : possibles causes — code pas déployé, container pas redémarré, seed non re-tourné. Investiguer, ne pas inventer.

## Preuves finales obligatoires (anti-hallucination)

**Avant de rendre la synthèse**, exécute et recopie textuellement l'output des 9 commandes ci-dessous.

```bash
# 1. État final main + 4 squash commits
git log --oneline -7 main
git rev-parse main

# 2. Confirmation des 4 PR mergées
gh pr list --state merged --limit 5 | head -10

# 3. Healthchecks VPS
curl -s https://iox.mycloud.yt/api/v1/health | head -200

# 4. Output activation seed (récupéré à l'étape 9)
# (recopie textuellement le retour de la commande SSH)

# 5. Catalog total = 8
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?limit=24" | jq '.data.meta.total // .data.total'

# 6. Sellers total = 4
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog/sellers?limit=10" | jq '.data.meta.total'

# 7. Présence des champs FP-8 sur une fiche publique
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?limit=1" \
  | jq -r '.data.data[0].productSlug // .data[0].productSlug' \
  | xargs -I{} curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog/products/{}" \
  | jq '{packagingFormats: .data.packagingFormats, temperatureRequirements: .data.temperatureRequirements, grossWeight: .data.grossWeight}'

# 8. Working tree clean
git status

# 9. Aucune branche résiduelle des 4 lots
git branch -a | grep -E "(mp-edit-product-|fp-8-|seed-demo-fix-)" || echo "✓ aucune branche résiduelle"
```

**Rejet de la synthèse** : si l'un de ces 9 outputs n'est pas dans ton rapport final avec son **vrai contenu**, le mandat est considéré comme **non livré**.

## Format du handoff

`notes/handoff-<date>-cascade-4-branches.md` doit contenir :

- État final main : 4 nouveaux squash commits avec hashes.
- Liens des 4 PR mergées.
- Confirmation healthchecks VPS post-deploy final.
- Log activation seed.
- 3 curl validation finale (catalog total, sellers total, fiche FP-8).
- Working tree clean confirmé.
- Branches résiduelles : aucune.

## Rappel final

- **Aucune action sur la prod réelle** — uniquement sur la pré-prod `iox.mycloud.yt`.
- **Vérifie sur disque/serveur** avant chaque étape critique.
- **Recopie l'output réel** des 9 preuves en fin de mandat.
- En cas de doute ou d'échec, rapporte le brut.
