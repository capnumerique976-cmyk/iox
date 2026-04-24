# IOX — Observabilité

Baseline minimal pour la préprod : métriques Prometheus + healthchecks Terminus.
Pas de dépendance lourde (pas de `prom-client`, pas d'OpenTelemetry) tant que le
besoin ne le justifie pas.

---

## 1. Endpoint `/api/v1/metrics`

Format Prometheus texte (exposition v0.0.4). Exemples de métriques exposées :

- `iox_process_uptime_seconds` _(gauge)_ — uptime du process backend
- `iox_process_memory_rss_bytes` / `iox_process_memory_heap_used_bytes` _(gauge)_
- `iox_http_requests_total{method,status,route}` _(counter)_ — requêtes HTTP
- `iox_http_duration_seconds_bucket{method,route,le}` _(histogram)_ — latence

### Protection

Optionnelle, via variable d'env `METRICS_TOKEN` :

```bash
# .env.preprod
METRICS_TOKEN=un-secret-fort-généré-par-openssl-rand-hex-24
```

Scrape Prometheus :

```yaml
scrape_configs:
  - job_name: iox-backend
    metrics_path: /api/v1/metrics
    static_configs:
      - targets: ['iox-backend:3001']
    authorization:
      type: Bearer
      credentials: <METRICS_TOKEN>
```

Si `METRICS_TOKEN` n'est pas défini, l'endpoint est **public** — à réserver aux
réseaux privés (mesh k8s, VPC interne).

---

## 2. Healthchecks Terminus

- `GET /api/v1/health/live` — liveness, retourne `{ status, uptime }` sans dépendance.
- `GET /api/v1/health` — readiness, vérifie Postgres via Prisma ping + config MinIO.

Utilisables directement en probes Kubernetes :

```yaml
livenessProbe:
  httpGet: { path: /api/v1/health/live, port: 3001 }
  initialDelaySeconds: 15
  periodSeconds: 30
readinessProbe:
  httpGet: { path: /api/v1/health, port: 3001 }
  initialDelaySeconds: 10
  periodSeconds: 15
```

---

## 3. Logs

Aujourd'hui : logs Nest (console, niveau configurable). Les request IDs
(`RequestIdMiddleware`) permettent de corréler les lignes d'une même requête.

**À brancher côté infra** (hors dépôt) :

- Collecte Loki / Promtail ou agent CloudWatch
- Alertes sur `level=error` + taux de 5xx > seuil

---

## 4. Alertes recommandées (PromQL)

```promql
# Taux d'erreurs 5xx > 1 %
sum(rate(iox_http_requests_total{status=~"5.."}[5m]))
  /
sum(rate(iox_http_requests_total[5m])) > 0.01

# Latence p95 > 500 ms sur 5 min
histogram_quantile(
  0.95,
  sum by (le) (rate(iox_http_duration_seconds_bucket[5m]))
) > 0.5

# Process redémarré (uptime < 60s pendant plus de 1 min → crash loop)
iox_process_uptime_seconds < 60
```

---

## 5. Quand passer à OpenTelemetry ?

Basculer sur `@opentelemetry/sdk-node` + OTLP dès que l'une de ces conditions
est remplie :

- Besoin de tracing distribué (traces corrélées frontend ↔ backend ↔ Postgres).
- Plusieurs services à corréler dans un même request path.
- Export vers un backend OTLP-native (Tempo, Honeycomb, Datadog).

Le remplacement est mécanique : `MetricsModule` expose un service ciblé,
les noms de métriques `iox_*` sont déjà compatibles Prometheus. L'interceptor
peut être réécrit autour d'un `Tracer` OpenTelemetry sans changer les routes.
