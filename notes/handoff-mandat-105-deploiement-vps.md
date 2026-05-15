# Handoff — Mandat 105 : Déploiement VPS pilote fermé (cohabitation)

**Date** : 2026-05-15
**Branche** : main
**Commit local** : `fa70137` (M104 — daily actions enrichies)
**Commit VPS avant déploiement** : ~May 11 (M101/mobile nav initial, avant M102/M103/M104)
**Domaine** : iox.mycloud.yt

---

## Partie A — Audit local

### État branche

```
Branche : main (propre, rien à committer)
Commit  : fa70137 docs: handoff M104
          05cd768 feat: M104 daily actions newMessages + pendingPayment
          e11c4d0 docs: M103
          6916982 feat: M103 DailyActionsPanel
          4c2018c docs: M102
          f6a630d feat: M102 navigation mobile 4 tabs + admin bottom nav
```

### Tests locaux

```
pnpm --filter @iox/frontend test  → 116/116 ✓
pnpm --filter @iox/frontend exec tsc --noEmit → 0 erreurs ✓
```

Backend : pas de changement depuis le dernier déploiement VPS. DB : up to date (18 migrations, aucune en attente).

### Changements à déployer (frontend uniquement)

| Mandat | Fichiers impactés |
|---|---|
| M102 | `components/layout/nav-config.ts`, `mobile-nav-config.ts`, `mobile-bottom-nav.tsx` |
| M103 | `lib/daily-actions.ts`, `components/dashboard/daily-actions-panel.tsx`, pages seller/buyer/admin |
| M104 | `lib/daily-actions.ts`, `app/(dashboard)/seller/dashboard/page.tsx`, `app/(dashboard)/buyer/page.tsx` |

---

## Partie B — Audit VPS

### Ressources

| Ressource | État |
|---|---|
| Disque | 304 GB libres / 387 GB (22% utilisé) ✅ |
| RAM | 25 GB disponibles / 31 GB ✅ |
| Swap | 4 GB, presque vide ✅ |
| Load | 0.15/0.37/0.27 (très faible) ✅ |
| Uptime | 3 jours 14h ✅ |

### Containers en cours sur rahiss-vps

**IOX** (tous sains) :
| Container | Image | Status |
|---|---|---|
| iox_backend | iox-backend:local | Up 3 days (healthy) |
| iox_frontend | iox-frontend:local | Up 3 days (healthy) |
| iox_postgres | postgres:15-alpine | Up 3 days (healthy) |
| iox_redis | redis:7-alpine | Up 3 days (healthy) |
| iox_minio | minio/minio:latest | Up 3 days (healthy) |
| iox_meilisearch | getmeili/meilisearch:v1.7 | Up 3 days (healthy) |

**Cohabitants** (ne pas toucher) :
- Telemante : ~15 containers (frontend, backend, postgres, redis, minio, meilisearch, keycloak, nginx, streaming, monitoring stack)
- Agora : ~10 containers (web, api, postgres, redis, minio, workers, jitsi stack)
- Vavo-staging : 1 container (port 3010)

**Aucun conflit de port** :
- IOX : 127.0.0.1:3000 (frontend), 127.0.0.1:3001 (backend)
- Telemante : 127.0.0.1:3080, 8080, 9000-9001
- Agora : 127.0.0.1:3050, 4050, 9002
- Vavo : 127.0.0.1:3010

### Nginx

- `iox.mycloud.yt.conf` : activé, SSL via Certbot, proxy 3000/3001 ✅
- **⚠ `client_max_body_size 25m`** → à passer à 60m (M101 supporte vidéos 50m) — fix inclus dans ce déploiement

### Volumes Docker IOX

Tous préfixés `iox_` — isolation totale des autres stacks :
`iox_meilisearch_data`, `iox_minio_data`, `iox_postgres_data`, `iox_redis_data`

### État DB

```
18 migrations — Database schema is up to date!
```
Aucune migration à appliquer (M102/M103/M104 = pure frontend).

### Healthchecks pré-déploiement

```
GET /api/v1/health      → {"status":"ok","database":"up","storage":"up"} ✓
GET /api/v1/health/live → {"status":"ok","uptime":310260} ✓
GET https://iox.mycloud.yt/ → 307 (redirect vers HTTPS) ✓
```

Logs backend : trafic réel actif (users se connectent, dashboard/alerts toutes les ~60s).

---

## Risques

| Risque | Probabilité | Mitigation |
|---|---|---|
| Build frontend échoue (pnpm/Next.js) | Faible — tests passent, TS clean | Rollback : `./deploy/vps/rollback.sh frontend` (iox-frontend:prev) |
| DB migration rate conditionnelle (M102/M103/M104 = 0 migration) | Néant | N/A |
| Nginx reload échoue après `client_max_body_size` fix | Très faible — changement 1 ligne | `nginx -t` avant reload, revert si erreur |
| Timeout build Docker (image full rebuild) | Faible (304 GB, 25 GB RAM) | Déjà buildé une fois — cache Docker disponible |
| Interruption service pendant `up -d --no-deps` | ~5-10 secondes frontend | Acceptable en pilote fermé hors heures peak |
| Telemante/Agora touchés | Nul | `--no-deps` + réseau iox_net isolé |

---

## Plan retenu

### Action 1 — Fix nginx (pré-déploiement)

```bash
# Corriger client_max_body_size dans iox.mycloud.yt.conf
ssh rahiss-vps "sed -i 's/client_max_body_size 25m/client_max_body_size 60m/' \
  /etc/nginx/sites-enabled/iox.mycloud.yt.conf \
  && nginx -t && nginx -s reload"
```

### Action 2 — Déploiement frontend

```bash
# Frontend seulement (M102/M103/M104 = frontend uniquement, backend inchangé)
./deploy/vps/deploy.sh frontend
```

Séquence interne du script :
1. Vérif SSH + espace disque
2. rsync code local → /opt/apps/iox/ (exclut .env, docker-compose.vps*.yml, .git...)
3. Tag iox-frontend:local → iox-frontend:prev
4. docker compose build frontend (rebuild image)
5. docker compose up -d --no-deps frontend (restart frontend seul)
6. Healthchecks : /, /login, /api/v1/health, /api/v1/health/live

### Rollback si échec

```bash
./deploy/vps/rollback.sh frontend   # restaure iox-frontend:prev en ~5s
# OU manuellement :
ssh rahiss-vps "docker tag iox-frontend:prev iox-frontend:local \
  && docker compose -f /opt/apps/iox/docker-compose.vps.yml up -d --no-deps frontend"
```

---

## Critères de succès post-déploiement

- [ ] `iox_frontend` Up (healthy) dans `docker ps`
- [ ] `https://iox.mycloud.yt/` → 307 ou 200
- [ ] `https://iox.mycloud.yt/api/v1/health` → `{"status":"ok"}`
- [ ] `https://iox.mycloud.yt/login` → 200
- [ ] Aucun container telemante_*, agora_* perturbé

---

## Observations post-déploiement

**Exécuté le** : 2026-05-15T16:44:55Z

- **Commit déployé** : `fa70137` (M104, main)
- **Durée build frontend** : ~87s (Next.js build dans Docker)
- **Nginx fix** : `client_max_body_size 25m → 60m` ✓ (reload OK, warnings vavo/vod pre-existants ignorés)
- **Healthchecks post-déploiement** :
  - `HTTPS /` → 307 ✓
  - `HTTPS /login` → 200 ✓
  - `API /api/v1/health` → 200 ✓
  - `API /api/v1/health/live` → 200 ✓
- **Cohabitants** : 0 perturbation — telemante_*, agora_*, vavo_* tous Up 3 days inchangés
- **Incidents** : aucun
