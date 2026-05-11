# IOX — Déploiement sur VPS non vierge (rahiss-vps)

> **TL;DR** : IOX tourne sur `rahiss-vps` en cohabitation avec Telemante et Agora.
> Ne jamais lancer `setup-first-run.sh`. Utiliser uniquement `./deploy/vps/deploy.sh`.

---

## Contexte

`rahiss-vps` (`srv1570073`, `iox.mycloud.yt`) héberge 3 stacks Docker en production :

| Stack | Containers | Ports hôte |
|---|---|---|
| **IOX** | iox_backend, iox_frontend, iox_postgres, iox_redis, iox_minio, iox_meilisearch | 127.0.0.1:3000, 127.0.0.1:3001 |
| **Telemante** | telemante_frontend, telemante_backend, telemante_postgres, telemante_redis, telemante_minio, telemante_meilisearch, telemante_keycloak, telemante_nginx, telemante_streaming, monitoring stack | 127.0.0.1:3080, 127.0.0.1:8080, 0.0.0.0:1935 |
| **Agora** | agora_web, agora_api, agora_postgres, agora_redis, agora_minio, agora_workers, jitsi stack | 127.0.0.1:3050, 127.0.0.1:4050, 127.0.0.1:9002, 0.0.0.0:10000/udp |

IOX a son propre réseau Docker (`iox_net`) — isolation totale des autres stacks.

---

## Chemins sur le VPS

| Élément | Chemin |
|---|---|
| Code IOX | `/opt/apps/iox/` |
| Compose IOX | `/opt/apps/iox/docker-compose.vps.yml` |
| Secrets IOX | `/opt/apps/iox/.env` (jamais synchronisé) |
| Données (volumes Docker) | gérés par Docker engine, pas de bind mounts |

---

## Règle absolue : NE PAS lancer `setup-first-run.sh`

`setup-first-run.sh` est conçu pour un VPS **vierge**. Il :
- Installe Docker, Nginx, Certbot depuis zéro
- Configure le firewall
- Écrase les configurations Nginx existantes
- Interfère avec Telemante et Agora

**Sur `rahiss-vps`, ces composants sont déjà installés et configurés par d'autres équipes.**

---

## Déploiement IOX (commande unique)

Depuis le poste local, dans la racine du repo :

```bash
# Backend uniquement (bug fix DTO, migration mineure)
./deploy/vps/deploy.sh backend

# Frontend uniquement (changement UI)
./deploy/vps/deploy.sh frontend

# Les deux (changement majeur)
./deploy/vps/deploy.sh all
```

Le script :
1. Vérifie SSH + espace disque (`/opt/apps/iox` doit avoir ≥ 3 GB libres)
2. Crée `/opt/apps/iox` si absent (`mkdir -p`)
3. rsync le code local → `/opt/apps/iox/` (exclut `.env`, `.env.*`, `docker-compose.vps*.yml`, `node_modules`, `.git`, `.claude/worktrees`)
4. Tag l'image courante en `:prev` (rollback en 5s)
5. `docker compose -f docker-compose.vps.yml build <service>`
6. `docker compose -f docker-compose.vps.yml up -d --no-deps <service>`
7. Healthchecks sur `https://iox.mycloud.yt`

---

## `docker-compose.vps.yml` — fichier VPS uniquement

Ce fichier vit sur le VPS à `/opt/apps/iox/docker-compose.vps.yml`.
Il est **gitignored** (`docker-compose.vps*.yml`) et **protégé du rsync** (exclu).

Différences clés avec `deploy/vps/docker-compose.pilot.yml` :
- Image tag : `:local` (pas `:pilot`)
- Build context : `.` (racine du projet déployé)
- Volumes : named volumes Docker (pas de bind mounts `/opt/iox/data/*`)
- Services : inclut `meilisearch` (absent du pilot)

Pour modifier ce fichier : éditer directement sur VPS ou via SSH, puis restarté manuellement.

---

## Rollback

```bash
./deploy/vps/rollback.sh backend   # restaure iox-backend:prev
./deploy/vps/rollback.sh frontend  # restaure iox-frontend:prev
```

---

## Ne jamais toucher

| Interdit | Raison |
|---|---|
| `docker system prune -a` | Supprime images Telemante et Agora |
| `docker volume prune` | Détruit données DB des autres apps |
| Nginx `/etc/nginx/sites-enabled/*` | Partagé entre IOX, Telemante, Agora |
| `/opt/apps/iox/.env` | Secrets prod IOX |
| Containers `telemante_*`, `agora_*` | Autres apps en production |
| `setup-first-run.sh` | VPS non vierge — destructeur |

---

## Logs Docker IOX

```bash
# Backend (erreurs API, migrations)
ssh rahiss-vps 'docker logs iox_backend --tail=100 -f'

# Frontend
ssh rahiss-vps 'docker logs iox_frontend --tail=50'

# MinIO (uploads)
ssh rahiss-vps 'docker logs iox_minio --tail=50'
```

---

## Maintenance disque (sûre)

```bash
# Purge cache APT
ssh rahiss-vps 'apt clean && apt autoremove --purge -y'

# Purge logs système anciens (> 7 jours)
ssh rahiss-vps 'journalctl --vacuum-time=7d'

# Purge build cache Docker (ne touche pas aux images actives)
ssh rahiss-vps 'docker builder prune -f'

# Purge images dangling uniquement
ssh rahiss-vps 'docker image prune -f'
```

**Ne jamais** : `docker system prune -a`, `docker volume prune`.

---

## Ports réservés IOX

| Port | Service | Accès |
|---|---|---|
| 127.0.0.1:3000 | iox_frontend | Nginx → `iox.mycloud.yt` |
| 127.0.0.1:3001 | iox_backend | Nginx → `iox.mycloud.yt/api/v1` |
| 9000 (interne) | iox_minio | Réseau iox_net uniquement |
| 7700 (interne) | iox_meilisearch | Réseau iox_net uniquement |
| 5432 (interne) | iox_postgres | Réseau iox_net uniquement |
| 6379 (interne) | iox_redis | Réseau iox_net uniquement |

Aucun port IOX n'entre en conflit avec Telemante ou Agora.

---

## Idées d'amélioration futures

- `deploy/vps/audit-existing-server.sh` : script de pré-déploiement qui vérifie les ports, réseaux Docker existants, espace disque, et détecte les conflits potentiels avant tout déploiement sur VPS non vierge.
- Rotation des logs Docker : ajouter `--log-opt max-size=10m --log-opt max-file=3` globalement dans `/etc/docker/daemon.json`.
- Monitoring disque : alerte cron si `/dev/sda1` dépasse 85%.
- Cron mensuel : `docker image prune -f && docker builder prune -f` pour libérer l'espace des builds accumulés.
