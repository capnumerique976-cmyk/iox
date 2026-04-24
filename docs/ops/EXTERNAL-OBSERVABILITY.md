# IOX — Observabilité externe (architecture cible)

> Phase exploitation : brancher la plateforme IOX sur un pipeline
> logs + métriques + alertes. Les configs de référence vivent dans
> `ops/` et sont prêtes à être adaptées à n'importe quelle infra
> (Docker, Kubernetes, VM classiques).

---

## 1. Architecture cible

```
┌──────────────────────────────────────────────────────────────────────┐
│                        IOX Backend (NestJS)                          │
│                                                                      │
│  RequestIdMiddleware → LoggingInterceptor → HttpExceptionFilter      │
│                       (logs JSON + requestId)                        │
│                                                                      │
│  MetricsInterceptor → /api/v1/metrics (Prometheus v0.0.4)            │
│     ├─ iox_http_requests_total{method,status,route}                  │
│     ├─ iox_http_duration_seconds_bucket                              │
│     ├─ iox_process_* (uptime, memory)                                │
│     └─ iox_marketplace_* (gauges alimentées par OpsMetricsService)   │
│                                                                      │
│  HealthModule → /api/v1/health, /health/ready, /health/live          │
│              → /api/v1/health/ops (staff-only, JSON)                 │
└─────────────────┬────────────────────────┬───────────────────────────┘
                  │                        │
                  │ stdout (JSON Nest)     │ HTTP scrape
                  ▼                        ▼
          ┌───────────────┐       ┌──────────────────┐
          │   Promtail    │       │   Prometheus     │
          │   (DaemonSet) │       │   (scrape 30s)   │
          └───────┬───────┘       │                  │
                  │ push          │  rule_files:     │
                  ▼               │   iox-alerts.yml │
             ┌─────────┐          └────────┬─────────┘
             │  Loki   │                   │
             └────┬────┘                   │ alerts
                  │                        ▼
                  │              ┌──────────────────┐
                  │              │  Alertmanager    │
                  │              │                  │
                  │              │  routes:         │
                  │              │   critical→pager │
                  │              │   warning→slack  │
                  │              │   info→digest    │
                  │              └────┬─────────────┘
                  ▼                   │
             ┌─────────────────┐      │
             │     Grafana     │◀─────┘
             │                 │
             │ Dashboards :    │
             │  - overview     │  Explore Loki → corrélation Request ID
             │  - marketplace  │  Explore Prom → SLO temps réel
             └─────────────────┘
```

**Alternative Datadog :** un seul agent (`datadog-agent`) remplace
Promtail + Prometheus + Alertmanager. Voir `ops/datadog/datadog-agent.yaml`.

---

## 2. Fichiers livrés dans `ops/`

```
ops/
├── prometheus/
│   ├── prometheus.yml                  # scrape config + external_labels
│   └── rules/
│       └── iox-alerts.yml              # 4 groupes, 13 règles d'alerte
├── alertmanager/
│   └── alertmanager.yml                # routing critical/warning/info
├── loki/
│   ├── promtail-config.yml             # pipeline Docker → Loki avec extract JSON
│   └── logql-queries.md                # requêtes prêtes à copier
├── datadog/
│   └── datadog-agent.yaml              # alternative Datadog
└── grafana/
    └── dashboards/
        ├── iox-overview.json           # SLO backend (HTTP + process)
        └── iox-marketplace-ops.json    # KPI marketplace temps réel
```

Ces fichiers ne sont **pas exécutés par le repo** — ils servent de source
de vérité pour la config infra (GitOps / Ansible / Helm values). Les
secrets (`METRICS_TOKEN`, Slack webhooks, API keys) sont volontairement
référencés par _file_ plutôt que par valeur.

---

## 3. Métriques exposées

### SLO technique (déjà existantes, enrichies)

| Métrique | Type | Labels | Usage |
|---|---|---|---|
| `iox_process_uptime_seconds` | gauge | — | crash loop detection |
| `iox_process_memory_rss_bytes` | gauge | — | fuite mémoire |
| `iox_process_memory_heap_used_bytes` | gauge | — | pression heap V8 |
| `iox_http_requests_total` | counter | method, status, route | volume + ratio 5xx |
| `iox_http_duration_seconds_bucket` | histogram | method, route, le | latence p50/p95/p99 |

### SLO métier (nouvelles, via `OpsMetricsService`)

| Métrique | Type | Labels | Source Prisma |
|---|---|---|---|
| `iox_marketplace_sellers_total` | gauge | — | `sellerProfile.count()` |
| `iox_marketplace_sellers_by_status` | gauge | `status` (pending_review/approved/suspended) | `sellerProfile.count({where:{status}})` |
| `iox_marketplace_publications` | gauge | `entity` (product/offer), `status` (published/in_review) | `marketplaceProduct.count()`, `marketplaceOffer.count()` |
| `iox_marketplace_review_pending` | gauge | — | `marketplaceReviewQueue.count({where:{status:PENDING}})` |
| `iox_marketplace_documents` | gauge | `verification_status` (pending/rejected) | `marketplaceDocument.count()` |
| `iox_marketplace_rfq` | gauge | `status` (new/negotiating) | `quoteRequest.count()` |
| `iox_marketplace_metrics_last_refresh_seconds` | gauge | — | `time()` côté backend au dernier tick |

**Cadence** : `OpsMetricsService` exécute 13 `count()` Prisma en parallèle
toutes les 60 s (override via `IOX_OPS_METRICS_INTERVAL_MS`, min 10 s).

**Fail-safe** : si le tick échoue (exception Prisma), les dernières valeurs
sont conservées dans le registre interne et un warn est loggué (filtrable
dans Loki : `{app="iox-backend"} |= "Ops metrics tick failed"`).

**Cohérence avec `/health/ops`** : les deux sources exposent les **mêmes
compteurs**. `/health/ops` reste l'endpoint staff pour consultation ad-hoc
(admin diagnostics page), tandis que `/metrics` est l'entrée Prometheus.

---

## 4. Règles d'alerte proposées

### Groupe 1 — santé service (SLO technique)
- `IoxBackendDown` : `up == 0` pendant 2 min → critical
- `IoxReadinessFailing` : `probe_success == 0` pendant 3 min → critical
- `IoxProcessCrashLoop` : uptime < 120 s pendant 10 min → warning
- `IoxMemoryHigh` : RSS > 1.5 Go pendant 15 min → warning

### Groupe 2 — qualité HTTP (SLO trafic)
- `IoxHttp5xxRateHigh` : ratio 5xx > 1 % pendant 5 min → warning
- `IoxHttp5xxRateCritical` : ratio 5xx > 5 % pendant 2 min → critical
- `IoxHttpLatencyP95High` : p95 > 800 ms pendant 10 min → warning
- `IoxHttp4xxAuthBurst` : > 5 req/s de 401 pendant 10 min → warning

### Groupe 3 — exploitation marketplace (SLO métier)
- `IoxMarketplaceMetricsStale` : refresh > 5 min → warning (feedback loop)
- `IoxReviewQueueBacklog` : `review_pending > 20` pendant 30 min → warning
- `IoxReviewQueueCritical` : `review_pending > 50` pendant 15 min → critical
- `IoxDocumentsRejectedPresent` : > 0 depuis 1 h → info (digest)
- `IoxSellersSuspendedSpike` : `increase > 2` en 1 h → warning
- `IoxRfqBacklogNew` : > 10 RFQ NEW pendant 2 h → warning

### Groupe 4 — sécurité (signaux faibles)
- `IoxForbiddenBurst` : > 2 req/s de 403 pendant 15 min → info

Chaque règle référence un runbook via l'annotation `runbook` :
`docs/ops/RUNBOOKS.md#rb-0x`. Alertmanager les propage aux canaux via
inhibition (une alerte critical sur un service masque les warnings du
même service) et groupement (`alertname`, `service`).

---

## 5. Cohérence avec l'existant

| Composant | Lien avec observabilité externe |
|---|---|
| **Request ID** (middleware/interceptor/filter/ApiError/ErrorState) | Un utilisateur copie `#XXXXXXXX` depuis le front → LogQL `{app="iox-backend"} \|= "<req-id>"` remonte toutes les lignes, stack trace incluse. |
| **`/health/ops`** (staff) | Mêmes chiffres que les gauges `iox_marketplace_*`. Un staff peut checker en un clic depuis `/admin/diagnostics` ce que Prometheus verra à son prochain scrape. |
| **Admin diagnostics page** | Panneau live alimenté par `/health` + `/health/ops`. En cas d'alerte Prometheus, l'ops ouvre cette page pour vérifier côté UI. |
| **Runbooks** | Annotations `runbook` sur chaque règle d'alerte renvoient vers la procédure (`docs/ops/RUNBOOKS.md`). Pas de "quelle procédure suivre ?" — c'est dans l'alerte. |
| **`/metrics` Prometheus** | Enrichi par `OpsMetricsService` sans modifier le contrat d'endpoint : les gauges `iox_marketplace_*` sont additives, les scrapers existants ne cassent pas. |
| **`docs/OBSERVABILITY.md`** | Source baseline (process + HTTP). Ce document est **complémentaire** : il couvre l'intégration externe. Pas de contenu dupliqué. |

---

## 6. Checklist déploiement

### Pré-requis
- [ ] Générer `METRICS_TOKEN` (`openssl rand -hex 32`) et le distribuer
      à Prometheus (via secret file).
- [ ] Si Loki : déployer Promtail avec les labels Docker attendus
      (`com.iox.service=backend`, `com.iox.env=preprod`).
- [ ] Si Datadog : créer API key dédiée `iox-backend`.
- [ ] Créer les secrets Alertmanager (Slack webhooks, SMTP creds,
      éventuellement PagerDuty routing key).

### Déploiement
- [ ] Copier `ops/prometheus/*` dans le volume Prometheus.
- [ ] Recharger Prometheus (`SIGHUP` ou `kubectl rollout restart`).
- [ ] Vérifier l'expression `up{job="iox-backend"}` = 1.
- [ ] Vérifier qu'au moins une série `iox_marketplace_*` est présente
      (après ~90 s de run du backend).
- [ ] Importer les deux dashboards JSON dans Grafana.
- [ ] Déployer `ops/alertmanager/alertmanager.yml`.
- [ ] Déclencher une alerte de test (`amtool` ou mute/unmute manuel).

### Validation
- [ ] Générer 10 x 500 via un `curl` vers un endpoint buggé → vérifier
      que `IoxHttp5xxRateHigh` déclenche au bout de 5 min.
- [ ] Stopper le process backend → vérifier que `IoxBackendDown`
      déclenche au bout de 2 min.
- [ ] Suspendre manuellement 3 sellers en 1 h (test staging) → vérifier
      `IoxSellersSuspendedSpike`.

---

## 7. Points restants avant exploitation réelle complète

1. **Choisir la stack finale** (Loki+Prom vs Datadog). Les deux configs
   sont fournies ; la décision dépend du coût / skill interne /
   intégration existante avec l'infra IOX.
2. **Provisionner une instance réelle** (Grafana Cloud, self-hosted
   Loki+Prom, compte Datadog) et brancher.
3. **Calibrer les seuils** après 2 semaines de trafic réel — les
   valeurs actuelles sont des points de départ raisonnables mais
   n'ont pas été validées sur volume de prod.
4. **Configurer les canaux d'alertes** (Slack workspaces, rotations
   on-call PagerDuty/Opsgenie).
5. **Ajouter le tracing distribué** (OpenTelemetry / Tempo) quand un
   second service s'ajoutera à la plateforme. Tant qu'il n'y a qu'un
   backend, les logs JSON + `requestId` suffisent à remonter toute la
   chaîne.
6. **Durcir la propagation `x-request-id`** : actuellement émis en
   réponse ; à vérifier qu'un reverse-proxy en amont (nginx, Traefik)
   ne l'écrase pas.
7. **Rétention** : définir TTL logs (30 j) + TTL métriques (90 j) selon
   la politique SOC / contraintes CNIL.
