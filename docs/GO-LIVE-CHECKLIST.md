# IOX — Checklist exécutive de mise en préprod

> ⚡ **Pour la mise en production VPS réelle (rahiss-vps)**, utiliser
> `docs/ops/PROD-GOLIVE-OPERATOR.md` — checklist exécutable opérateur
> alignée sur les scripts `deploy/vps/*.sh`. Ce document-ci reste la
> vue "cible idéale" (registry + tag + CI) pour référence.
>
> Version opérationnelle — à imprimer ou garder ouverte en fenêtre
> secondaire pendant la bascule. Chaque case = une action concrète,
> vérifiable, avec un critère de succès binaire.
>
> **Légende**
>
> - 🟢 **prêt dans le dépôt** — artefact livré, rien à produire manuellement
> - 🟡 **à injecter manuellement** — valeurs secrètes ou config infra
> - 🔴 **bloquant** — ne pas poursuivre en cas d'échec
> - ⚪ **recommandé** — non bloquant mais fortement conseillé

---

## Bloc A — À préparer **avant** la fenêtre de déploiement

Horizon : J-3 à J-1. Objectif : arriver au jour J sans surprise
administrative ni technique.

| #   | Action                                                                                             | Type  | Critère de succès                                                  |
| --- | -------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------ |
| A1  | VPS ou cluster cible provisionné (Docker ≥ 24 + Compose v2 + Nginx ≥ 1.22)                         | 🟡 🔴 | `docker compose version` + `nginx -v` OK                           |
| A2  | Accès SSH + sudo validés sur l'hôte                                                                | 🟡 🔴 | Session test OK                                                    |
| A3  | Registry Docker accessible avec les images `iox/backend:vX` et `iox/frontend:vX` taguées par la CI | 🟡 🔴 | `docker pull` OK depuis le VPS                                     |
| A4  | Postgres 15+ cible (managé ou docker) — DSN testée                                                 | 🟡 🔴 | `psql "$DATABASE_URL" -c 'SELECT 1'` OK                            |
| A5  | Redis 7+ cible — atteignable                                                                       | 🟡 ⚪ | `redis-cli -u "$REDIS_URL" PING` OK                                |
| A6  | MinIO ou S3 — bucket `iox-preprod` créé, credentials dédiés (≠ `minioadmin`)                       | 🟡 🔴 | `mc ls` / `aws s3 ls` OK                                           |
| A7  | DNS `preprod.iox.mch` → IP VPS, TTL ≤ 300 s                                                        | 🟡 🔴 | `dig +short preprod.iox.mch` retourne IP                           |
| A8  | Certificat TLS ACME obtenu (`certbot certonly`)                                                    | 🟡 🔴 | `/etc/letsencrypt/live/preprod.iox.mch/fullchain.pem` existe       |
| A9  | Secrets générés (`openssl rand -hex 48/24/16`) et stockés dans Vault/SOPS/CI secrets               | 🟡 🔴 | 5 secrets distincts, JWT ≥ 32 car, JWT_SECRET ≠ JWT_REFRESH_SECRET |
| A10 | Baseline Prisma committée : `prisma/migrations/20260421000000_init/migration.sql` (563 lignes)     | 🟢 🔴 | `grep -c "^CREATE TABLE"` → 18                                     |
| A11 | `.env.preprod.example` lu et compris                                                               | 🟢 ⚪ | Opérateur sait quoi remplir                                        |
| A12 | Runbook `deploy/preprod/RUNBOOK.md` lu                                                             | 🟢 🔴 | Opérateur sait quoi faire                                          |
| A13 | CI verte sur le tag à déployer                                                                     | 🟡 🔴 | `gh run list --workflow=ci.yml` montre ✓                           |
| A14 | Backup Postgres quotidien planifié (pg_dump → stockage externe chiffré)                            | 🟡 ⚪ | Cron ou job managé actif                                           |
| A15 | Scrape Prometheus prêt à être activé (job config prête)                                            | 🟡 ⚪ | Job `iox-backend` préparé                                          |
| A16 | Rollback identifié : tag image `n-1` connu et poussé                                               | 🟡 🔴 | `docker pull iox/backend:vX-1` OK                                  |
| A17 | Fenêtre de déploiement communiquée aux parties prenantes                                           | 🟡 ⚪ | Annonce envoyée                                                    |

**🔴 Stop A si** : un seul 🔴 n'est pas coché.

---

## Bloc B — À exécuter **pendant** le déploiement

Horizon : J0, fenêtre 45–75 min. Suivre l'ordre strictement.

| #   | Action                                                                                                                    | Type     | Référence runbook |
| --- | ------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------- |
| B1  | `scp -r deploy/preprod user@vps:/opt/iox/`                                                                                | 🟢 🟡    | étape 0           |
| B2  | `cp .env.preprod.example .env` sur le VPS                                                                                 | 🟢       | étape 2           |
| B3  | Renseigner `.env` avec les 5 secrets + `BACKEND_IMAGE` + `FRONTEND_IMAGE` + `FRONTEND_URL`                                | 🟡 🔴    | étape 2           |
| B4  | `chmod 600 .env`                                                                                                          | 🟡 🔴    | étape 2           |
| B5  | **Preflight** : `set -a && . .env && set +a && APP_ENV=staging NODE_ENV=production node scripts/preflight.mjs` → `exit 0` | 🟢 🔴    | étape 3           |
| B6  | Vérifier accès DB : `docker run --rm postgres:15-alpine psql "$DATABASE_URL" -c 'SELECT 1'`                               | 🟡 🔴    | étape 4           |
| B7  | Copier `nginx.preprod.conf.example` → `/etc/nginx/sites-available/iox.conf`, adapter `server_name` + chemins TLS          | 🟢 🟡 🔴 | étape 5           |
| B8  | `nginx -t && systemctl reload nginx`                                                                                      | 🟡 🔴    | étape 5           |
| B9  | Vérifier HSTS + HTTPS : `curl -I https://preprod.iox.mch/ \| grep -i strict-transport-security`                           | 🟡 🔴    | étape 5           |
| B10 | `docker compose -f docker-compose.preprod.yml pull`                                                                       | 🟢       | étape 6           |
| B11 | `docker compose -f docker-compose.preprod.yml up -d`                                                                      | 🟢 🔴    | étape 6           |
| B12 | Suivre logs : `docker compose logs -f backend` — attendre `prisma migrate deploy` OK + `🚀 IOX Backend démarré`           | 🟢 🔴    | étape 6           |
| B13 | `docker compose ps` — tous `healthy`                                                                                      | 🟢 🔴    | étape 6           |
| B14 | `curl -fsS http://127.0.0.1:3001/api/v1/health/live` → 200                                                                | 🟢 🔴    | étape 7           |
| B15 | `curl -fsS http://127.0.0.1:3001/api/v1/health` → 200 (readiness)                                                         | 🟢 🔴    | étape 7           |
| B16 | `METRICS_TOKEN=… ./scripts/smoke-check.sh` → exit 0                                                                       | 🟢 🔴    | étape 8           |
| B17 | Activer le scrape Prometheus (job `iox-backend`)                                                                          | 🟡 ⚪    | étape 10          |
| B18 | Seed initial **si premier déploiement** puis rotation mot de passe admin                                                  | 🟡 ⚪    | étape 11          |

**🔴 Stop B si** : B5, B6, B8, B11, B12, B13, B14, B15, B16 → tout échec =
rollback immédiat (voir Bloc D).

---

## Bloc C — À vérifier **juste après** le déploiement

Horizon : J0 + 5 à 15 min. Objectif : détecter un problème avant
d'annoncer la préprod ouverte.

| #   | Action                                                                                      | Type  | Critère                                                                 |
| --- | ------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------- |
| C1  | Parcours login UI admin via `https://preprod.iox.mch/`                                      | 🟡 🔴 | Redirect dashboard, `accessToken` en localStorage                       |
| C2  | Création bénéficiaire via UI                                                                | 🟡 🔴 | Apparaît dans la liste, audit log posté                                 |
| C3  | Création lot fini à partir d'un produit COMPLIANT                                           | 🟡 🔴 | Lot enregistré                                                          |
| C4  | Décision NON_COMPLIANT sans motif → bloquée côté UI                                         | 🟡 🔴 | Erreur locale affichée                                                  |
| C5  | Décision NON_COMPLIANT avec motif → enregistrée                                             | 🟡 🔴 | OK                                                                      |
| C6  | Décision COMPLIANT → enregistrée                                                            | 🟡 🔴 | OK                                                                      |
| C7  | Upload d'un document test → vérifier présence dans MinIO                                    | 🟡 🔴 | Fichier visible `mc ls`                                                 |
| C8  | Vérifier Swagger en production désactivé : `curl -I https://preprod.iox.mch/api/docs` → 404 | 🟡 ⚪ | (Note : actif si `APP_ENV=staging` ; absent si `APP_ENV=production`)    |
| C9  | Metrics scrape visible dans Prometheus UI : target `iox-backend` → `UP`                     | 🟡 ⚪ | Target vert                                                             |
| C10 | Aucune 5xx dans les logs backend depuis 5 min                                               | 🟢 ⚪ | `docker compose logs backend --since 5m \| grep -c " 5[0-9][0-9] "` → 0 |
| C11 | `docker stats` — CPU < 50 %, mémoire stable                                                 | 🟢 ⚪ | Ressources raisonnables                                                 |

**🔴 Stop C si** : C1..C7 échouent → rollback.

---

## Bloc D — À surveiller dans les **30 premières minutes**

Horizon : J0 + 5 à 35 min. L'opérateur reste focalisé sur la préprod.

| #   | Métrique / Signal                                                      | Seuil d'alerte        | Action si dépassé                             |
| --- | ---------------------------------------------------------------------- | --------------------- | --------------------------------------------- |
| D1  | `rate(iox_http_requests_total{status=~"5.."}[5m])`                     | > 0.1 req/s           | Enquête logs + rollback si persiste           |
| D2  | `histogram_quantile(0.95, rate(iox_http_duration_seconds_bucket[5m]))` | > 1 s                 | Enquête DB / requêtes lentes                  |
| D3  | `up{job="iox-backend"} == 0`                                           | > 30 s                | Crash-loop → `docker compose logs` + rollback |
| D4  | Process memory `iox_process_memory_rss_bytes`                          | croissance > 10 %/min | Fuite mémoire possible — rollback si continue |
| D5  | Erreurs Prisma dans logs (`P1001`, `P2024`, timeouts)                  | > 0                   | DB saturée ou réseau KO                       |
| D6  | Taille logs nginx `/var/log/nginx/iox.preprod.error.log`               | > 1 MB en 30 min      | Flood erreurs — capturer pattern              |
| D7  | Certificat TLS : validité                                              | ≤ 15 j                | Renouveler ACME (non bloquant à J0)           |
| D8  | Disque hôte                                                            | > 80 %                | Purger volumes Docker orphelins               |

### Rollback rapide (si D1, D3 ou D5 dépassent)

```bash
cd /opt/iox/preprod
sed -i 's|:v0\.1\.0|:v0.0.9|g' .env
docker compose -f docker-compose.preprod.yml pull
docker compose -f docker-compose.preprod.yml up -d
./scripts/smoke-check.sh
```

Horizon rollback : ≤ 3 min si les images n-1 sont déjà dans le registry.

---

## Synthèse "à dire en réunion"

- **Prêt dans le dépôt** (🟢) : migrations baseline, Dockerfiles durcis,
  entrypoint avec migrate deploy, preflight, smoke-check, runbook,
  templates docker-compose + nginx + env.
- **À injecter manuellement** (🟡) : secrets (5 valeurs), DNS + TLS,
  `.env` sur l'hôte, scrape Prometheus.
- **Bloquant** (🔴) : 9 checks dans le bloc B (B5, B6, B8, B11, B12, B13,
  B14, B15, B16) + 7 checks dans le bloc C (C1..C7).
- **Recommandé non bloquant** (⚪) : backup Postgres, logs centralisés,
  alertes PromQL, Swagger en préprod (acceptable).

**Décision de go-live** : cocher tout le bloc B sans échec bloquant **et**
C1..C7 → `GO`.

**Décision de rollback** : un 🔴 du bloc B ou C échoue → `ROLLBACK`
immédiat (≤ 3 min si vX-1 disponible).

---

## Annexes ops

Cette checklist se complète avec les runbooks dédiés :

- **Pré-déploiement** : `docs/ops/PRE-DEPLOY.md` — checks bloquants,
  snapshot DB, dry run migration.
- **Rollback détaillé** : `docs/ops/ROLLBACK.md` — critères objectifs,
  procédures k8s/compose, rollback DB si migration non-compatible.
- **Runbooks alertes** : `docs/ops/RUNBOOKS.md` — une procédure par
  alerte Prometheus (référencée via annotation `runbook`).
- **Observabilité externe** : `docs/ops/EXTERNAL-OBSERVABILITY.md` —
  architecture Prometheus/Loki/Alertmanager, métriques exposées,
  dashboards Grafana.
- **Corrélation Request ID** : `docs/ops/CORRELATION.md` — chaîne
  front → backend → logs → Grafana via `#XXXXXXXX`.
- **Déploiement VPS réel** : `docs/ops/DEPLOY-VPS.md` — procédure
  rsync + build on-host + rollback `:prev`. Scripts codifiés dans
  `deploy/vps/` (`deploy.sh`, `rollback.sh`, `backup.sh`, `restore.sh`).
- **Backup / DR** : `docs/ops/BACKUP.md` — stratégie pg_dump + MinIO
  tar.gz, rotation 7 j, cible RPO 24 h / RTO 30 min.

Artefacts de configuration (à déployer hors repo) :

- `ops/prometheus/` — scrape config + 13 règles d'alerte.
- `ops/alertmanager/alertmanager.yml` — routing critical/warning/info.
- `ops/loki/` — pipeline Promtail + requêtes LogQL utiles.
- `ops/grafana/dashboards/` — 2 dashboards JSON (overview + marketplace).
- `ops/datadog/datadog-agent.yaml` — alternative Datadog.

Vérification rapide : `node scripts/validate-ops-configs.mjs` confirme
que tous les YAML/JSON de `ops/` sont parseables **et** que les
scripts bash de `deploy/vps/` passent `bash -n` avant push infra.
