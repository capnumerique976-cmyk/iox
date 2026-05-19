# IOX — Déploiement VPS

Scripts codifiant le flux **réel** de déploiement IOX.

## Démarrage rapide (premier déploiement)

```bash
# Prérequis : accès SSH configuré dans ~/.ssh/config
export IOX_VPS_HOST=rahiss-vps
export IOX_VPS_DOMAIN=iox.mycloud.yt
./deploy/vps/setup-first-run.sh
```

Ce script unique installe Docker, build les images, démarre la stack,
crée le bucket MinIO, applique les migrations, et configure Nginx + SSL.

## Contenu

| Fichier                       | Rôle                                                              |
| ----------------------------- | ----------------------------------------------------------------- |
| `setup-first-run.sh`          | **PREMIER DÉPLOIEMENT** — VPS vierge → pilote opérationnel        |
| `docker-compose.pilot.yml`    | Stack complète self-contained (postgres, redis, minio, app)       |
| `.env.example`                | Template variables d'environnement (copier → `.env`)              |
| `nginx/iox-pilot.conf`        | Config Nginx reverse proxy + SSL                                  |
| `deploy.sh`                   | Mises à jour suivantes : rsync + build ciblé + restart + health   |
| `rollback.sh`                 | Rétablit le tag `:prev` comme `:local` courant                    |
| `backup.sh`                   | pg_dump + MinIO tar.gz, rotation N jours, miroir local optionnel  |
| `restore.sh`                  | pg_restore depuis un dump (DESTRUCTIF, confirmation YES)          |

## Variables d'environnement

| Variable                       | Défaut                              | Description                       |
| ------------------------------ | ----------------------------------- | --------------------------------- |
| `IOX_VPS_HOST`                 | `rahiss-vps`                        | Hôte SSH cible                    |
| `IOX_VPS_REMOTE`               | `/opt/iox`                          | Répertoire applicatif sur le VPS  |
| `IOX_VPS_COMPOSE`              | `deploy/vps/docker-compose.pilot.yml` | Fichier compose utilisé           |
| `IOX_VPS_DOMAIN`               | `iox.mycloud.yt`                    | Domaine public (healthchecks)     |
| `IOX_BACKUP_DIR`               | `/opt/apps/iox/backups`   | Répertoire des dumps              |
| `IOX_BACKUP_RETENTION_DAYS`    | `7`                       | Rotation find -mtime              |
| `IOX_LOCAL_BACKUP_MIRROR`      | (vide)                    | Si défini, rsync local des dumps  |
| `IOX_PG_CONTAINER`             | `iox_postgres`            | Nom du container Postgres         |
| `IOX_MINIO_CONTAINER`          | `iox_minio`               | Nom du container MinIO            |
| `IOX_MINIO_BUCKET`             | `iox`                     | Nom du bucket à archiver          |

## Usage courant

### Déployer le frontend

```bash
./deploy/vps/deploy.sh frontend
```

### Déployer le backend (plus rare, impact DB/migrations possible)

```bash
./deploy/vps/deploy.sh backend
```

### Déployer tout

```bash
./deploy/vps/deploy.sh all
```

### Rollback immédiat (si healthcheck KO après déploiement)

```bash
./deploy/vps/rollback.sh frontend
```

### Backup manuel

```bash
./deploy/vps/backup.sh
```

### Backup automatique (cron)

Sur le VPS, éditer la crontab du user `deploy` :

```cron
15 3 * * * /opt/apps/iox/deploy/vps/backup.sh >> /var/log/iox-backup.log 2>&1
```

### Restore depuis un dump

```bash
./deploy/vps/restore.sh /opt/apps/iox/backups/postgres/iox-20260424T030000Z.dump
# → confirmer "YES"
```

## Pré-conditions

- SSH par clé vers `$IOX_VPS_HOST` fonctionnel (testé par `deploy.sh`).
- `docker-compose.vps.yml` présent et à jour sur le VPS (non versionné
  pour éviter l'écrasement des valeurs d'infra locales — voir
  `VPS-DEPLOY-AUDIT.md §1.2`).
- `.env` présent sur le VPS (contient les secrets).
- Sur le VPS : Docker ≥ 24, Compose v2, nginx en reverse proxy.
- Disque VPS : ≥ 3 GB libres (vérifié par `deploy.sh`).

## Garanties et limitations

**Garanties**

- Aucun secret n'est écrit ou lu depuis le poste de développement
  (sauf si explicitement déclaré via `IOX_LOCAL_BACKUP_MIRROR`).
- `rsync` exclut `.env*`, `docker-compose.vps.yml`, `node_modules`,
  `.next`, `dist`, `coverage`, `.turbo`, `.git`.
- `deploy.sh` est **idempotent** : réexécuter ne cause pas d'effet
  de bord autre que la reconstruction.
- `rollback.sh` ne rollback que le tag image (`:prev` → `:local`). Le
  code source sur le VPS a déjà été écrasé par le rsync — le rollback
  code complet nécessite un backup préalable du répertoire.

**Limitations**

- Pas de CI/CD : tout passe par SSH depuis le poste opérateur.
- Pas de registry : les images sont buildées on-host (`iox-*:local`).
  La version n-2 n'est pas conservée ; seul `:prev` est gardé.
- `deploy.sh` ne gère pas les migrations Prisma — elles sont
  appliquées automatiquement par l'entrypoint backend au démarrage
  (`prisma migrate deploy`).
- `backup.sh` suppose que le container MinIO monte `/data` (conforme
  `docker-compose.preprod.yml`). À adapter si la config diffère.

## Test à vide

Avant d'utiliser en production, vérifier que `deploy.sh --dry` tourne
sans erreur (TODO : ajouter un mode dry-run dédié ; pour l'instant,
désactiver l'étape 4 et 5 manuellement).

Les scripts sont validés syntaxiquement via `bash -n` dans la CI
locale (cf. `scripts/validate-ops-configs.mjs`).

## Références

- Audit réel : `docs/deploy/VPS-DEPLOY-AUDIT.md`
- Procédure détaillée : `docs/ops/DEPLOY-VPS.md`
- Stratégie backup : `docs/ops/BACKUP.md`
- Go-live checklist : `docs/GO-LIVE-CHECKLIST.md`
- Runbooks incidents : `docs/ops/RUNBOOKS.md`
