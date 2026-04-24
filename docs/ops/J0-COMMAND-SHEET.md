# IOX — J0 Command Sheet

_Une page. Ordre strict. Ne pas sauter d'étape._
_Détails : [`PROD-GOLIVE-OPERATOR.md`](./PROD-GOLIVE-OPERATOR.md) · runbooks : [`RUNBOOKS.md`](./RUNBOOKS.md) · rollback : [`ROLLBACK.md`](./ROLLBACK.md)_

## 1 · Séquence

```bash
cd ~/Documents/Claude/Projects/MMD/iox

# [1] Pré-flight local — stop si KO
(cd apps/backend  && npx tsc --noEmit && npx jest --silent) \
&& (cd apps/frontend && npx tsc --noEmit && npx vitest run && npx next build) \
&& node scripts/validate-ops-configs.mjs

# [2] Backup pré-bascule — OBLIGATOIRE
./deploy/vps/backup.sh

# [3] Snapshot rollback
ssh rahiss-vps 'docker tag iox-frontend:local iox-frontend:prev && \
                docker tag iox-backend:local  iox-backend:prev'

# [4] Déploiement (choisir UN)
./deploy/vps/deploy.sh frontend      # cas standard
./deploy/vps/deploy.sh backend       # si changement API/DB
./deploy/vps/deploy.sh all           # full stack

# [5] Smoke métier dans le navigateur → https://iox.mycloud.yt/
#     login → beneficiary → batch → decision → upload doc → logout
```

## 2 · Checks critiques (tous doivent passer)

```bash
# Santé + 5xx + refresh gauges
ssh rahiss-vps '
  curl -sf http://127.0.0.1:3001/api/v1/health     >/dev/null && echo "health   OK"
  curl -sf http://127.0.0.1:3001/api/v1/health/live>/dev/null && echo "live     OK"
  n=$(docker logs iox_backend --since 5m 2>&1 | grep -c " 5[0-9][0-9] ")
  echo "5xx/5min = $n  (attendu 0)"
'
curl -skfI https://iox.mycloud.yt/       | head -1   # 307
curl -skfI https://iox.mycloud.yt/login  | head -1   # 200
curl -skf  https://iox.mycloud.yt/api/v1/health      # success:true
```

## 3 · Décision GO / NO-GO

| Condition                                                    | GO | NO-GO |
| ------------------------------------------------------------ | -- | ----- |
| `deploy.sh` exit 0 + 4/4 healthchecks verts                  | ✅ | —     |
| Smoke M1 login + M3 bénéficiaire + M4 lot + M8 upload OK     | ✅ | —     |
| `/api/v1/health` = 200, `/live` = 200, 5xx/5min = 0          | ✅ | —     |
| Logs backend : aucune `P1001`/`P2024`/crash-loop             | ✅ | —     |
| Rate 5xx > 0.1 req/s sur 5 min                               | —  | ❌    |
| Healthcheck HTTPS ≠ 200/307                                  | —  | ❌    |
| Un smoke critique (M1/M3/M4/M8/M10) KO                       | —  | ❌    |

**GO** ⇒ phase 6 (cron backup, archivage tag horodaté) — voir [`PROD-GOLIVE-OPERATOR.md §7,§10`](./PROD-GOLIVE-OPERATOR.md).
**NO-GO** ⇒ rollback immédiat ↓.

## 4 · Rollback (≤ 5 s)

```bash
# Applicatif (images)
./deploy/vps/rollback.sh frontend        # ou backend / all

# DB (si migration incompatible) — DESTRUCTIF, confirmer "YES"
./deploy/vps/restore.sh /opt/apps/iox/backups/postgres/iox-STAMP.dump
ssh rahiss-vps 'cd /opt/apps/iox && docker compose -f docker-compose.vps.yml restart backend'
```

Vérifier : `curl -skf https://iox.mycloud.yt/api/v1/health` → 200.
Annoncer le rollback sur le canal d'incident. Postmortem ensuite.

## 5 · À ne JAMAIS faire

- `docker compose down` sur le VPS (utiliser `up -d --no-deps`, géré par `deploy.sh`)
- Supprimer les volumes `postgres_data` / `minio_data`
- Committer `.env.vps*` ou un `*.dump`
- `docker image prune` agressif (détruit le tag `:prev`)
- Skipper le backup [2] avant un déploiement backend

## 6 · Liens

- Opérateur détaillé : [`PROD-GOLIVE-OPERATOR.md`](./PROD-GOLIVE-OPERATOR.md)
- Runbooks incidents : [`RUNBOOKS.md`](./RUNBOOKS.md)
- Rollback approfondi : [`ROLLBACK.md`](./ROLLBACK.md)
- Backup / DR : [`BACKUP.md`](./BACKUP.md)
- Audit réel VPS : [`../deploy/VPS-DEPLOY-AUDIT.md`](../deploy/VPS-DEPLOY-AUDIT.md)
- Corrélation Request ID : [`CORRELATION.md`](./CORRELATION.md)
