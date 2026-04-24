# IOX — Mise en production VPS · checklist exécutable opérateur

> Document orienté **exécution** : à lire en séquence, le jour J, devant le
> terminal. Chaque étape = une action, une commande, un critère binaire.
>
> Synthèse des docs déjà produites :
> `GO-LIVE-CHECKLIST.md`, `DEPLOY-VPS.md`, `BACKUP.md`, `ROLLBACK.md`,
> `PRE-DEPLOY.md`, `RUNBOOKS.md`, `VPS-DEPLOY-AUDIT.md`.
>
> **Légende** : 🔴 bloquant · 🟡 manuel · 🟢 automatisé · ⚪ recommandé.
>
> **Durée cible** : 60–90 min (hors DR drill).

---

## 0. Pré-requis one-shot (J-3 → J-1)

À valider **avant** d'ouvrir la fenêtre de déploiement. Ne pas démarrer
la phase 1 si un seul 🔴 manque.

| #  | Action                                                                    | Vérif                                                                          | Type |
| -- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---- |
| P1 | VPS `rahiss-vps` (Ubuntu 24.04, Docker ≥ 24, Compose v2, nginx, Let's Encrypt) | `ssh rahiss-vps 'docker compose version && nginx -v'`                      | 🔴   |
| P2 | SSH clé fonctionnelle vers `rahiss-vps` (user `deploy`)                   | `ssh -o BatchMode=yes rahiss-vps true && echo OK`                              | 🔴   |
| P3 | Disque VPS ≥ 3 GB libres                                                  | `ssh rahiss-vps 'df -BG /opt/apps/iox \| tail -1'`                             | 🔴   |
| P4 | DNS `iox.mycloud.yt` → IP VPS, TTL ≤ 300                                  | `dig +short iox.mycloud.yt`                                                    | 🔴   |
| P5 | TLS actif (certbot)                                                       | `curl -skfI https://iox.mycloud.yt/ \| grep -i strict-transport-security`      | 🔴   |
| P6 | `/opt/apps/iox/.env` présent, 5 secrets renseignés                        | `ssh rahiss-vps 'sudo -u deploy grep -c "^[A-Z_]*=." /opt/apps/iox/.env'` ≥ 10 | 🔴   |
| P7 | `docker-compose.vps.yml` présent sur le VPS                               | `ssh rahiss-vps 'test -f /opt/apps/iox/docker-compose.vps.yml && echo OK'`     | 🔴   |
| P8 | Image `iox-*:local` courante présente (rollback n-1 possible)             | `ssh rahiss-vps 'docker images \| grep iox-'`                                  | 🟡   |
| P9 | Fenêtre communiquée (Slack / email interne)                               | —                                                                              | ⚪   |
| P10| Tests locaux verts (backend + frontend)                                   | voir phase 1                                                                   | 🔴   |

---

## 1. Pré-flight local (J0 − 10 min)

À exécuter depuis le poste opérateur, dans le repo.

```bash
cd /Users/ahmedabdoullahi/Documents/Claude/Projects/MMD/iox

# 1.1 · Backend : typecheck + tests
cd apps/backend && npx tsc --noEmit && npx jest --silent && cd -
# Attendu : Tests: 387 passed (ou plus)

# 1.2 · Frontend : typecheck + tests + build
cd apps/frontend && npx tsc --noEmit && npx vitest run && npx next build && cd -
# Attendu : Tests 54 passed, next build 41 routes OK

# 1.3 · Validation configs ops + scripts bash
node scripts/validate-ops-configs.mjs
# Attendu : 7/7 fichiers valides + 4/4 scripts sh OK

# 1.4 · Preflight env (simule l'environnement cible)
set -a && . deploy/preprod/.env.preprod.example && set +a
APP_ENV=staging NODE_ENV=production node scripts/preflight.mjs
# Attendu : exit 0 (si KO, lire les erreurs et corriger avant)
```

**Stop 🔴 si** : un seul `exit ≠ 0`.

---

## 2. Backup pré-bascule (J0)

**Impératif** avant toute modification prod. Si la phase 4 casse, on
pourra restaurer.

```bash
./deploy/vps/backup.sh
# Attendu : ✅ Backup OK — STAMP imprimé
```

**Vérifier côté VPS** :

```bash
ssh rahiss-vps 'ls -lh /opt/apps/iox/backups/postgres/ | tail -3'
# Attendu : dump du jour présent, taille > 0
```

**Stop 🔴 si** : aucun dump n'a été produit ou taille = 0.

---

## 3. Snapshot rollback des images courantes (J0)

Garantit que le rollback `./deploy/vps/rollback.sh` sera effectif.

```bash
ssh rahiss-vps 'docker tag iox-frontend:local iox-frontend:prev && \
                docker tag iox-backend:local  iox-backend:prev  && \
                docker images | grep -E "iox-(frontend|backend):(local|prev)"'
# Attendu : 4 lignes (frontend:local, frontend:prev, backend:local, backend:prev)
```

**Stop 🔴 si** : `docker tag` échoue (image `:local` absente ⇒ 1er déploiement,
dans ce cas noter `:prev absent` et ne pas tenter de rollback sans
restauration complète).

---

## 4. Déploiement

### 4.1 · Frontend uniquement (cas standard)

```bash
./deploy/vps/deploy.sh frontend
```

Le script fait : rsync excludes stricts → tag `:prev` → `docker compose build
frontend` → `up -d --no-deps frontend` → healthchecks HTTPS.

**Attendu** (5 lignes finales) :

```
  ✓ HTTPS /               307
  ✓ HTTPS /login          200
  ✓ API   /api/v1/health  200
  ✓ API   /api/v1/health/live 200

✅ Déploiement OK
```

**Stop 🔴 si** : un `✗` apparaît. Passer à phase 7 (rollback).

### 4.2 · Backend (rare, impact migration DB possible)

```bash
./deploy/vps/deploy.sh backend
# Surveiller en parallèle dans un autre shell :
ssh rahiss-vps 'docker logs -f iox_backend --since 2m 2>&1 | grep -E "migrate|Error|🚀"'
# Attendre : "prisma migrate deploy" OK + "🚀 IOX Backend démarré"
```

### 4.3 · Full stack (frontend + backend)

```bash
./deploy/vps/deploy.sh all
```

---

## 5. Smoke tests métier (J0 + 5 min)

Depuis un navigateur ouvert sur `https://iox.mycloud.yt/` :

- [ ] **M1** · Login admin → redirect `/dashboard` · token localStorage `accessToken` présent 🔴
- [ ] **M2** · Navigation sidebar : chaque lien charge sans écran blanc 🔴
- [ ] **M3** · Création d'un bénéficiaire test → apparaît dans la liste 🔴
- [ ] **M4** · Création d'un lot fini depuis un produit COMPLIANT → OK 🔴
- [ ] **M5** · Décision NON_COMPLIANT sans motif → erreur locale affichée 🔴
- [ ] **M6** · Décision NON_COMPLIANT avec motif → enregistrée 🔴
- [ ] **M7** · Décision COMPLIANT → enregistrée 🔴
- [ ] **M8** · Upload document test → visible `mc ls` ou via MinIO console 🔴
- [ ] **M9** · Marketplace public `https://iox.mycloud.yt/marketplace` → liste affichée ⚪
- [ ] **M10** · Logout → tentative d'accès `/dashboard` → redirect login 🔴

**Stop 🔴 si** : M1–M8 ou M10 échouent → phase 7 rollback.

---

## 6. Vérifications monitoring + logging (J0 + 10 min)

### 6.1 · Endpoints santé (depuis VPS)

```bash
ssh rahiss-vps '
  echo "--- /health/live"  ; curl -sf http://127.0.0.1:3001/api/v1/health/live | head
  echo "--- /health       "; curl -sf http://127.0.0.1:3001/api/v1/health      | head
  echo "--- /health/ops   "; curl -sfH "x-api-key: dev" http://127.0.0.1:3001/api/v1/health/ops 2>/dev/null | head
'
# Attendu : 3 réponses 200 avec `success: true`, database: up, storage: up
```

### 6.2 · Métriques Prometheus scrapables

```bash
# Avec METRICS_TOKEN récupéré depuis .env du VPS :
ssh rahiss-vps '. /opt/apps/iox/.env && \
  curl -sf -H "Authorization: Bearer $METRICS_TOKEN" \
       http://127.0.0.1:3001/api/v1/metrics | head -20'
# Attendu : lignes `iox_http_requests_total`, `iox_marketplace_sellers_total`,
#           `iox_marketplace_metrics_last_refresh_seconds`
```

### 6.3 · Logs : pas de 5xx depuis 5 min

```bash
ssh rahiss-vps 'docker logs iox_backend --since 5m 2>&1 | grep -c " 5[0-9][0-9] "'
# Attendu : 0
```

### 6.4 · Corrélation Request ID

Provoquer une erreur volontaire (ex. `/api/v1/inexistant`) depuis le
navigateur, récupérer le code `#XXXXXXXX` affiché dans le toast, puis :

```bash
ssh rahiss-vps 'docker logs iox_backend --since 2m 2>&1 | grep "XXXXXXXX"'
# Attendu : au moins une ligne de log avec ce requestId
```

### 6.5 · Activation scrape Prometheus externe (⚪)

Si Prometheus externe déjà installé : vérifier target `iox-backend` en
`UP` dans l'UI Prometheus. Sinon, activer plus tard (non bloquant
pour le go-live).

---

## 7. Vérifications backup / restore (J0 + 20 min)

### 7.1 · Cron backup actif

```bash
ssh rahiss-vps 'crontab -u deploy -l | grep backup.sh || echo "ABSENT"'
```

Si `ABSENT`, l'installer :

```bash
ssh rahiss-vps '(crontab -u deploy -l 2>/dev/null; echo "15 3 * * * /opt/apps/iox/deploy/vps/backup.sh >> /var/log/iox-backup.log 2>&1") | crontab -u deploy -'
# Revérifier :
ssh rahiss-vps 'crontab -u deploy -l | grep backup.sh'
```

### 7.2 · Disaster recovery drill (⚪ si premier déploiement, 🔴 au trimestre)

Dry run **non destructif** — restore sur base jetable :

```bash
# 1. Choisir le dump le plus récent
DUMP=$(ssh rahiss-vps 'ls -t /opt/apps/iox/backups/postgres/iox-*.dump | head -1')
echo "Dump cible : $DUMP"

# 2. Sur machine/conteneur séparé (hors VPS prod) :
#    docker run --rm -d -e POSTGRES_PASSWORD=test -p 55432:5432 --name iox-drtest postgres:15-alpine
#    scp rahiss-vps:$DUMP /tmp/iox-dr.dump
#    docker exec -i iox-drtest pg_restore -U postgres -d postgres < /tmp/iox-dr.dump
#    docker exec -i iox-drtest psql -U postgres -c "SELECT count(*) FROM sellers;"

# 3. Comparer le count sellers avec la prod (à ±1 près si dump récent)
```

Noter le temps total de restore dans un changelog interne. RTO cible = 30 min.

---

## 8. Critères de GO-LIVE (décision binaire)

Décision **GO** si **toutes** ces cases sont cochées :

- [ ] Phase 1 (pré-flight local) : tous les `exit 0`.
- [ ] Phase 2 : backup du jour présent et non vide.
- [ ] Phase 3 : tags `:prev` posés pour frontend et backend.
- [ ] Phase 4 : script `deploy.sh` exit 0 + 4/4 healthchecks verts.
- [ ] Phase 5 : M1–M8 + M10 OK (smoke métier).
- [ ] Phase 6 : `/health` 200, `/metrics` 200, 0 erreur 5xx en 5 min.
- [ ] Phase 7.1 : cron backup planifié.
- [ ] Logs backend « clean » (aucune exception Prisma répétée, aucun
      `Error` non loggué avec un requestId).
- [ ] Disque VPS toujours > 3 GB libres
      (`ssh rahiss-vps 'df -BG /opt/apps/iox'`).
- [ ] Fenêtre communiquée aux parties prenantes (P9).

Décision **NO-GO / ROLLBACK** si **une** de ces conditions est vraie :

- Healthcheck HTTPS ou API retourne autre que 200/307 en phase 4 ou 6.
- Smoke test M1, M3, M4, M8 ou M10 échoue.
- Logs backend contiennent ≥ 1 exception Prisma non transiente en
  5 min (`P1001`, `P2024`, crash-loop).
- Rate 5xx > 0.1 req/s sur 5 min
  (`rate(iox_http_requests_total{status=~"5.."}[5m])`).

---

## 9. Rollback immédiat (si go-live NO-GO)

### 9.1 · Rollback applicatif (images)

```bash
# Frontend seul (le plus fréquent) :
./deploy/vps/rollback.sh frontend

# Backend ou full :
./deploy/vps/rollback.sh backend
./deploy/vps/rollback.sh all
```

**Attendu** : `✅ Rollback OK — /api/v1/health 200`. Durée ≤ 5 s.

### 9.2 · Rollback DB (si migration incompatible)

```bash
# Taper YES à la confirmation
./deploy/vps/restore.sh /opt/apps/iox/backups/postgres/iox-STAMP.dump

# Puis redémarrer le backend avec SKIP_MIGRATIONS=1 le temps d'analyser :
ssh rahiss-vps '
  sed -i.bak "s/^SKIP_MIGRATIONS=.*/SKIP_MIGRATIONS=1/;t; $a SKIP_MIGRATIONS=1" /opt/apps/iox/.env
  cd /opt/apps/iox && docker compose -f docker-compose.vps.yml restart backend
'
```

Documenter la cause racine avant de retenter un déploiement.

### 9.3 · Communication post-rollback

- Émettre un message "rollback effectué" dans le canal communiqué en P9.
- Ouvrir un postmortem en lecture dans `docs/ops/POSTMORTEMS.md` (ou
  équivalent interne) : symptôme, timeline, cause racine, correctifs.

---

## 10. Après validation GO-LIVE (J0 + 30 min)

- [ ] Annoncer l'ouverture de la prod (canal interne).
- [ ] Rester en surveillance active 30 min :
      `watch -n 30 'ssh rahiss-vps "docker stats --no-stream iox_backend iox_frontend | tail -3"'`
- [ ] Vérifier croissance mémoire < 10 %/min.
- [ ] Rotation mot de passe admin (si seed initial exécuté).
- [ ] Archiver le tag image courant en `:YYYYMMDD` pour historiser :
      ```bash
      ssh rahiss-vps 'docker tag iox-frontend:local iox-frontend:'$(date -u +%Y%m%d)
      ssh rahiss-vps 'docker tag iox-backend:local  iox-backend:'$(date -u +%Y%m%d)
      ```

---

## 11. Points à ne PAS oublier

- **Ne jamais** `docker compose down` sur le VPS en phase 4 : utiliser
  `up -d --no-deps <service>` (géré par `deploy.sh`).
- **Ne jamais** supprimer les volumes `postgres_data` ni `minio_data`
  sur le VPS (les données vivent dedans).
- **Ne jamais** committer un `.env.vps*` ni de dump `*.dump` dans le
  repo.
- **Ne jamais** skipper `/health/ops` ou `/metrics` si accessible : ces
  endpoints auth-guardés sont la source de vérité NOC.
- **Toujours** laisser le tag `:prev` en place jusqu'au déploiement
  suivant (pas de `docker image prune` agressif).

---

## 12. Contacts d'escalade

À renseigner localement (hors repo) :

- Admin technique VPS : _________________
- Responsable produit / métier : _________________
- Fournisseur DNS / TLS : _________________
- Canal incident interne : _________________

---

**Dernière mise à jour** : 2026-04-24.
Alignement documenté avec `deploy/vps/*.sh`, `docs/ops/DEPLOY-VPS.md`,
`docs/ops/BACKUP.md`, `docs/ops/ROLLBACK.md`, `docs/ops/RUNBOOKS.md`.
