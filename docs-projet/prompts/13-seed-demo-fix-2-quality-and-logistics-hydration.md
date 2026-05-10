# Prompt Claude Code — SEED-DEMO-FIX-2 — Hydratation FP-7 (qualité) + FP-8 (logistique) + FP-5 (volumes) sur les produits demo

> **Usage** : à coller dans Claude Code après que la cascade FP-5/FP-7/MP-FILTERS-1 soit mergée et déployée (post-mandat 12, main = `0c2a385`). Lot court (~1.5-2 h), faible risque, fort impact démo.
> **Pré-requis (à vérifier en premier — STOP si non remplis)** :
>
> - être sur la machine où le repo IOX est cloné, au chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - working tree clean (sauf untracked dans `docs-projet/`, `notes/handoff-*` non commités, et `.claude/settings.json` modifié — tous hors scope)
> - `main` local et origin/main alignés à `0c2a385` ou plus récent (vérifier que `feat(marketplace): MP-FILTERS-1` est en tête)
> - branche courante : `main`

Si l'un de ces pré-requis n'est pas rempli, **STOP** et écris dans `notes/handoff-seed-demo-fix-2-stop.md` ce que tu as constaté.

---

## ⚠️ Garde-fou anti-hallucination — règles obligatoires

À la fin du mandat, **avant de rendre la synthèse**, tu DOIS exécuter et **recopier textuellement l'output** des 5 commandes de preuve listées en section "Preuves finales obligatoires". Toute synthèse rendue **sans ces 5 outputs réels** est invalide.

Le mandat 9 SEED-DEMO-FIX a démontré que ce pattern fonctionne (run réel avec compteurs vrais : `mediaAssets: 8` etc.). **Garder cette discipline.**

---

## Contexte canonique IOX (rappel concis)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL.

État avant ce mandat :

- `main` à `0c2a385` (16 lots marketplace mergés). Schema `MarketplaceProduct` enrichi avec FP-1 (saisonnalité), FP-6 (origine fine), FP-8 (logistique), FP-5 (volumes/capacités), FP-7 (qualité structurée).
- VPS `iox.mycloud.yt` aligné, base peuplée par le seed démo (4 sellers, 8 produits PUBLISHED, 8 offres, 6 certifs, 8 MediaAssets PRIMARY APPROVED). Catalog `total: 8`.
- Filtres catalog publique étendus par MP-FILTERS-1 : `qualityAttribute`, `seasonalityMonth`, `temperatureRequirements`, etc.
- **Constat** : les filtres FP-7 et FP-8 sont câblés mais **les 8 produits demo n'ont aucun `qualityAttributes`, ni `temperatureRequirements`, ni `packagingFormats`, ni champs FP-5**. Conséquences :
  - `?qualityAttribute=ORGANIC` → 0 résultat (filtre marche, mais rien à filtrer)
  - Fiches publiques sans badges qualité
  - Démo pas convaincante visuellement

## Objectif

**Hydrater le seed démo** avec des valeurs cohérentes pour les nouveaux champs, en restant **strictement idempotent** et **strictement cantonné au seed-demo**. Aucun changement de code applicatif, aucune migration, aucun changement de DTO.

Au terme du mandat, après réactivation du seed sur le VPS, les filtres `?qualityAttribute=ORGANIC`, `?temperatureRequirements=Frozen`, etc., doivent retourner des résultats non-zéro, et les fiches publiques doivent afficher des badges qualité visibles.

## Branche

```
seed-demo-fix-2-quality-and-logistics
```

depuis `main` à jour.

## Règles absolues

- **Aucune modification backend** en dehors de `apps/backend/src/seed-demo/`. Pas de touche aux DTO, services, controllers, schéma Prisma.
- **Aucune modification frontend.**
- **Aucune migration Prisma.**
- **Idempotence stricte** : le seed peut être ré-exécuté N fois sans dupliquer ni régresser. Les valeurs ajoutées sont posées sur les produits existants par `update` (pas de duplication).
- **Garde-fous environnement** déjà en place dans le runner (`IOX_DEMO_SEED=1` requis). Ne rien y toucher.
- Conventional commits, atomiques.
- Aucun push, aucune PR, aucune action sur origin ni VPS. Branche locale livrée prête.

## Périmètre

### Modification de `apps/backend/src/seed-demo/dataset.ts`

Étendre le DEMO_DATASET pour que chaque produit demo (`demo-product-N`) porte des valeurs cohérentes pour :

- **FP-7 — `qualityAttributes`** : tableau de 2-4 valeurs cohérentes avec le produit (cf. mapping suggéré ci-dessous).
- **FP-8 — `temperatureRequirements`** : chaîne courte (ex. `"Cool 4-15°C, dry"`, `"Frozen ≤ -18°C"`, `"Ambient"`).
- **FP-8 — `packagingFormats`** : 1-3 formats cohérents (ex. `["100g vacuum", "500g vacuum"]`).
- **FP-8 — `grossWeight` / `netWeight`** : valeurs cohérentes en kg.
- **FP-8 — `palletization`** : description courte.
- **FP-5 — `annualProductionCapacity` + `capacityUnit`** : valeurs cohérentes.
- **FP-5 — `availableQuantity` + `availableQuantityUnit`** : valeurs cohérentes (souvent < `annualProductionCapacity`).
- **FP-5 — `restockFrequency`** : valeur libre courte (`"weekly"`, `"monthly"`, `"seasonal"`, etc.).

### Modification de `apps/backend/src/seed-demo/runner.ts`

L'upsert `prisma.marketplaceProduct.upsert` doit propager ces nouveaux champs côté `update` ET `create`. Si les champs sont déjà dans le `data` actuel, juste vérifier qu'ils sont bien lus depuis le dataset. Sinon, les ajouter.

**Important** : ne pas casser les champs déjà gérés (saisonnalité FP-1, origine fine FP-6, etc.). Garder le pattern d'upsert existant.

### Mapping suggéré par catégorie de produit

Tu dois lire le `DEMO_DATASET` actuel pour connaître les vrais noms / slugs des 8 produits. Voici un mapping suggéré par **catégorie** que tu adaptes selon ce que contient le dataset :

| Catégorie produit         | Exemple slug                    | qualityAttributes                                  | temperatureRequirements | packagingFormats                                           | restockFrequency |
| ------------------------- | ------------------------------- | -------------------------------------------------- | ----------------------- | ---------------------------------------------------------- | ---------------- |
| Vanille / épices séchées  | `demo-vanille-*`                | `[ORGANIC, FAIR_TRADE, HAND_HARVESTED]`            | `"Cool 4-15°C, dry"`    | `["100g vacuum", "500g vacuum", "carton 1kg"]`             | `"seasonal"`     |
| Poisson / fruits de mer   | `demo-thon-*`, `demo-poisson-*` | `[WILD_HARVESTED, RAW]`                            | `"Frozen ≤ -18°C"`      | `["filet 1kg vacuum", "carton 5kg vacuum"]`                | `"weekly"`       |
| Huile essentielle         | `demo-ylang-*`                  | `[HANDMADE, ARTISANAL, COLD_PRESSED, SMALL_BATCH]` | `"Cool 4-20°C, dark"`   | `["100ml flacon ambré", "500ml flacon ambré", "1L bidon"]` | `"monthly"`      |
| Fruits frais / maraîchers | `demo-mangue-*`, `demo-fruit-*` | `[ORGANIC, HAND_HARVESTED, SMALL_BATCH]`           | `"Cool 4-12°C"`         | `["plateau 5kg", "carton 10kg"]`                           | `"seasonal"`     |
| Autres / artisanat        | autre                           | `[ARTISANAL, TRADITIONAL, SMALL_BATCH]`            | `"Ambient"`             | `["unité", "carton 12 unités"]`                            | `"monthly"`      |

**Adapte selon le contenu réel du `DEMO_DATASET`**. Garde au moins 1 produit avec `ORGANIC` et au moins 1 avec `FAIR_TRADE` (pour que les filtres MP-FILTERS-1 retournent au moins quelque chose). **Au moins 1 produit avec `temperatureRequirements` contenant "Frozen"** pour valider le filtre catalog `?temperatureRequirements=Frozen`.

Pour les valeurs numériques (`grossWeight`, `netWeight`, `annualProductionCapacity`, `availableQuantity`), reste dans des ordres de grandeur réalistes et plausibles pour de la production artisanale mahoraise (capacités 100 kg à 50 tonnes/an typiquement).

### Tests

Étendre `apps/backend/src/seed-demo/seed-demo.spec.ts` :

- 1 test : après `IOX_DEMO_SEED=1` run, **chaque produit a `qualityAttributes.length >= 2`**.
- 1 test : **au moins 4 produits ont `temperatureRequirements` non null**.
- 1 test : **au moins 4 produits ont `packagingFormats.length >= 1`**.
- 1 test : **au moins 6 produits ont `annualProductionCapacity` non null**.
- 1 test idempotence : 2e run → cardinalité stable, valeurs identiques.

Cible : **+5 tests jest** (passage de 9/9 à 14/14 sur le module seed-demo).

### Documentation

- Compléter `docs/marketplace/SEED_DEMO.md` : nouvelle section "Hydratation FP-7 + FP-8 + FP-5" avec la table des produits hydratés (slug + attributs).
- `notes/seed-demo-fix-2-plan.md` : mini-plan 5-15 lignes avant code. Commit `chore(notes): plan SEED-DEMO-FIX-2`.

## Périmètre exclu

- Pas de génération d'images réelles (MediaAssets restent placeholders).
- Pas de modification du DTO `Create/UpdateMarketplaceProductDto` (le backend valide déjà ces champs depuis FP-5/FP-7/FP-8).
- Pas de modification du DTO seller frontend (les nouveaux champs sont déjà éditables via la page MP-EDIT-PRODUCT.1).
- Pas de génération de variations sellers ou de nouvelles offres.
- Pas de seed pour les certifications (déjà géré dans le seed initial).

## Méthodologie obligatoire

1. **Lire avant de coder** :
   - `apps/backend/src/seed-demo/dataset.ts` (voir la structure exacte des 8 produits demo)
   - `apps/backend/src/seed-demo/runner.ts` (voir l'upsert `marketplaceProduct` actuel)
   - `apps/backend/src/seed-demo/seed-demo.spec.ts` (pattern de test)
   - `prisma/schema.prisma` lignes du modèle `MarketplaceProduct` (vérifier le nom exact des champs FP-5/FP-7/FP-8 — TypeScript, pas SQL)
2. Mini-plan dans `notes/seed-demo-fix-2-plan.md`. Commit `chore(notes): plan SEED-DEMO-FIX-2`.
3. **Boucle courte** :
   - Étendre le dataset → typecheck → commit
   - Étendre le runner si nécessaire → typecheck → commit
   - Ajouter les tests → run jest → commit
   - Doc → commit
4. **Vérification disque** avant chaque commit (`ls`, `cat`).
5. **Run idempotence local** si la dev DB est dispo : `IOX_DEMO_SEED=1 pnpm --filter @iox/backend seed:demo` deux fois consécutives. La 2e doit logger "0 new" pour les produits (uniquement updates).

## Critères de succès

- Branche `seed-demo-fix-2-quality-and-logistics` locale, verte.
- Backend Jest : nouveau total ≥ 469 (= 464 baseline + 5 nouveaux SEED-DEMO).
- `tsc --noEmit` clean back + front.
- Aucune modification hors `apps/backend/src/seed-demo/`, `docs/marketplace/SEED_DEMO.md`, `notes/`.
- Working tree clean.
- main reste à `0c2a385` ou plus récent, intact.
- Aucun push, aucune PR.

## Validation post-merge sur le VPS (à faire par l'utilisateur, pas dans ce mandat)

Une fois la branche poussée + mergée + redéployée + seed réactivé via SSH :

```bash
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend sh -c 'IOX_DEMO_SEED=1 pnpm db:seed:demo'"
```

Validations attendues :

```bash
# Filtres FP-7 retournent enfin des résultats
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?qualityAttribute=ORGANIC" | jq '.data.meta.total // .data.total'
# Attendu : ≥ 1

curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?qualityAttribute=FAIR_TRADE" | jq '.data.meta.total // .data.total'
# Attendu : ≥ 1

# Filtre température FP-8
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?temperatureRequirements=Frozen" | jq '.data.meta.total // .data.total'
# Attendu : ≥ 1

# Une fiche publique a des champs FP-5, FP-7, FP-8 renseignés
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?limit=1" \
  | jq -r '.data.data[0].productSlug // .data[0].productSlug' \
  | xargs -I{} curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog/products/{}" \
  | jq '.data | {qualityAttributes, temperatureRequirements, packagingFormats, annualProductionCapacity, restockFrequency}'
# Attendu : aucune valeur null
```

À noter dans le handoff comme TODO post-merge.

## Gestion des blocages

- **Champ inconnu dans `dataset.ts`** : vérifier le schéma Prisma pour le nom exact (camelCase TS vs snake_case SQL). Si différence, suivre Prisma client.
- **Type d'enum non importé dans `dataset.ts`** : importer depuis `@prisma/client` (`ProductQualityAttribute`).
- **Tests qui échouent** : vérifier que le mock Prisma est bien configuré (les tests existants du module utilisent un mock complet, suivre le pattern).
- **Idempotence cassée** : si la 2e exécution crée des doublons, c'est un bug du runner — investiguer et corriger.
- **Blocage majeur** : revert sur la branche, documenter dans handoff, rendre la main.

## Preuves finales obligatoires (anti-hallucination)

**Avant de rendre la synthèse**, exécute et recopie textuellement l'output des 5 commandes ci-dessous.

```bash
# 1. Branche + commits
git rev-parse --abbrev-ref HEAD
git log --oneline main..HEAD

# 2. Diff dataset.ts (pour confirmer l'hydratation)
git diff main..HEAD -- apps/backend/src/seed-demo/dataset.ts | head -150

# 3. Tests jest seed-demo verts (cible 14/14)
cd apps/backend && timeout 60 ./node_modules/.bin/jest src/seed-demo --silent --reporters=default 2>&1 | tail -10 ; cd ../..

# 4. Santé tsc
cd apps/backend && timeout 35 ./node_modules/.bin/tsc --noEmit 2>&1 | tail -3 ; cd ../..

# 5. Run réel local idempotence si dev DB dispo (sinon afficher l'erreur brute)
NODE_ENV=development IOX_DEMO_SEED=1 pnpm --filter @iox/backend run seed:demo 2>&1 | tail -15 || echo "DB locale absente — idempotence non testée localement"
```

**Rejet de la synthèse** : si l'un de ces 5 outputs n'est pas dans ton rapport final avec son **vrai contenu**, le mandat est considéré comme **non livré**.

## Format du handoff

`notes/handoff-<date>-seed-demo-fix-2.md` doit contenir :

- **État de la branche** : nom, nombre de commits, hash du dernier.
- **Les 5 outputs bruts de preuves** (recopiés textuellement).
- **Tableau d'hydratation** : pour chaque produit demo, les valeurs ajoutées (qualityAttributes, temperatureRequirements, packagingFormats, etc.).
- **Décisions notables** (mapping choisi, edge cases résolus).
- **TODO post-merge** : la liste des 4 curl de validation à exécuter par l'utilisateur après push + merge + deploy + activation seed.
- **Plan de push proposé** : `git push -u origin seed-demo-fix-2-quality-and-logistics && gh pr create ...`

## Rappel final

- **Aucune modification hors seed-demo, doc et notes.**
- **Idempotence stricte.**
- **Vérifie sur disque** avant chaque commit.
- **Recopie l'output réel** des 5 preuves.
- En cas de doute, rapporte le brut.
