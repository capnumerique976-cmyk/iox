# Prompt Claude Code — Push + PR + merge + deploy en cascade des 4 branches en attente (SEED-DEMO-FIX-2 + cascade mandat 14)

> **Usage** : à coller dans Claude Code. Lot court (~40-60 min selon vitesse CI), faible risque, **automatise les 4 cycles push/PR/merge/deploy** + l'activation du seed sur VPS au bon moment.
> **Pré-requis (à vérifier en premier — STOP si non remplis)** :
> - être sur la machine où le repo IOX est cloné, au chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - working tree clean (sauf untracked dans `docs-projet/`, `notes/handoff-*` non commités, et `.claude/settings.json` modifié — tous hors scope)
> - 4 branches locales existantes dans cet ordre exact :
>   - `seed-demo-fix-2-quality-and-logistics` (mandat 13, depuis main)
>   - `mp-offer-view-1-seller-detail` (mandat 14 LOT 1, depuis main)
>   - `mp-offer-edit-1-create-and-update` (mandat 14 LOT 2, depuis LOT 1)
>   - `mp-edit-product-3-light-main-media` (mandat 14 LOT 3, depuis LOT 2)
> - `main` local à `0c2a385` (intact)
> - `gh` CLI installé et authentifié (`gh auth status` → "Logged in to github.com")
> - SSH vers `rahiss-vps` configuré (`ssh -o BatchMode=yes -o ConnectTimeout=5 rahiss-vps true`)

---

## ⚠️ Garde-fou anti-hallucination

À la fin du mandat, **avant de rendre la synthèse**, tu DOIS exécuter et **recopier textuellement l'output** des 11 commandes de preuve listées en section "Preuves finales obligatoires". Toute synthèse rendue **sans ces 11 outputs réels** est invalide.

---

## Contexte canonique IOX (rappel concis)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js (App Router). Déploiement manuel via `./deploy/vps/deploy.sh all`.

État avant ce mandat :

- `main` à `0c2a385`, 16 lots marketplace mergés.
- VPS `iox.mycloud.yt` aligné, base peuplée : 4 sellers, 8 produits, 8 offres, 6 certifs, 8 MediaAssets PRIMARY APPROVED. Catalog `total: 8`. **Mais** les produits demo n'ont **pas encore** d'attributs FP-7 / FP-8 / FP-5 hydratés (seed-demo-fix-2 livré localement mais pas encore poussé).
- 4 branches locales prêtes à pousser : SEED-DEMO-FIX-2 (mandat 13) + chaîne MP-OFFER-VIEW → MP-OFFER-EDIT-1 → MP-EDIT-PRODUCT.3-light (mandat 14).

## Mandat

Pousser et merger les **4 branches dans l'ordre exact**, avec rebase `--onto main` entre chaque (sauf la première qui part déjà de main), redéployer le VPS après chaque merge, **activer le seed sur le VPS après le merge SEED-DEMO-FIX-2** pour que les filtres FP-7/FP-8 fonctionnent enfin sur des données réelles.

## Règles absolues

- Pas de modification du code des branches sauf si CI échoue ou conflit de rebase.
- Pas de merge dans le désordre. Toujours : SEED-DEMO-FIX-2 → MP-OFFER-VIEW → MP-OFFER-EDIT-1 → MP-EDIT-PRODUCT.3-light.
- Pas de force-push sauf après rebase, et alors `--force-with-lease`.
- Pas de bypass CI.
- Activation du seed sur le VPS **uniquement après** que SEED-DEMO-FIX-2 soit mergé et redéployé (sinon le code seed-fix-2 n'est pas encore dans le container backend).

## Conflits de rebase attendus

- **MP-OFFER-VIEW sur main post-SEED-DEMO-FIX-2** : aucun conflit attendu. Les deux branches sont indépendantes (seed touche `apps/backend/src/seed-demo/`, MP-OFFER-VIEW touche frontend uniquement).
- **MP-OFFER-EDIT-1 sur main post-MP-OFFER-VIEW** : aucun conflit attendu. MP-OFFER-EDIT-1 étend MP-OFFER-VIEW — le rebase `--onto main mp-offer-view-1-seller-detail` retire les commits de view (déjà sur main via squash) et garde ceux de edit-1.
- **MP-EDIT-PRODUCT.3-light sur main post-MP-OFFER-EDIT-1** : conflit possible **uniquement** sur `apps/frontend/src/lib/marketplace-products.ts` (MP-EDIT-PRODUCT.3-light assouplit `UpdateMarketplaceProductInput` pour autoriser `mainMediaId`). Conflit additif — combiner les modifs si nécessaire.

En cas de conflit non trivial sur du code métier : `git rebase --abort`, documenter, **stopper la cascade**.

## Note sur les 2 suites jest auth pré-existantes

Sur la machine locale, certains tests auth peuvent échouer indépendamment des 4 lots à pousser (régression depuis `39bfbd0`). En CI GitHub, ces tests passent (les PR récentes #14, #15, #16 ont validé avec ces mêmes échecs locaux). **Ignorer**, hors scope.

## Plan d'exécution

### Étape 0 — Vérification santé et pré-requis

```bash
# 0.1 — État initial
git status                                            # working tree clean attendu
git branch --show-current                             # une des 4 branches
git log -1 main --oneline                             # 0c2a385 attendu

# 0.2 — Les 4 branches existent
for b in seed-demo-fix-2-quality-and-logistics \
         mp-offer-view-1-seller-detail \
         mp-offer-edit-1-create-and-update \
         mp-edit-product-3-light-main-media ; do
  git rev-parse --verify "$b" >/dev/null 2>&1 && echo "✓ $b" || { echo "✗ $b MANQUANTE — STOP"; exit 1; }
done

# 0.3 — gh + SSH
gh auth status
ssh -o BatchMode=yes -o ConnectTimeout=5 rahiss-vps "echo SSH_OK"

# 0.4 — Santé locale sur la dernière branche (qui contient tout pour le mandat 14)
git checkout mp-edit-product-3-light-main-media
pnpm install --frozen-lockfile
pnpm --filter @iox/backend exec tsc --noEmit
pnpm --filter @iox/frontend exec tsc --noEmit
```

Si quelque chose échoue, stop. Pas de push.

### Étape 1 — SEED-DEMO-FIX-2 (PR #17)

```bash
git checkout seed-demo-fix-2-quality-and-logistics
git push -u origin seed-demo-fix-2-quality-and-logistics

gh pr create --base main --head seed-demo-fix-2-quality-and-logistics \
  --title "feat(seed-demo): SEED-DEMO-FIX-2 — hydrate FP-5/FP-7/FP-8 sur les produits demo" \
  --body "Hydrate les 8 produits demo : qualityAttributes (FP-7), temperatureRequirements + packagingFormats + grossWeight + netWeight + palletization (FP-8), annualProductionCapacity + capacityUnit + availableQuantity + restockFrequency (FP-5). Strictement seed (aucune modif backend/frontend/migration). Idempotent. Tests 9/9 -> 14/14 (+5 specs). Couverture filtres MP-FILTERS-1 garantie : 4 ORGANIC, 2 FAIR_TRADE, 4 HAND_HARVESTED, 2 ARTISANAL, 1 Frozen. Activation post-merge : IOX_DEMO_SEED=1 sur VPS."

gh pr checks --watch
```

Si CI rouge : analyser, corriger, repush. Pas de bypass.

### Étape 2 — Merge + sync + deploy (SEED-DEMO-FIX-2)

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only origin main
git log --oneline -3 main                             # SEED-DEMO-FIX-2 squash en tête
./deploy/vps/deploy.sh all
```

Attendu : `✅ Déploiement OK` + healthchecks 4/4. Si échec, **stop** avant de continuer.

### Étape 3 — Activation seed sur le VPS (CRITIQUE)

```bash
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend sh -c 'IOX_DEMO_SEED=1 pnpm db:seed:demo'"
```

Attendu : log type `✅ Demo seed done — sellers: 4, products: 8, offers: 8, certifications: 6, mediaAssets: 8, smokeSeller: smoke-seller@iox.mch`.

Cette activation hydrate les produits demo en base avec les nouveaux attributs FP-5/FP-7/FP-8 (idempotent — ne crée pas de doublons, juste un update sur les 8 produits existants).

### Étape 4 — Validation immédiate des filtres MP-FILTERS-1 (preuve fonctionnelle)

```bash
# ORGANIC = 4
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?qualityAttribute=ORGANIC" | jq '.data.meta.total // .data.total'

# FAIR_TRADE = 2
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?qualityAttribute=FAIR_TRADE" | jq '.data.meta.total // .data.total'

# Frozen = 1
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?temperatureRequirements=Frozen" | jq '.data.meta.total // .data.total'
```

Si les 3 retours ne sont pas exactement `4`, `2`, `1` → **stop**, l'activation seed n'a pas eu l'effet attendu. Ne pas continuer la cascade.

### Étape 5 — MP-OFFER-VIEW (PR #18) — rebase + push

```bash
git checkout mp-offer-view-1-seller-detail
git rebase --onto main seed-demo-fix-2-quality-and-logistics
```

Aucun conflit attendu (les deux branches touchent à des fichiers disjoints).

```bash
pnpm install --frozen-lockfile
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec vitest run --reporter=basic 2>&1 | tail -8
git push --force-with-lease -u origin mp-offer-view-1-seller-detail

gh pr create --base main --head mp-offer-view-1-seller-detail \
  --title "feat(marketplace): MP-OFFER-VIEW — page seller lecture détaillée d'une offre" \
  --body "Première brique d'autonomie seller sur les MarketplaceOffers : index + détail lecture. Backend offers déjà câblé (GET /, GET /:id ouverts à MARKETPLACE_SELLER avec scope auto). Pattern miroir MP-EDIT-PRODUCT.1 mais lecture seule. Composants : helper API marketplace-offers.ts, page index, page détail (sections identité, prix, dispo, logistique commerciale, visibilité, workflow, banner statut), QuickLink dashboard. Tests : +6 vitest (188 -> 194). Aucune modification backend. Création + édition arrivent dans MP-OFFER-EDIT-1 (PR suivante)."

gh pr checks --watch
```

### Étape 6 — Merge + sync + deploy (MP-OFFER-VIEW)

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only origin main
git log --oneline -4 main
./deploy/vps/deploy.sh all
```

### Étape 7 — MP-OFFER-EDIT-1 (PR #19) — rebase + push

```bash
git checkout mp-offer-edit-1-create-and-update
git rebase --onto main mp-offer-view-1-seller-detail
```

Aucun conflit attendu (MP-OFFER-EDIT-1 étend MP-OFFER-VIEW qui est désormais sur main).

```bash
pnpm install --frozen-lockfile
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec vitest run --reporter=basic 2>&1 | tail -8
git push --force-with-lease -u origin mp-offer-edit-1-create-and-update

gh pr create --base main --head mp-offer-edit-1-create-and-update \
  --title "feat(marketplace): MP-OFFER-EDIT-1 — création + édition champs sûrs + workflow soumission seller offer" \
  --body "Permet au seller de créer un brouillon d'offre, éditer les champs commerciaux sûrs (title, shortDescription, priceMode, unitPrice, currency, moq, availableQuantity, availability, leadTimeDays, incoterm, departureLocation, destinationMarketsJson) et soumettre à validation. Type UpdateMarketplaceOfferInput strict (rejette marketplaceProductId, sellerProfileId, visibilityScope, exportReadinessStatus, publicationStatus, featuredRank, rejectionReason, dates workflow). Probe TS dans le handoff prouve le rejet de marketplaceProductId à la compilation. Page /new + édition inline + bouton Soumettre. Tests : +9 vitest (194 -> 203). Aucune modification backend (POST /, PATCH /:id, POST /:id/submit ouverts à SELLER_EDIT)."

gh pr checks --watch
```

### Étape 8 — Merge + sync + deploy (MP-OFFER-EDIT-1)

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only origin main
git log --oneline -5 main
./deploy/vps/deploy.sh all
```

### Étape 9 — MP-EDIT-PRODUCT.3-light (PR #20) — rebase + push

```bash
git checkout mp-edit-product-3-light-main-media
git rebase --onto main mp-offer-edit-1-create-and-update
```

Conflit possible **uniquement** sur `apps/frontend/src/lib/marketplace-products.ts` (assouplissement contrat). Cohabitation simple : combiner les modifs.

```bash
pnpm install --frozen-lockfile
pnpm --filter @iox/frontend exec tsc --noEmit
pnpm --filter @iox/frontend exec vitest run --reporter=basic 2>&1 | tail -8
git push --force-with-lease -u origin mp-edit-product-3-light-main-media

gh pr create --base main --head mp-edit-product-3-light-main-media \
  --title "feat(marketplace): MP-EDIT-PRODUCT.3-light — InlineMediaUploader sur mainMediaId produit (assouplit contrat MP-EDIT-PRODUCT.1)" \
  --body "Branche le composant InlineMediaUploader (FP-3.1, déjà existant sur SellerProfile logo+bannière) sur le mainMediaId du MarketplaceProduct. Section Image principale ajoutée à la page seller /seller/marketplace-products/[id]. **Assouplissement explicite du contrat MP-EDIT-PRODUCT.1** : UpdateMarketplaceProductInput autorise désormais mainMediaId (les autres exclusions slug/categoryId/publicationStatus restent en place — preuve TS dans le handoff). Comportement modération PENDING/APPROVED documenté : un upload seller passe en PENDING -> le produit disparaît du catalog public le temps que le staff approuve dans review queue. Tests : +3 vitest (203 -> 206). Aucune modification backend."

gh pr checks --watch
```

### Étape 10 — Merge + sync + deploy (MP-EDIT-PRODUCT.3-light)

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only origin main
git log --oneline -6 main
./deploy/vps/deploy.sh all
```

### Étape 11 — Validations finales (curl)

```bash
# 1. Catalog total inchangé (les 8 produits restent visibles)
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?limit=24" | jq '.data.meta.total // .data.total'
# Attendu : 8

# 2. Filtres FP-7/FP-8 actifs (ré-vérifier après cascade complète)
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?qualityAttribute=ORGANIC" | jq '.data.meta.total // .data.total'
# Attendu : 4

# 3. Sellers
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog/sellers?limit=10" | jq '.data.meta.total'
# Attendu : 4

# 4. Smoke authentifié avec smoke-seller (doit voir ses offres maintenant)
BASE_URL=https://iox.mycloud.yt \
SMOKE_EMAIL=smoke-seller@iox.mch \
SMOKE_PASSWORD='IoxSmoke2026!' \
./scripts/smoke-authenticated.sh 2>&1 | tail -20
```

### Étape 12 — Cleanup local

```bash
git branch -d seed-demo-fix-2-quality-and-logistics
git branch -d mp-offer-view-1-seller-detail
git branch -d mp-offer-edit-1-create-and-update
git branch -d mp-edit-product-3-light-main-media
git remote prune origin
```

## Critères de succès

- 4 PR (#17, #18, #19, #20) mergées sur main, dans cet ordre, avec CI verte.
- 4 deploys VPS terminés avec healthchecks OK.
- Activation seed terminée avec log `mediaAssets: 8` (compteurs stables).
- Filtres FP-7/FP-8 retournent les bons compteurs (`ORGANIC=4`, `FAIR_TRADE=2`, `Frozen=1`).
- Catalog `total: 8`, sellers `total: 4`.
- Working tree clean en fin sur main.
- Aucune branche `seed-demo-fix-2-*`, `mp-offer-*`, `mp-edit-product-3-*` résiduelle.

## Gestion des blocages

- **CI rouge** : analyser `gh pr checks` + `gh run view`, corriger sur la branche en cours, repush. Pas de bypass.
- **Conflit de rebase non trivial** : `git rebase --abort`, documenter, **stopper la cascade**.
- **Échec deploy** : log + rollback `./deploy/vps/rollback.sh all`. Stop avant de continuer.
- **Échec activation seed** : log brut, vérifier code seed-fix-2 dans container (`docker exec backend cat apps/backend/src/seed-demo/dataset.ts | grep qualityAttributes | head -5`). Ne pas inventer.
- **Filtres ne retournent pas les compteurs attendus** après activation : possible cause — base déjà peuplée avec un ancien dataset, conflit d'upsert. Investiguer, ne pas inventer.

## Preuves finales obligatoires (anti-hallucination)

**Avant de rendre la synthèse**, exécute et recopie textuellement l'output des 11 commandes ci-dessous.

```bash
# 1. État final main + 4 squash commits
git log --oneline -7 main
git rev-parse main

# 2. Confirmation des 4 PR mergées
gh pr list --state merged --limit 5 | head -10

# 3. Healthchecks VPS
curl -s https://iox.mycloud.yt/api/v1/health | head -200

# 4. Output activation seed (récupéré à l'étape 3)
# (recopier textuellement le retour de la commande SSH)

# 5. ORGANIC = 4 (preuve fonctionnelle FP-7)
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?qualityAttribute=ORGANIC" | jq '.data.meta.total // .data.total'

# 6. FAIR_TRADE = 2
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?qualityAttribute=FAIR_TRADE" | jq '.data.meta.total // .data.total'

# 7. Frozen = 1 (preuve fonctionnelle FP-8)
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?temperatureRequirements=Frozen" | jq '.data.meta.total // .data.total'

# 8. Catalog total = 8 (inchangé)
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?limit=24" | jq '.data.meta.total // .data.total'

# 9. Smoke seller authentifié résultat — derniers 30 lignes
# (tirées du run de l'étape 11.4 — recopier textuellement)

# 10. Working tree clean
git status

# 11. Aucune branche résiduelle des 4 lots
git branch -a | grep -E "(seed-demo-fix-2|mp-offer-view|mp-offer-edit|mp-edit-product-3)" || echo "✓ aucune branche résiduelle"
```

**Rejet de la synthèse** : si l'un de ces 11 outputs n'est pas dans ton rapport final avec son **vrai contenu**, le mandat est considéré comme **non livré**.

## Format du handoff

`notes/handoff-<date>-cascade-4-branches-seed-fix2-and-mandat-14.md` doit contenir :

- État final main : 4 nouveaux squash commits (#17, #18, #19, #20) avec hashes.
- Liens des 4 PR mergées.
- Confirmation des 4 deploys VPS + healthchecks.
- Log activation seed (étape 3).
- 4 curl de validation fonctionnelle (`ORGANIC=4`, `FAIR_TRADE=2`, `Frozen=1`, total `8`).
- Output smoke seller authentifié (étape 11.4).
- Branches résiduelles : aucune.
- Working tree clean confirmé.

## Rappel final

- **Aucune action sur la prod réelle** — uniquement sur la pré-prod `iox.mycloud.yt`.
- **Vérifie sur disque/serveur** avant chaque étape critique.
- **Recopie l'output réel** des 11 preuves en fin de mandat — pas de description, pas d'invention.
- En cas de doute ou d'échec, rapporte le brut.

Une fois ce mandat terminé, la marketplace IOX aura **20 lots mergés au total** sur main, avec une démo pleinement fonctionnelle :
- Seller peut tout gérer (profil, certifs, produits, offres, image principale, saisonnalité)
- Catalog public riche avec 13 filtres dont FP-7/FP-8 actifs
- 8 offres visibles avec badges qualité, conditions de température, formats packaging
- 4 sellers vedette avec leurs cards et fiches détaillées
- Smoke authentifié validable de bout en bout avec compte `smoke-seller@iox.mch`
