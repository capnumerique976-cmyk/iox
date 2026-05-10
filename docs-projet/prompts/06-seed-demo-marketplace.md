# Prompt Claude Code — SEED-DEMO marketplace (durci anti-hallucination)

> **Usage** : à coller tel quel dans Claude Code après l'incident d'hallucination du mandat précédent. Lot court (~1.5 jour). Aucun push, aucun merge.
> **Pré-requis** :
>
> - être sur la machine où le repo IOX est cloné, au chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - working tree clean
> - branche courante : `main` à `3c00c6f` (MP-S-INDEX) ou plus récent
> - `gh` installé mais **non utilisé dans ce mandat**

---

## ⚠️ Garde-fou anti-hallucination — LIRE EN PREMIER

Le mandat SEED-DEMO précédent a été **rapporté comme exécuté** alors qu'**aucun fichier n'a été créé, aucun commit n'a été fait**. Ce mandat est durci pour empêcher la répétition.

**Règle absolue** : à la fin du mandat, avant de rendre la synthèse, tu DOIS exécuter et **recopier textuellement l'output** des 5 commandes de preuve listées en section "Preuves finales obligatoires" (en bas de ce prompt). Toute synthèse rendue **sans ces 5 outputs réels** est invalide. Si tu ne peux pas les exécuter, tu rapportes l'échec brut au lieu d'inventer.

---

## Contexte canonique IOX (rappel)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL.

État actuel sur main (`3c00c6f`) : 6 lots marketplace livrés (FP-3, FP-4, FP-2.1, FP-3.1, FP-6, MP-S-INDEX). Pré-prod tourne mais **base totalement vide** :

- `GET /api/v1/marketplace/catalog?limit=5` → `data: []`, `total: 0`
- `GET /api/v1/marketplace/catalog/sellers?limit=5` → `data: []`, `total: 0`

**Conséquence** : la marketplace est techniquement fonctionnelle mais visuellement vide. Impossible de démontrer FP-1 / FP-2 / FP-2.1 / FP-3.1 / FP-6 en black-box sans contenu.

## Objectif

Livrer un script de seed démo **idempotent**, **désactivé en production**, **commandable via flag env**, qui peuple la base avec :

- 4 sellers de démo (status `APPROVED`), avec logo + bannière + descriptions complètes
- 8 produits marketplace (status `PUBLISHED`), avec saisonnalité, origine fine FP-6, certifs vérifiées
- 8 offres marketplace (1 par produit, status `APPROVED`)
- Quelques certifications structurées vérifiées (FP-2)
- Un compte de test seller dédié au smoke (`smoke-seller@iox.mch`)

Tous les enregistrements démo sont préfixés `demo-` (slugs, codes) pour permettre un nettoyage ciblé.

## Branche

```
seed-demo-marketplace-fixtures
```

depuis `main` à jour.

## Règles absolues

- Aucune migration Prisma. Aucun changement schéma. Aucune modification de `prisma/seed.ts` existant.
- Aucun appel `gh`, aucun push, aucun merge.
- **Idempotence stricte** : le script peut être lancé 10 fois de suite sans dupliquer.
- **Garde-fou production** : si `NODE_ENV === 'production'` ET `IOX_DEMO_SEED !== '1'`, le script throw immédiatement avec un message clair et **n'écrit rien**.
- **Garde-fou flag** : le script ne tourne que si `IOX_DEMO_SEED === '1'`. Sinon, no-op + log.
- Aucune dépendance npm/pnpm ajoutée sans justification.
- Conventional commits, atomiques par sous-étape.

## Périmètre

### A. Script `prisma/seed-demo.ts`

Contenu fonctionnel attendu :

- Vérification env : si `NODE_ENV === 'production' && IOX_DEMO_SEED !== '1'` → throw `'Demo seed disabled in production. Set IOX_DEMO_SEED=1 to override.'`.
- Si `IOX_DEMO_SEED !== '1'` → log `'Demo seed skipped (set IOX_DEMO_SEED=1 to enable).'` puis exit 0 sans écrire.
- Création/mise-à-jour idempotente via `prisma.<entity>.upsert(...)` sur clés naturelles préfixées `demo-` :
  - **4 Companies** + 4 Users (rôles `MARKETPLACE_SELLER`, mot de passe bcrypt fixe lisible en doc)
  - **4 SellerProfiles** liés à ces Companies, slugs `demo-seller-1` à `demo-seller-4`, status `APPROVED`, `approvedAt` fixé, `publicDisplayName`, `descriptionShort`, `descriptionLong`, `country`, `region`, `cityOrZone`, `supportedIncoterms`, `destinationsServed`, `averageLeadTimeDays`, `isFeatured: true` sur 1 ou 2.
  - **8 Products** (entité métier MCH) + **8 MarketplaceProducts** liés, slugs `demo-product-1` à `demo-product-8`, status `PUBLISHED`, avec FP-1 (saisonnalité non-vide), FP-6 (originLocality + altitudeMeters + gpsLat + gpsLng cohérents pour Mayotte/Madagascar), descriptions, packagingDescription, defaultUnit, minimumOrderQuantity.
  - **8 MarketplaceOffers**, 1 par produit, status `APPROVED`, `priceMode` mixte (FIXED, QUOTE_ONLY, FROM_PRICE), avec `unitPrice`, `currency=EUR`, `moq`, `availableQuantity`, `leadTimeDays`, `incoterm`, `destinationMarketsJson`, `visibilityScope=PUBLIC`.
  - **6 Certifications** structurées sur des `SellerProfile` ou `MarketplaceProduct`, types variés (BIO_EU, ECOCERT, FAIRTRADE, ISO_22000), `verificationStatus=VERIFIED`, `validUntil` futur, `code` et `issuingBody` cohérents.
  - **1 User smoke-seller** : email `smoke-seller@iox.mch`, password bcrypt (lu via env `SMOKE_SELLER_PASSWORD` ou par défaut `IoxSmoke2026!`), rôle `MARKETPLACE_SELLER`, lié au premier seller demo via `UserCompanyMembership`. Documenter ce mot de passe dans `docs/marketplace/SEED_DEMO.md`.
- En fin d'exécution : log structuré du delta `upserted X new sellers, Y new products, Z new offers, W new certifications` (basé sur `update.count` ou comparaison pré/post).

### B. Entrée `package.json` du backend

Ajouter dans `apps/backend/package.json` (scripts) :

```json
"seed:demo": "tsx ../../prisma/seed-demo.ts"
```

(adapter le chemin selon la convention du repo — vérifier comment `seed.ts` est invoqué actuellement). Aucune autre modification de `package.json`.

### C. Tests `prisma/seed-demo.spec.ts` (5 tests minimum)

Avec mock Prisma :

1. `IOX_DEMO_SEED` absent + `NODE_ENV=development` → no-op, aucun appel Prisma.
2. `NODE_ENV=production` + `IOX_DEMO_SEED` absent → throw avec le bon message.
3. `NODE_ENV=production` + `IOX_DEMO_SEED=1` → exécute (override autorisé).
4. `IOX_DEMO_SEED=1` + appel 1 → upserts effectués.
5. `IOX_DEMO_SEED=1` + appel 2 (idempotence) → aucun **create** sur les entités existantes (uniquement des `upsert` qui résolvent en update).

### D. Documentation `docs/marketplace/SEED_DEMO.md`

- Objectif et limites (pré-prod uniquement, fixtures publiques).
- Liste des entités créées avec leur préfixe `demo-`.
- Identifiants du compte smoke-seller (email + password par défaut + override env).
- Commande activation : `IOX_DEMO_SEED=1 pnpm --filter backend seed:demo`
- Commande désactivation : `pnpm --filter backend seed:demo` (sans flag) ou cleanup ciblé via SQL `DELETE FROM ... WHERE slug LIKE 'demo-%'`.
- Mention explicite : **NE PAS** activer en prod réelle (`prisma migrate reset` côté pré-prod uniquement).

### E. Notes

- `notes/seed-demo-plan.md` (mini-plan 5-10 lignes avant code).
- `notes/handoff-<date>-seed-demo.md` (handoff final avec preuves).

## Périmètre exclu

- Pas de seed production (juste démo).
- Pas de modification de `prisma/seed.ts`.
- Pas de migration ni de modification du schéma.
- Pas de UI admin pour piloter le seed.
- Pas de couverture E2E (les tests Vitest unitaires suffisent).

## Méthodologie obligatoire

1. **Lire avant de coder** :
   - `prisma/seed.ts` (pour comprendre le pattern existant et ne pas le casser)
   - `apps/backend/package.json` (scripts)
   - `prisma/schema.prisma` lignes 886-1356 (entités marketplace)
   - 1 ou 2 service.spec.ts pour le pattern de test Prisma mock
2. Mini-plan dans `notes/seed-demo-plan.md`. Commit `chore(notes): plan seed-demo`.
3. **Boucle courte** : créer le fichier → vérifier qu'il est sur disque (`ls -la prisma/seed-demo.ts`) → commit. Ne JAMAIS rendre une étape comme finie sans vérification disque.
4. Lancer la santé après chaque sous-étape : `pnpm --filter @iox/backend exec tsc --noEmit && pnpm --filter @iox/backend test`.
5. Tester l'idempotence localement si une base est dispo : `IOX_DEMO_SEED=1 pnpm --filter @iox/backend seed:demo` deux fois consécutives (la 2e doit logger "0 new").

## Preuves finales obligatoires (anti-hallucination)

**Avant de rendre la synthèse, exécute et recopie textuellement l'output COMPLET de ces 5 commandes**. Si tu ne peux pas les exécuter (env manquant, etc.), rapporte l'erreur brute au lieu d'inventer un succès.

```bash
# 1. Confirmer la branche et les commits réels
git rev-parse --abbrev-ref HEAD
git log --oneline main..HEAD

# 2. Confirmer l'existence des fichiers créés
ls -la prisma/seed-demo.ts \
       prisma/seed-demo.spec.ts \
       docs/marketplace/SEED_DEMO.md \
       notes/seed-demo-plan.md \
       notes/handoff-*-seed-demo.md 2>&1

# 3. Confirmer l'entrée package.json
grep -A 1 '"seed:demo"' apps/backend/package.json

# 4. Confirmer les tests verts
cd apps/backend && pnpm exec jest seed-demo.spec --silent 2>&1 | tail -10
cd ../..

# 5. Confirmer l'idempotence (nécessite une DB locale, sinon afficher l'erreur)
NODE_ENV=development pnpm --filter @iox/backend run seed:demo 2>&1 | tail -10 || echo "DB locale absente — idempotence non testée"
```

**Rejet de la synthèse** : si l'un de ces 5 outputs n'est pas dans ton rapport final avec son **vrai contenu** (pas une description, pas une simulation), le mandat est considéré comme **non livré** et tu dois recommencer ou rapporter le blocage réel.

## Critères de succès

- Branche `seed-demo-marketplace-fixtures` locale, verte, ≥ 4 commits atomiques.
- 5 fichiers créés et **vérifiables sur disque** (les 5 lignes de la commande 2 ci-dessus).
- 5 tests Jest passants (commande 4).
- Idempotence vérifiée (commande 5) ou échec rapporté brut.
- Working tree clean (en dehors des 5 fichiers commités).
- main reste à `3c00c6f`, intact.
- Aucun push, aucune PR, aucune action sur origin.

## Format du handoff

`notes/handoff-<date>-seed-demo.md` doit contenir :

- État de la branche : nom + nombre de commits + hash du dernier.
- **L'output brut des 5 commandes de preuve** (recopié textuellement).
- Liste des fichiers créés.
- Identifiants du compte smoke-seller (email + password).
- Commande activation pré-prod : `IOX_DEMO_SEED=1 pnpm --filter @iox/backend seed:demo`.
- Commande nettoyage : suppression manuelle des slugs `demo-%` ou `prisma migrate reset` (réservé environnement non-prod).
- TODO post-merge : push + PR + redeploy + lancer le seed activé sur le VPS + relancer smoke-authenticated pour confirmer que les FP-1/2/2.1/3.1/6 sont maintenant validables (plus de skips dataset vide).

## Rappel final

- **Vérifie sur disque** avant chaque commit (`ls`, `cat`).
- **Recopie l'output réel** des 5 preuves en fin de mandat — pas de description, pas d'invention.
- En cas de doute ou d'échec, rapporte le brut. La transparence vaut mieux qu'une synthèse satisfaisante mais fausse.
