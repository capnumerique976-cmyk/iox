# IOX — Déploiement VPS (procédure réelle)

> Dernière mise à jour : 2026-04-24.
>
> Ce document décrit la procédure **effectivement utilisée** pour
> déployer IOX sur `rahiss-vps`. Il complète (sans remplacer) le
> runbook idéal `deploy/preprod/RUNBOOK.md` qui décrit une cible
> registry+CI non encore implémentée.
>
> L'audit complet du flux réel est dans
> `docs/deploy/VPS-DEPLOY-AUDIT.md`.

## Principes

- **Code source** : rsync direct depuis le poste opérateur vers
  `/opt/apps/iox/` sur le VPS. Pas de git, pas de registry d'images.
- **Images Docker** : buildées on-host (`iox-frontend:local`,
  `iox-backend:local`) via `docker compose build`.
- **Base de données** : container `postgres:15-alpine` persistant,
  migrations Prisma appliquées au boot via l'entrypoint backend.
- **Reverse proxy** : nginx hôte (pas conteneurisé), termine TLS via
  Let's Encrypt.
- **Rollback** : tag `:prev` posé juste avant chaque build ; restauré
  via `deploy/vps/rollback.sh`.

## Pré-requis

Une seule fois :

- SSH par clé vers le VPS (user `deploy`).
- `~/.ssh/config` configuré avec alias `rahiss-vps` → IP publique.
- Sur le VPS : Docker ≥ 24, Compose v2, nginx, Let's Encrypt, 3 GB
  libres minimum.
- Fichier `/opt/apps/iox/.env` peuplé avec les secrets (jamais
  dans le repo).
- Fichier `/opt/apps/iox/docker-compose.vps.yml` présent (VPS-only —
  cf. limitations ci-dessous).

## Procédure standard — déploiement frontend

```bash
# depuis le repo local (macOS/Linux)
./deploy/vps/deploy.sh frontend
```

Le script fait, dans l'ordre :

1. Vérifie SSH et espace disque distant.
2. `rsync -av --delete` avec excludes (voir `deploy/vps/README.md`).
3. Tag l'image courante en `:prev` (rollback en 5 s).
4. `docker compose build frontend`.
5. `docker compose up -d --no-deps frontend`.
6. Healthchecks sur `https://iox.mycloud.yt/`, `/login` et
   `/api/v1/health`.

Durée typique : 2–4 min (build frontend domine).

## Déploiement backend (plus sensible)

Impact possible sur la DB (migrations appliquées au boot). À ne faire
que si nécessaire et après revue.

```bash
./deploy/vps/deploy.sh backend
```

Points d'attention :

- Si le backend modifie le schéma, `prisma migrate deploy` tournera au
  boot. Les migrations sont versionnées dans `prisma/migrations/` et
  testées en local avant rsync.
- Un rollback backend ne rollback PAS la migration DB : toute
  migration destructive doit être introduite via une migration
  non-destructive (add column nullable, deprecate-then-drop).
- Voir `docs/ops/ROLLBACK.md` pour la stratégie détaillée.

## Rollback

```bash
./deploy/vps/rollback.sh frontend     # ou backend, ou all
```

Restaure l'image `:prev` comme `:local` et recrée le container. Pas
de restart du reste de la stack.

Limitation : le rollback ne restaure pas le code source (celui-ci a
déjà été écrasé par le rsync). Pour rollback complet, il faut un
backup du répertoire applicatif effectué avant le déploiement (TODO
dans `deploy.sh` : option `--snapshot-source`).

## Flow de validation recommandé

Avant `./deploy/vps/deploy.sh` :

```bash
# local
cd apps/backend && npx tsc --noEmit && npx jest && cd -
cd apps/frontend && npx tsc --noEmit && npx vitest run && cd -
node scripts/validate-ops-configs.mjs
APP_ENV=staging NODE_ENV=production node scripts/preflight.mjs
```

Si l'un échoue, ne pas déployer.

Après `./deploy/vps/deploy.sh` :

```bash
# poste opérateur
curl -skfI https://iox.mycloud.yt/ | head -3
curl -skf  https://iox.mycloud.yt/api/v1/health
# smoke-test manuel : login admin → dashboard OK
```

## Limitations connues

### 1. `docker-compose.vps.yml` non versionné

Le fichier compose utilisé en prod est **sur le VPS uniquement**. Le
repo contient `deploy/preprod/docker-compose.preprod.yml` (un template
similaire mais pas identique).

Raison : les deltas entre VPS et préprod (noms de containers, volumes
persistants déjà créés avec des noms spécifiques, réseaux, port
bindings) ne sont pas encore homogénéisés. Corriger cela demande une
fenêtre de maintenance (renommage de volume = migration manuelle).

Mitigation : `deploy/vps/README.md` documente cette divergence
explicitement et `rsync` ne touche jamais le fichier
`docker-compose.vps.yml` (exclude strict).

### 2. Pas de CI/CD automatique

Tout passe par SSH depuis le poste de l'opérateur. Pour industrialiser :
voir `VPS-DEPLOY-AUDIT.md §4`.

### 3. Une seule génération de rollback

Seul `:prev` est conservé. Pour rollback n-2, il faudrait tagger
`:prev-1` avant chaque nouveau tag `:prev` — à envisager si la
fréquence de déploiement augmente.

### 4. Migrations Prisma au boot

Les migrations tournent dans l'entrypoint backend. Pour éviter qu'une
migration lourde bloque le démarrage et fasse crash-loop le container,
positionner `SKIP_MIGRATIONS=1` dans `.env`, appliquer la migration
manuellement (`pnpm db:migrate:deploy` depuis un container one-shot),
puis retirer `SKIP_MIGRATIONS`.

## Checklist de déploiement (à cocher)

- [ ] Tous les tests locaux verts (backend + frontend).
- [ ] `node scripts/validate-ops-configs.mjs` OK.
- [ ] `preflight.mjs` OK avec l'env staging.
- [ ] Backup Postgres < 24h existant (`ls
      /opt/apps/iox/backups/postgres/`).
- [ ] Fenêtre de déploiement communiquée (si changements visibles).
- [ ] Rollback path confirmé (tag `:prev` présent) —
      `ssh rahiss-vps 'docker images | grep :prev'`.

Après déploiement :

- [ ] Healthchecks automatiques OK (le script exit 0).
- [ ] Smoke-test login admin OK.
- [ ] Aucune 5xx dans les logs backend : `ssh rahiss-vps
      'docker logs iox_backend --tail 100 | grep -c " 5[0-9][0-9] "'`
      → 0.
- [ ] Noter le tag de version / commit SHA équivalent
      (le flux actuel n'a pas de version — recommandation :
      `date -u +%Y%m%dT%H%M%SZ` comme label).

## Références croisées

- `docs/deploy/VPS-DEPLOY-AUDIT.md` — audit complet de l'existant.
- `docs/ops/BACKUP.md` — stratégie de sauvegarde.
- `docs/ops/ROLLBACK.md` — rollback applicatif et DB.
- `docs/ops/PRE-DEPLOY.md` — checks à froid avant bascule.
- `docs/GO-LIVE-CHECKLIST.md` — checklist exécutive imprimable.
- `deploy/preprod/RUNBOOK.md` — procédure idéale (registry + CI)
  non encore déployée, référence long terme.
