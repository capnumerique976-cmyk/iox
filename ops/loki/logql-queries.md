# IOX — Requêtes LogQL utiles

Requêtes prêtes à copier dans Grafana Explore (datasource Loki) ou dans
un dashboard. Toutes s'appuient sur le pipeline Promtail fourni dans
`ops/loki/promtail-config.yml`.

## Corrélation par Request ID

```logql
# Toutes les lignes d'une requête donnée
{app="iox-backend"} |= "req-abc-123"

# Toutes les lignes d'une requête via extraction JSON
{app="iox-backend"} | json | requestId="req-abc-123"
```

## Erreurs 5xx des 15 dernières minutes

```logql
{app="iox-backend", level="ERROR"}
  | json
  | status >= 500
  | line_format "[{{.requestId}}] {{.method}} {{.url}} → {{.status}} ({{.durationMs}}ms) {{.error}}"
```

## Top 10 des routes les plus lentes (p95)

```logql
topk(10,
  quantile_over_time(0.95,
    {app="iox-backend"} | json | unwrap durationMs [10m]
  ) by (url)
)
```

## Taux de 4xx par route (volume + ratio)

```logql
# Volume
sum by (url) (
  rate({app="iox-backend"} | json | status=~"4.." [5m])
)

# Ratio sur total
sum by (url) (rate({app="iox-backend"} | json | status=~"4.." [5m]))
  /
sum by (url) (rate({app="iox-backend"} | json [5m]))
```

## Utilisateurs qui rencontrent le plus d'erreurs

```logql
topk(10,
  sum by (userId) (
    count_over_time({app="iox-backend"} | json | status >= 400 [1h])
  )
)
```

## Sécurité — 401 burst

```logql
sum(rate({app="iox-backend"} | json | status="401" [5m]))
```

## Ops metrics tick failures

```logql
{app="iox-backend"} |= "Ops metrics tick failed"
```

## Exceptions non gérées (avec stack trace)

```logql
{app="iox-backend", level="ERROR"} |= "Erreur non gérée"
```

---

## Recettes pratiques

### De la plainte utilisateur au stack trace en 4 étapes

1. L'utilisateur envoie le Request ID copié depuis le badge `#XXXXXXXX`
   (ErrorState front).
2. Dans Grafana Explore (Loki) :
   ```logql
   {app="iox-backend"} |= "<request-id>"
   ```
3. Le `HttpExceptionFilter` log une ligne `ERROR` préfixée `[<req-id>]` avec
   le message + stack. Cliquer sur cette ligne → panneau détails.
4. Si la stack pointe sur une query Prisma, croiser avec
   `{app="iox-backend"} |= "prisma"` sur la même fenêtre ± 30 s.

### Suivre l'impact d'un rollback

Quand on suspecte une régression :
```logql
sum by (status) (
  rate({app="iox-backend"} | json | status=~"[45].." [2m])
)
```
Le split par status (4xx vs 5xx) permet de distinguer un bug métier
(validations 400) d'un bug code (500).
