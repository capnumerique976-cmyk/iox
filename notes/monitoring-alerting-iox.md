# Monitoring & Alerting — IOX

> Document opérationnel — version 2026-05-10.  
> Référence le code présent dans `apps/backend/src/health/` et `apps/backend/src/metrics/`.

---

## 1. Endpoints de monitoring disponibles

### 1.1 Health checks (publics, pas d'auth)

| Endpoint | Méthode | Auth | Usage |
|---|---|---|---|
| `GET /api/v1/health/live` | GET | Public | Liveness probe — répond `{ status: "ok", uptime }`. Utilisé par Docker healthcheck et Kubernetes liveness probe. |
| `GET /api/v1/health` | GET | Public | Readiness probe — ping DB Prisma + vérification config MinIO. Retourne un payload `@nestjs/terminus` standard. |
| `GET /api/v1/health/ready` | GET | Public | Alias readiness explicite (même logique que `/health`) — pour les sondes Kubernetes readiness. |

Réponse type readiness :
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "storage": { "status": "up", "endpoint": "localhost", "bucket": "iox-prod" }
  }
}
```

### 1.2 Endpoint ops — snapshot métier (staff seulement)

| Endpoint | Méthode | Auth | Usage |
|---|---|---|---|
| `GET /api/v1/health/ops` | GET | JWT Bearer — rôles ADMIN / COORDINATOR / QUALITY_MANAGER | Snapshot marketplace : compteurs sellers, publications, documents, RFQ. Cadence conseillée : toutes les 30–60 s depuis un dashboard NOC. |

Retourne les compteurs : `sellers.total`, `sellers.pendingReview`, `publications.products`, `documents.pending`, `rfq.newCount`, etc.

### 1.3 Métriques Prometheus

| Endpoint | Méthode | Auth | Usage |
|---|---|---|---|
| `GET /api/v1/metrics` | GET | Optionnel — si `METRICS_TOKEN` défini : `Authorization: Bearer <token>` | Export format Prometheus text/plain v0.0.4. Scrapable par Prometheus ou Grafana Agent. |

**Métriques exposées** (implémentation interne dans `MetricsService`, zéro dépendance externe) :

- `iox_process_uptime_seconds` — uptime du process backend
- `iox_process_memory_rss_bytes` — RSS mémoire
- `iox_process_memory_heap_used_bytes` — heap V8
- `iox_http_requests_total{method,status,route}` — compteur HTTP (alimenté par `MetricsInterceptor`)
- `iox_http_duration_seconds{method,route}` — histogramme latence HTTP
- `iox_marketplace_sellers_total` — gauge total sellers (rafraîchi toutes les 60 s par `OpsMetricsService`)
- `iox_marketplace_sellers_by_status{status}` — pending_review / approved / suspended
- `iox_marketplace_publications{entity,status}` — products/offers par statut
- `iox_marketplace_review_pending` — items en file de revue qualité
- `iox_marketplace_documents{verification_status}` — documents pending/rejected
- `iox_marketplace_rfq{status}` — RFQ new / negotiating
- `iox_marketplace_metrics_last_refresh_seconds` — timestamp unix du dernier tick OpsMetrics

> La cadence de rafraîchissement des gauges marketplace est configurable via `IOX_OPS_METRICS_INTERVAL_MS` (défaut : 60 000 ms, min 10 000 ms).

### 1.4 Bull Board — interface queues BullMQ

| URL | Auth | Queues exposées |
|---|---|---|
| `/admin/queues` | JWT Bearer — rôle ADMIN uniquement | `iox.email` (emails transactionnels), `iox.search` (indexation MeiliSearch) |

L'interface Bull Board est servie hors du préfixe `api/v1` (cf. `main.ts` — exclude pattern `admin/(.*)`). Elle nécessite un token JWT valide avec le rôle `ADMIN`.

---

## 2. Stack recommandée (open source, coût minimal)

### 2.1 Uptime monitoring externe

**UptimeRobot (gratuit)** — surveillez depuis l'extérieur du réseau :
- Monitor type : HTTP(s)
- URL : `https://api.iox.example/api/v1/health/live`
- Intervalle : 5 min (gratuit), 1 min avec plan Starter (~7$/mois)
- Alertes : email + Slack webhook

Alternative : **Betterstack Uptime** (gratuit jusqu'à 10 moniteurs, 3 min d'intervalle).

### 2.2 Métriques — Prometheus + Grafana

**Option A — self-hosted (VPS)** :
```yaml
# prometheus.yml (à placer sur le VPS)
global:
  scrape_interval: 30s

scrape_configs:
  - job_name: iox_backend
    static_configs:
      - targets: ['127.0.0.1:3001']
    metrics_path: /api/v1/metrics
    scheme: http
    authorization:
      type: Bearer
      credentials: <METRICS_TOKEN>
```

Grafana en container : `docker run -d -p 3002:3000 grafana/grafana`  
Datasource : Prometheus sur `http://prometheus:9090`.

**Option B — Grafana Cloud (gratuit jusqu'à 10 000 series)** :
- Créer un compte sur grafana.com
- Utiliser Grafana Agent pour pousser les métriques vers le cloud
- Coût : 0€ pour le pilote, pas de VPS Grafana à maintenir

### 2.3 Logs

**PM2 + logrotate (minimal, VPS)** :
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

Logs lisibles : `pm2 logs iox-backend --lines 100`

**Alternative avancée — Loki + Grafana** : si Grafana est déjà déployé, ajouter Loki comme datasource de logs. Promtail lit les logs PM2 (fichier `~/.pm2/logs/`) et les pousse vers Loki.

### 2.4 Error tracking

**Sentry (gratuit 5 000 erreurs/mois)** :
1. Créer un projet Node.js sur sentry.io
2. Ajouter `@sentry/node` dans le backend NestJS
3. Initialiser dans `main.ts` avant `NestFactory.create()`
4. Les erreurs non catchées + les exceptions HTTP 5xx remontent automatiquement

### 2.5 Résumé coûts pilote (3 mois)

| Outil | Coût mensuel | Notes |
|---|---|---|
| UptimeRobot | 0€ | Plan gratuit, 5 min intervalle |
| Prometheus (VPS) | 0€ | Process sur le VPS existant |
| Grafana Cloud | 0€ | Gratuit < 10 000 series |
| Sentry | 0€ | Gratuit < 5 000 erreurs/mois |
| **Total** | **0€** | Stack complète sans surcoût |

---

## 3. Alertes critiques — must-have

### 3.1 Backend down

- **Déclencheur** : `GET /api/v1/health/live` retourne HTTP ≠ 200 ou timeout > 10 s
- **Outil** : UptimeRobot / Betterstack
- **Action** : SMS + email on-call + notification Slack `#ops-alertes`
- **Seuil** : 2 échecs consécutifs avant alerte (évite les faux positifs transitoires)

### 3.2 DB connection failed

- **Déclencheur** : `GET /api/v1/health` retourne `database.status = "down"` OU `iox_http_requests_total{status="500"}` en hausse soudaine
- **Outil** : Prometheus alert rule
```yaml
- alert: DatabaseDown
  expr: |
    (
      sum(rate(iox_http_requests_total{status=~"5.."}[5m])) /
      sum(rate(iox_http_requests_total[5m]))
    ) > 0.5
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Taux d'erreur 5xx > 50% depuis 2 min"
```

### 3.3 Failed Stripe webhooks (> 3 en 5 min)

- **Déclencheur** : `iox_http_requests_total{route="/api/v1/payments/webhook",status=~"4..|5.."}` > 3 en 5 min
- **Outil** : Prometheus alert rule
```yaml
- alert: StripeWebhookFailures
  expr: |
    increase(iox_http_requests_total{
      route="/api/v1/payments/webhook",
      status=~"4..|5.."
    }[5m]) > 3
  for: 0m
  labels:
    severity: critical
  annotations:
    summary: "Plus de 3 webhooks Stripe en échec en 5 min — vérifier STRIPE_WEBHOOK_SECRET"
```

### 3.4 Disk usage > 80%

- **Déclencheur** : espace disque VPS > 80% (logs, uploads MinIO, DB)
- **Outil** : node_exporter (Prometheus) + alert rule, ou script cron
```bash
# cron toutes les 15 min
USAGE=$(df / | awk 'NR==2{gsub(/%/,""); print $5}')
if [ "$USAGE" -gt 80 ]; then
  curl -X POST "$SLACK_WEBHOOK" \
    -H 'Content-type: application/json' \
    -d '{"text":"[IOX] ALERTE disque VPS : '"$USAGE"'% utilisé"}'
fi
```

### 3.5 Failed jobs queue > 10

- **Déclencheur** : file `iox.email` ou `iox.search` avec plus de 10 jobs en état `failed`
- **Outil** : Bull Board (visuel) + script de monitoring BullMQ
- **Monitoring rapide** :
```bash
redis-cli -u "$REDIS_URL" LLEN bull:iox.email:failed
redis-cli -u "$REDIS_URL" LLEN bull:iox.search:failed
```
- **Alerte Prometheus** : ajouter une gauge `iox_queue_failed_jobs{queue}` dans `OpsMetricsService` (à implémenter) et déclencher si > 10.

---

## 4. Configuration PM2 — `ecosystem.config.js`

Template à placer à la racine du projet sur le VPS (si déploiement sans Docker) :

```javascript
// ecosystem.config.js
// Usage : pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      // ── Backend NestJS ──────────────────────────────────────
      name: 'iox-backend',
      script: 'dist/main.js',
      cwd: '/opt/iox/apps/backend',
      instances: 1,          // Augmenter si multi-core disponible
      exec_mode: 'fork',     // 'cluster' si instances > 1
      watch: false,
      max_memory_restart: '512M',

      env_production: {
        NODE_ENV: 'production',
        APP_ENV: 'production',
        APP_PORT: '3001',
        // Les secrets sont injectés depuis un fichier .env séparé
        // ou depuis les variables d'environnement du système.
        // NE PAS mettre de secrets ici.
      },

      // Logs
      log_file: '/var/log/pm2/iox-backend.log',
      error_file: '/var/log/pm2/iox-backend-error.log',
      out_file: '/var/log/pm2/iox-backend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Redémarrage automatique
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 3000,

      // Graceful shutdown — laisse le temps à Nest de fermer Prisma
      kill_timeout: 5000,
      listen_timeout: 8000,
      shutdown_with_message: true,
    },

    {
      // ── Frontend Next.js ────────────────────────────────────
      name: 'iox-frontend',
      script: 'server.js',
      cwd: '/opt/iox/apps/frontend/.next/standalone',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',

      env_production: {
        NODE_ENV: 'production',
        PORT: '3000',
        NEXT_PUBLIC_API_URL: 'https://api.iox.example/api/v1',
        BACKEND_INTERNAL_URL: 'http://127.0.0.1:3001',
      },

      log_file: '/var/log/pm2/iox-frontend.log',
      error_file: '/var/log/pm2/iox-frontend-error.log',
      out_file: '/var/log/pm2/iox-frontend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 3000,
      kill_timeout: 3000,
    },
  ],
};
```

**Démarrage initial** :
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # génère la commande systemd pour démarrer au boot
```

---

## 5. Commandes de monitoring rapide

```bash
# ── Statut des process PM2 ──────────────────────────────────────────────────
pm2 status
pm2 monit                          # dashboard interactif CPU/RAM/logs

# ── Logs en temps réel ──────────────────────────────────────────────────────
pm2 logs iox-backend --lines 100
pm2 logs iox-frontend --lines 50
pm2 logs iox-backend --err         # erreurs uniquement

# ── Health checks manuels ───────────────────────────────────────────────────
curl -s https://api.iox.example/api/v1/health/live | jq .
curl -s https://api.iox.example/api/v1/health | jq .
# Avec token :
curl -s -H "Authorization: Bearer $METRICS_TOKEN" \
  https://api.iox.example/api/v1/metrics | head -50

# ── Snapshot ops (nécessite un JWT ADMIN) ───────────────────────────────────
curl -s -H "Authorization: Bearer $ADMIN_JWT" \
  https://api.iox.example/api/v1/health/ops | jq .

# ── Base de données (Postgres) ──────────────────────────────────────────────
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"
psql "$DATABASE_URL" -c "\dt+"  # tailles des tables

# ── Redis / BullMQ ──────────────────────────────────────────────────────────
redis-cli -u "$REDIS_URL" PING
redis-cli -u "$REDIS_URL" INFO memory | grep used_memory_human
redis-cli -u "$REDIS_URL" LLEN bull:iox.email:failed
redis-cli -u "$REDIS_URL" LLEN bull:iox.search:failed
redis-cli -u "$REDIS_URL" LLEN bull:iox.email:wait

# ── Disque & mémoire VPS ────────────────────────────────────────────────────
df -h /
free -h
du -sh /var/log/pm2/
du -sh /var/lib/postgresql/

# ── Derniers redémarrages PM2 ───────────────────────────────────────────────
pm2 list --no-color | grep -E "restart|errored"

# ── Consommation CPU processus ──────────────────────────────────────────────
top -bn1 | grep -E "iox|node|postgres" | head -10
```

---

## 6. Runbook incidents

### Incident 1 — Backend down (health/live ne répond pas)

**Symptômes** : UptimeRobot alerte, `/api/v1/health/live` timeout ou 502.

**Étapes** :
1. `pm2 status` — vérifier l'état de `iox-backend` (errored / stopped)
2. `pm2 logs iox-backend --err --lines 50` — chercher le message d'erreur (crash, port déjà occupé, secrets manquants)
3. Si process crashé : `pm2 restart iox-backend` et surveiller
4. Si port occupé : `lsof -i :3001` puis `kill -9 <PID>` et `pm2 start iox-backend`
5. Si erreur DB au démarrage (Prisma ne connect pas) : vérifier `DATABASE_URL`, tester `psql $DATABASE_URL -c '\l'`
6. Si le process ne redémarre pas en 3 tentatives PM2 : reconstruire et redéployer
   ```bash
   cd /opt/iox && git pull && pnpm build && pm2 restart iox-backend
   ```
7. Notifier l'équipe sur Slack une fois rétabli

**Escalade** : si down > 10 min et non résolu, prévenir le responsable technique.

---

### Incident 2 — DB saturée / requêtes lentes

**Symptômes** : health check `database: down`, taux 5xx élevé, timeout Prisma dans les logs.

**Étapes** :
1. `psql $DATABASE_URL -c "SELECT pid, now()-query_start, query FROM pg_stat_activity WHERE state='active' ORDER BY query_start LIMIT 20;"` — identifier les requêtes longues
2. Tuer les requêtes bloquantes : `SELECT pg_terminate_backend(<pid>);`
3. Vérifier les connexions actives : `SELECT count(*) FROM pg_stat_activity;`
4. Si connexions saturées (Prisma pool exhausted) : redémarrer le backend (`pm2 restart iox-backend`)
5. Vérifier l'espace disque : `df -h /var/lib/postgresql/`
6. Si espace disque critique : purger les vieux logs Postgres
   ```bash
   psql $DATABASE_URL -c "VACUUM FULL ANALYZE;"
   ```
7. Si problème récurrent : augmenter `connection_limit` dans `DATABASE_URL` ou réduire `pool_timeout`

---

### Incident 3 — Webhooks Stripe en échec

**Symptômes** : alerte Prometheus `StripeWebhookFailures`, paiements non crédités côté seller.

**Étapes** :
1. `pm2 logs iox-backend --lines 100 | grep -i stripe` — identifier le message d'erreur
2. Erreurs fréquentes :
   - `Webhook signature verification failed` → `STRIPE_WEBHOOK_SECRET` incorrect ou expiré
   - `Cannot read rawBody` → problème dans le middleware `verify` de `main.ts`
   - `400 Bad Request` → payload malformé (rare, côté Stripe)
3. Vérifier dans le dashboard Stripe que les webhooks sont bien configurés et que le secret correspond
4. Si secret expiré : régénérer via `stripe listen` ou dashboard Stripe → mettre à jour `.env` → `pm2 restart iox-backend`
5. Les webhooks Stripe incluent un mécanisme de retry automatique (pendant 72h) — les transactions ne sont pas perdues
6. Confirmer la résolution : `curl -s -H "Authorization: Bearer $METRICS_TOKEN" .../metrics | grep payments`

---

### Incident 4 — Disk usage > 90%

**Symptômes** : alerte disque, éventuellement erreurs d'écriture dans les logs.

**Étapes prioritaires (ordre d'urgence)** :
1. Identifier ce qui prend de la place : `du -sh /var/log/* /var/lib/postgresql/* ~/.pm2/logs/* /tmp/*`
2. Rotation logs PM2 : `pm2 flush` (vide les logs courants)
3. Vider `/tmp` si volumineux : `rm -rf /tmp/*`
4. Nettoyer les vieux logs système : `journalctl --vacuum-size=200M`
5. Compresser ou purger les exports anciens (dossier MinIO local si applicable)
6. Si problème récurrent : augmenter la taille du volume ou configurer logrotate plus agressif

---

### Incident 5 — File de jobs BullMQ bloquée (> 20 failed)

**Symptômes** : emails transactionnels non envoyés, produits non indexés dans MeiliSearch.

**Étapes** :
1. Ouvrir Bull Board : `https://api.iox.example/admin/queues` (JWT ADMIN requis)
2. Identifier la queue en erreur (`iox.email` ou `iox.search`)
3. Lire les messages d'erreur des jobs failed
4. Causes fréquentes :
   - `iox.email` : SMTP down ou `RESEND_API_KEY` expiré → vérifier les credentials mail
   - `iox.search` : MeiliSearch down → `curl http://localhost:7700/health`
5. Corriger la cause, puis dans Bull Board : **Retry All** sur les jobs failed
6. Si MeiliSearch crash : `docker restart iox_meilisearch` (ou `pm2 restart meilisearch` selon le setup)
7. Surveiller que la queue se vide dans les minutes suivantes

---

## Notes de maintenance

- **METRICS_TOKEN** : si non défini, l'endpoint `/api/v1/metrics` est public — en réseau privé c'est acceptable, en exposition publique le configurer via `METRICS_TOKEN` dans `.env`.
- **IOX_OPS_METRICS_INTERVAL_MS** : défaut 60 000 ms. Ne pas descendre sous 10 000 ms (protection contre le hammering Postgres).
- **Bull Board** : accessible uniquement avec un JWT ADMIN valide (durée 15 min par défaut) — ne pas l'exposer publiquement.
- **Swagger** : désactivé en `production` (cf. `main.ts`). Disponible en staging sur `/api/docs`.
