# Prompt Claude Code — Push + PR + merge SEED-DEMO + déploiement + activation seed

> **Usage** : à coller tel quel dans Claude Code après livraison locale propre du mandat 06 (SEED-DEMO).
> **Pré-requis (à vérifier en premier, stop si non remplis)** :
>
> - être sur la machine où le repo IOX est cloné, au chemin `/Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox`
> - working tree clean (`git status` n'affiche que `docs-projet/` en untracked)
> - branche `seed-demo-marketplace-fixtures` locale, à 5 commits au-dessus de `main` (`3c00c6f`)
> - `gh` CLI installé et authentifié (`gh auth status` → "Logged in to github.com")
> - SSH vers `rahiss-vps` configuré (testable via `ssh -o BatchMode=yes -o ConnectTimeout=5 rahiss-vps true`)

---

## ⚠️ Garde-fou anti-hallucination

À la fin du mandat, **avant de rendre la synthèse**, tu DOIS exécuter et **recopier textuellement l'output** des 8 commandes de preuve listées en section "Preuves finales obligatoires". Toute synthèse rendue **sans ces 8 outputs réels** est invalide. Si tu ne peux pas exécuter l'une d'elles, rapporte l'erreur brute au lieu d'inventer un succès.

---

## Contexte canonique IOX (rappel concis)

IOX = "Indian Ocean Xchange". Plateforme B2B marketplace + socle MCH. Stack : monorepo pnpm + Turbo, NestJS + Prisma + PostgreSQL, Next.js (App Router). Déploiement manuel via `./deploy/vps/deploy.sh all` (rsync + docker build + restart + healthchecks).

État avant ce mandat :

- `main` = `3c00c6f` (origin/main aligné), 6 lots marketplace mergés (FP-3, FP-4, FP-2.1, FP-3.1, FP-6, MP-S-INDEX)
- VPS `iox.mycloud.yt` aligné avec `3c00c6f`, base **vide** (`total: 0` sur catalog et sellers)
- Branche locale `seed-demo-marketplace-fixtures` (5 commits) prête, jamais poussée
- Tests backend 458 → 464 (+6) avec le SEED-DEMO inclus

## Mandat

Pousser `seed-demo-marketplace-fixtures`, créer la PR, attendre la CI verte, merger en squash, redéployer le VPS, **activer le seed sur la pré-prod** via SSH + docker, valider que la marketplace est désormais peuplée (catalog + sellers), relancer le smoke authentifié avec le compte smoke-seller créé par le seed.

## Règles absolues

- Pas de force-push.
- Pas de bypass CI (`--no-verify`, admin merge non.) — si CI rouge, analyser, corriger, repush.
- Pas de modification du code applicatif ou du seed pendant ce mandat (sauf hotfix CI strictement nécessaire).
- L'activation du seed sur le VPS (`IOX_DEMO_SEED=1`) doit avoir lieu **uniquement après que le déploiement complet ait réussi** et que les containers tournent (healthchecks OK). Pas avant.
- Si l'activation du seed échoue, **ne pas tenter de cleanup** sans en référer — laisser l'état tel quel et rapporter brut.
- Conventional commits si jamais un hotfix est nécessaire.

## Plan d'exécution

### Étape 1 — Pré-requis et santé locale

```bash
git status                                            # working tree clean attendu
git branch --show-current                             # seed-demo-marketplace-fixtures attendu
git log --oneline main..HEAD                          # 5 commits attendus
git log -1 main --oneline                             # 3c00c6f attendu

# Validation locale — CI réplique
pnpm install --frozen-lockfile
pnpm --filter @iox/backend exec tsc --noEmit
pnpm --filter @iox/backend test

# Vérifier SSH au VPS (sans rien faire dessus)
ssh -o BatchMode=yes -o ConnectTimeout=5 rahiss-vps "echo SSH_OK"
```

Si quelque chose échoue ici, stop, analyser, corriger.

### Étape 2 — Push + PR #9

```bash
git push -u origin seed-demo-marketplace-fixtures

gh pr create --base main --head seed-demo-marketplace-fixtures \
  --title "feat: SEED-DEMO marketplace fixtures (idempotent, flag-gated)" \
  --body "$(cat <<'EOF'
## SEED-DEMO — Fixtures idempotentes pour pré-prod

Permet de peupler la base d'un environnement de démo avec un dataset cohérent : 4 sellers \`APPROVED\`, 8 produits \`PUBLISHED\` (avec FP-1 saisonnalité + FP-6 origine fine), 8 offres \`APPROVED\`, 6 certifications structurées \`VERIFIED\`, 1 compte smoke-seller pour les tests authentifiés.

### Garde-fous

- \`IOX_DEMO_SEED \!= '1'\` → no-op silencieux, aucune écriture.
- \`NODE_ENV=production\` ET \`IOX_DEMO_SEED \!= '1'\` → **throw** avec message clair (double opt-in obligatoire).
- Tous les enregistrements démo sont préfixés \`demo-\` (slugs, codes) pour permettre un cleanup ciblé.

### Idempotence

- 8 entités sur 9 utilisent \`upsert\` sur clés naturelles uniques.
- L'unique exception (\`MarketplaceOffer.create\`, faute de contrainte unique en schema) est gardée par un \`findFirst\` sur \`(marketplaceProductId, title)\` puis \`update\` ou \`create\`.
- Test Jest dédié \`idempotence : 2ᵉ run avec offres déjà présentes → aucun create offer (uniquement update)\`.

### Tests

- Backend Jest : 458 → 464 (+6 tests).
- Couverture : 3 garde-fous (NODE_ENV/flag), idempotence offres, smoke-seller bcrypt + override env.

### Périmètre

- Aucune migration Prisma, aucun changement schema.
- Aucune modification de \`prisma/seed.ts\` existant.
- Nouveau script CLI \`prisma/seed-demo.ts\` qui délègue à \`apps/backend/src/seed-demo/runner.ts\`.

### Activation post-merge sur pré-prod

\`\`\`bash
# Sur le VPS, dans le container backend
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend sh -c 'IOX_DEMO_SEED=1 pnpm db:seed:demo'"
\`\`\`

### Smoke seller

- Email : \`smoke-seller@iox.mch\`
- Password : \`IoxSmoke2026\!\` (override possible via env \`SMOKE_SELLER_PASSWORD\`)
- Rôle : \`MARKETPLACE_SELLER\`, lié au premier seller demo via membership.

### Documentation

- Runbook complet : \`docs/marketplace/SEED_DEMO.md\`
- Handoff de livraison : \`notes/handoff-2026-04-26-seed-demo.md\`
EOF
)"
```

### Étape 3 — Attendre CI verte

```bash
# Surveiller les checks (patience, ~5-12 min)
gh pr checks --watch
```

Si CI rouge : analyser via `gh run view`, corriger sur la branche, repush. Pas de bypass.

### Étape 4 — Merge squash + sync main local

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull --ff-only origin main
git log --oneline -3 main                             # le squash SEED-DEMO doit être en tête
```

### Étape 5 — Déploiement VPS

```bash
./deploy/vps/deploy.sh all
```

Attendu : output complet avec rsync, build images, restart containers, et finalement `✅ Déploiement OK`. Si erreur dans cette étape, **stop** — ne pas activer le seed sur un déploiement échoué.

### Étape 6 — Activation du seed sur le VPS

**Important** : cette étape ne s'exécute qu'après que l'étape 5 ait affiché `✅ Déploiement OK` ET que les healthchecks soient passés.

```bash
# Activation du seed dans le container backend du VPS
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T backend sh -c 'IOX_DEMO_SEED=1 pnpm db:seed:demo'"
```

Attendu : log de fin du type

```
✅ Demo seed done — sellers: 4, products: 8, offers: 8, certifications: 6, smokeSeller: smoke-seller@iox.mch
```

Si tu vois `Demo seed skipped` → le flag n'a pas été propagé, retenter avec `env` explicite si nécessaire. Si throw → analyser le message, ne pas insister.

### Étape 7 — Vérifications post-activation (curl publics)

```bash
# 1. Catalog public — total doit être passé de 0 à 8
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?limit=24" | head -800

# 2. Annuaire sellers — total doit être passé de 0 à 4
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog/sellers?limit=10" | head -400

# 3. Page publique sellers — devrait retourner 200
curl -s -o /dev/null -w "%{http_code}\n" https://iox.mycloud.yt/marketplace/sellers
```

Si les totaux sont toujours à `0`, **stop** et rapporter — soit l'activation a échoué silencieusement, soit la base ciblée par le seed n'est pas la même que celle servie par l'API.

### Étape 8 — Smoke authentifié avec le compte smoke-seller

```bash
BASE_URL=https://iox.mycloud.yt \
SMOKE_EMAIL=smoke-seller@iox.mch \
SMOKE_PASSWORD='IoxSmoke2026!' \
./scripts/smoke-authenticated.sh 2>&1 | tail -40
```

Attendu cette fois :

- ✔ login OK avec rôle `MARKETPLACE_SELLER` (au lieu d'un compte ADMIN)
- ✔ FP-6 schéma `/marketplace/products` (plus de skip — il y a maintenant 8 produits avec coords GPS)
- ✔ FP-6 fiche publique (un slug est dispo dans le catalog)
- éventuellement quelques routes admin en 403 (normal, le smoke-seller n'est pas admin) — c'est OK

Note : si le smoke a été conçu pour un compte ADMIN et certains checks `call_required` pour rôles admin échouent en 403, c'est attendu et non bloquant pour ce mandat. Documenter ces écarts dans le rapport mais ne pas les traiter comme des fails.

### Étape 9 — Cleanup local

```bash
git branch -d seed-demo-marketplace-fixtures           # déjà supprimée côté origin par --delete-branch
git remote prune origin
```

## Critères de succès

- PR #9 mergée sur main, avec CI verte.
- Déploiement VPS terminé avec healthchecks OK.
- Activation du seed terminée avec log `✅ Demo seed done — sellers: 4, products: 8, offers: 8, certifications: 6`.
- Catalog public retourne `total: 8` (au lieu de 0).
- Annuaire sellers retourne `total: 4` (au lieu de 0).
- Smoke authentifié avec smoke-seller : login OK, FP-6 schéma checks passent à ✔ (plus de skip).
- Working tree clean en fin sur main.

## Gestion des blocages

- **CI rouge** : analyser `gh pr checks` + `gh run view`, corriger sur la branche, repush. Pas de bypass.
- **Conflit lors du `git pull --ff-only` post-merge** : ne devrait pas arriver puisque main n'a pas bougé. Si oui, stop et rapporter.
- **Échec `deploy.sh all`** : récupérer le log complet, rollback possible via `./deploy/vps/rollback.sh all`. Stop avant l'activation seed.
- **Échec d'activation du seed** : récupérer le log brut. Possibles causes :
  - Container backend pas démarré → `docker compose -f docker-compose.vps.yml ps`
  - DB unreachable → `curl https://iox.mycloud.yt/api/v1/health`
  - Migration FP-6 pas appliquée → vérifier dans le container `prisma migrate status`
    Ne pas tenter de cleanup automatique. Rapporter et rendre la main.
- **Smoke retourne des 4xx attendues** (smoke-seller pas admin) : documenter dans le rapport sans traiter comme fails.

## Preuves finales obligatoires (anti-hallucination)

**Avant de rendre la synthèse**, exécute et recopie textuellement l'output **complet** des 8 commandes ci-dessous. Si tu ne peux pas exécuter l'une d'elles (env manquant, timeout, etc.), rapporte l'erreur brute.

```bash
# 1. État local après merge
git log --oneline -3 main
git rev-parse main

# 2. Confirmation merge côté GitHub
gh pr view 9 --json number,title,mergedAt,mergedBy 2>&1 | head -20

# 3. Healthchecks VPS post-deploy
curl -s https://iox.mycloud.yt/api/v1/health | head -200

# 4. Seed activé sur le VPS — output réel de la commande de l'étape 6
# (récupéré quand tu l'as lancée — recopie-le textuellement, ne re-exécute pas)

# 5. Catalog public total = 8
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog?limit=24" | jq '.data.meta.total // .data.total // "no jq"'

# 6. Annuaire sellers total = 4
curl -s "https://iox.mycloud.yt/api/v1/marketplace/catalog/sellers?limit=10" | jq '.data.meta.total // "no jq"'

# 7. Page publique sellers = 200
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://iox.mycloud.yt/marketplace/sellers

# 8. Smoke authentifié résultat — derniers 30 lignes
# (tirées du run de l'étape 8 — recopie-les textuellement)
```

**Rejet de la synthèse** : si l'un de ces 8 outputs n'est pas dans ton rapport final avec son **vrai contenu** (pas une description, pas une simulation), le mandat est considéré comme **non livré**.

## Format du handoff

`notes/handoff-<date>-seed-demo-deployed.md` doit contenir :

- **État final main** : nouveau hash post-squash, lien PR #9.
- **Résultat déploiement VPS** : timestamp, healthchecks confirmés.
- **Résultat activation seed** : log complet de la commande SSH + `IOX_DEMO_SEED=1 pnpm db:seed:demo`.
- **Validations post-activation** : les 3 curl avec leur output réel.
- **Smoke authentifié smoke-seller** : compteurs ✔/✗/⊝ + écarts documentés (403 sur routes admin = attendu).
- **Branches** : confirmation `seed-demo-marketplace-fixtures` supprimée local + remote.
- **Working tree** : clean confirmé.

## Rappel final

- **Aucune action sur la prod réelle** — uniquement sur la pré-prod `iox.mycloud.yt`.
- **Vérifie sur disque/serveur** avant chaque étape critique.
- **Recopie l'output réel** des 8 preuves en fin de mandat — pas de description, pas d'invention.
- En cas de doute ou d'échec, rapporte le brut. La transparence vaut mieux qu'une synthèse satisfaisante mais fausse.
