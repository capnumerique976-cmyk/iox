# IOX — Instructions Claude Code

## VPS cohabitation — Règles absolues

Le VPS `187.124.216.193` (alias `rahiss-vps`) héberge plusieurs applications : IOX, Telemante, Agora, Vavo. Toute action doit être isolée à IOX.

### Commandes INTERDITES

```bash
# Ne jamais exécuter :
docker system prune -a
docker volume prune
docker compose down                    # sans -f docker-compose.vps.yml dans /opt/apps/iox
rm -rf /opt/*
./deploy/vps/setup-first-run.sh
```

### Commandes autorisées IOX uniquement

```bash
# Déploiement ciblé depuis le Mac local :
./deploy/vps/deploy.sh frontend        # si changement frontend uniquement
./deploy/vps/deploy.sh backend         # si correction backend uniquement
./deploy/vps/deploy.sh all             # si backend + frontend nécessaires

# Rollback :
./deploy/vps/rollback.sh backend
./deploy/vps/rollback.sh frontend

# Sur VPS — uniquement dans /opt/apps/iox :
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml <cmd>"
```

### Audit obligatoire avant toute action VPS

```bash
ssh rahiss-vps "hostname && uptime && df -h && free -h"
ssh rahiss-vps "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'"
ssh rahiss-vps "ls -la /opt/apps"
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml ps"
```

### Vérification post-déploiement

- `iox_backend` healthy
- `iox_frontend` healthy
- `iox_postgres` / `iox_redis` / `iox_minio` / `iox_meilisearch` healthy
- Telemante toujours up
- Agora toujours up
- Vavo toujours up
- `nginx -t` OK si Nginx touché
- `https://iox.mycloud.yt` opérationnel

## Infra

| Paramètre | Valeur |
|-----------|--------|
| VPS SSH alias | `rahiss-vps` |
| VPS IP | `187.124.216.193` |
| User deploy | `deploy` |
| Clé SSH | `~/.ssh/rahiss_deploy_ed25519` |
| Chemin IOX | `/opt/apps/iox` |
| Compose file | `docker-compose.vps.yml` |
| Domaine | `https://iox.mycloud.yt` |

## Containers IOX

| Container | Role |
|-----------|------|
| `iox_frontend` | Next.js 14, port 3000 |
| `iox_backend` | NestJS, port 3001 |
| `iox_postgres` | PostgreSQL 15 |
| `iox_redis` | Redis 7 |
| `iox_minio` | MinIO (media) |
| `iox_meilisearch` | MeiliSearch v1.7 |

## Stack

- **Frontend** : Next.js 14, App Router, TypeScript, Tailwind, shadcn/ui
- **Backend** : NestJS, Prisma ORM (PostgreSQL 15), JWT auth
- **Monorepo** : pnpm workspaces — `apps/frontend`, `apps/backend`, `packages/shared`
- **Tests** : Vitest (frontend), Jest (backend)

## Règles code

- Ne pas lancer de migration DB sans validation explicite.
- Ne pas modifier les secrets `.env` sur le VPS.
- Ne pas toucher aux dossiers hors `/opt/apps/iox` sauf lecture seule.
- Ne pas modifier les vhosts Nginx des autres applications.
- Toujours commiter avant de déployer.
