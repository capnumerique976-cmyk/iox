# IOX — Corrélation Request ID (guide exploitation)

> Complément opérationnel à `docs/OBSERVABILITY.md` : comment tracer une
> plainte utilisateur jusqu'au log backend en 30 secondes.

---

## 1. Flux complet

```
Client HTTP
   │
   │ (1) En-tête `x-request-id` si présent, sinon vide
   ▼
RequestIdMiddleware (src/common/middleware/request-id.middleware.ts)
   │   → attache `req.requestId` (uuid si absent)
   │   → réémet `res.setHeader('x-request-id', id)`
   ▼
LoggingInterceptor (src/common/interceptors/logging.interceptor.ts)
   │   → log JSON structuré `{ requestId, method, url, status, durMs }`
   ▼
Controllers / Services
   │   (logs applicatifs préfixés `[<req-id>]` par convention)
   ▼
HttpExceptionFilter (src/common/filters/http-exception.filter.ts)
   │   → en cas d'erreur : `requestId` injecté dans le body
   │     `{ success: false, error: {...}, requestId, timestamp }`
   ▼
Client HTTP (browser IOX front)
   │
   │ ApiError (src/lib/api.ts) capte :
   │   - `response.headers['x-request-id']`
   │   - OU `body.requestId` (fallback)
   ▼
<ErrorState requestId={err.requestId} code={err.code} />
   (badge `#XXXXXXXX` cliquable, copie dans presse-papier)
```

## 2. Support L1 — chercher un incident

**Étape 1.** Récupérer le Request ID auprès de l'utilisateur (bouton
copier dans le bandeau d'erreur, ou en-tête HTTP `x-request-id` depuis les
devtools réseau).

**Étape 2.** Ouvrir l'agrégateur de logs :

```logql
# Loki
{app="iox-backend"} |= "<req-id>"

# Datadog
service:iox-backend @requestId:<req-id>

# Local (dev)
tail -f apps/backend/logs/app.log | grep "<req-id>"
```

**Étape 3.** Le flux attendu pour une requête saine :
```
[REQ-ID] GET /api/v1/quote-requests?status=NEW → 200 12ms
```

Pour une erreur :
```
[REQ-ID] Erreur non gérée: <message>   <stack>
[REQ-ID] GET /api/v1/… → 500 INTERNAL_SERVER_ERROR
```

## 3. Niveaux de log attendus

| Niveau | Usage | Exemple |
|---|---|---|
| `log`/`info` | Requête OK (interceptor) | `GET /health 200 3ms` |
| `warn` | Erreur HTTP 4xx (filter) | `… → 403 FORBIDDEN` |
| `error` | Exception non gérée (filter) | `Erreur non gérée: Cannot read …` |

## 4. Extensions futures (non bloquantes)

- Propager `x-request-id` vers la DB via `SET application_name` ou
  commentaire SQL Prisma (`pg_stat_activity` recherchable).
- Sampling traces OpenTelemetry avec `trace_id = request_id` pour
  alimenter Tempo/Jaeger.
- Indexer `requestId` dans Datadog (facet) pour filtrer en 1 clic.

## 5. Invariants à ne pas casser

1. **Ne jamais supprimer `RequestIdMiddleware`** du pipeline : sans lui,
   plus aucune corrélation possible.
2. **Toujours relancer le header `x-request-id` en réponse** (autorise
   les proxies / clients à le logger).
3. **Ne pas inclure de PII dans le log interceptor** (pas de body, pas
   de query sensible). Le `requestId` + URL suffisent pour corréler.
