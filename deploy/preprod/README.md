# IOX — Templates de déploiement préprod

Ces fichiers sont des **templates** prêts à adapter à votre infra cible
(VPS Docker, k8s, Swarm). Rien ici n'est exécuté automatiquement.

| Fichier                      | Rôle                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| `docker-compose.preprod.yml` | Stack complète (Postgres + Redis + MinIO + backend + frontend) |
| `.env.preprod.example`       | Variables à copier vers `.env` sur l'hôte                      |
| `nginx.preprod.conf.example` | Reverse proxy TLS + headers sécurité + metrics ACL             |

## Procédure type VPS Docker

1. **Cloner le template sur l'hôte préprod**

   ```bash
   scp -r deploy/preprod user@vps:/opt/iox/
   ssh user@vps
   cd /opt/iox/preprod
   cp .env.preprod.example .env
   ```

2. **Renseigner les secrets**

   ```bash
   openssl rand -hex 48      # → JWT_SECRET
   openssl rand -hex 48      # → JWT_REFRESH_SECRET (différent)
   openssl rand -hex 24      # → MINIO_ROOT_PASSWORD
   openssl rand -hex 24      # → METRICS_TOKEN (optionnel)
   openssl rand -hex 16      # → POSTGRES_PASSWORD
   ```

3. **Preflight** (depuis le repo sur l'hôte ou la CI)

   ```bash
   set -a && . /opt/iox/preprod/.env && set +a
   APP_ENV=staging node scripts/preflight.mjs
   ```

4. **Boot**

   ```bash
   docker compose -f docker-compose.preprod.yml up -d
   docker compose -f docker-compose.preprod.yml logs -f backend
   ```

   Les migrations Prisma s'appliquent automatiquement au démarrage via
   l'entrypoint backend (désactivable avec `SKIP_MIGRATIONS=1`).

5. **Sanity checks**

   ```bash
   curl -fsS http://127.0.0.1:3001/api/v1/health/live
   curl -fsS http://127.0.0.1:3001/api/v1/health         # readiness
   curl -fsS http://127.0.0.1:3000/ | head -20
   ```

6. **Reverse proxy**
   Copier `nginx.preprod.conf.example`, adapter domaine + chemins TLS,
   recharger Nginx.

7. **Scrape Prometheus**
   ```
   scrape_configs:
     - job_name: iox-backend
       metrics_path: /api/v1/metrics
       static_configs: [{ targets: ['preprod.iox.mch'] }]
       scheme: https
       authorization:
         type: Bearer
         credentials: <METRICS_TOKEN>
   ```

## Variantes

- **Base Postgres managée** (RDS, Cloud SQL, Neon) : retirer le service
  `postgres` du compose, pointer `DATABASE_URL` vers l'instance distante
  avec `sslmode=require`.
- **Stockage S3 réel** : remplacer le service `minio` par les credentials
  S3 (AWS\_\*) ; le backend utilise le SDK MinIO qui est compatible S3.
- **Kubernetes** : transposer le compose en `Deployment` + `Service` ;
  les healthchecks de `Dockerfile` fonctionnent directement en probes
  `httpGet`.

## Rollback rapide

```bash
docker compose -f docker-compose.preprod.yml down
# Restaurer la version n-1
sed -i 's|iox/backend:vX|iox/backend:vX-1|' .env
sed -i 's|iox/frontend:vX|iox/frontend:vX-1|' .env
docker compose -f docker-compose.preprod.yml up -d
```
