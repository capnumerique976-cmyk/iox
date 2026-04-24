# IOX — Runbook préproduction (séquence d'exécution)

> Document opérateur. Chaque étape = **objectif, prérequis, action, critère
> de succès, rollback**. À dérouler dans l'ordre. Les étapes marquées 🤖
> sont automatiques, 👤 nécessitent une intervention humaine, 🌐 dépendent
> d'une infra externe au dépôt.

**Horizon d'exécution attendu** : 45–75 min pour une mise en préprod à
partir d'un VPS vierge (hors provisionnement DB managé).

**Rollback global** : `docker compose -f docker-compose.preprod.yml down`
puis `sed -i "s|:vX|:vX-1|" .env && docker compose … up -d`.

---

## Étape 0 — Pré-requis machine 👤

**Objectif** : hôte préprod prêt à accueillir la stack.

**Prérequis**

- VPS Linux (Debian/Ubuntu récent) ou équivalent.
- Accès SSH root ou sudo.
- Docker Engine ≥ 24 + Docker Compose v2.
- Nginx ≥ 1.22.
- Clone git du dépôt ou copie du dossier `deploy/preprod/`.

**Action**

```bash
docker --version && docker compose version
nginx -v
```

**Critère de succès** : les 3 binaires répondent.

**Rollback** : aucun — étape non destructive.

---

## Étape 1 — Génération des secrets 👤

**Objectif** : produire des secrets aléatoires uniques et non-démo.

**Prérequis** : OpenSSL sur la machine qui génère (≠ VPS si vous préférez
les injecter via Vault/SOPS).

**Action**

```bash
JWT_SECRET=$(openssl rand -hex 48)
JWT_REFRESH_SECRET=$(openssl rand -hex 48)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
MINIO_ROOT_PASSWORD=$(openssl rand -hex 24)
METRICS_TOKEN=$(openssl rand -hex 24)
# Conserver ces valeurs dans le gestionnaire de secrets.
```

**Critère de succès**

- `JWT_SECRET` et `JWT_REFRESH_SECRET` font 96 caractères, sont distincts.
- Aucun secret ne figure en clair dans git.

**Rollback** : régénérer — les secrets n'ont pas encore été injectés.

---

## Étape 2 — Préparation des variables d'environnement 👤

**Objectif** : `.env` préprod complet sur l'hôte.

**Prérequis** : étape 1 terminée, `deploy/preprod/` déployé à
`/opt/iox/preprod/` sur l'hôte.

**Action**

```bash
ssh user@vps
cd /opt/iox/preprod
cp .env.preprod.example .env
chmod 600 .env  # critique — lecture owner uniquement
editor .env      # renseigner tous les __CHANGE_ME__ / __GENERATE_WITH__
```

Variables clés à renseigner :

- `BACKEND_IMAGE`, `FRONTEND_IMAGE` → tags versionnés poussés par la CI.
- `FRONTEND_URL=https://preprod.iox.mch` (sans `/` final, `https`).
- `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`, `JWT_SECRET`,
  `JWT_REFRESH_SECRET`, `METRICS_TOKEN` → valeurs de l'étape 1.

**Critère de succès**

```bash
grep -c "__CHANGE_ME__\|__GENERATE_WITH_" .env  # → 0
stat -c '%a' .env                               # → 600
```

**Rollback** : `rm .env` et recommencer.

---

## Étape 3 — Preflight repo 🤖

**Objectif** : valider la cohérence des variables avant tout boot.

**Prérequis** : étape 2 terminée, Node ≥ 20 sur la machine qui exécute
le preflight (ou depuis la CI avec le `.env` injecté).

**Action**

```bash
set -a && . /opt/iox/preprod/.env && set +a
APP_ENV=staging NODE_ENV=production node scripts/preflight.mjs
```

**Critère de succès**

```
✔ Preflight OK (18 checks)
```

En cas d'échec, le script affiche la variable fautive et la raison.

**Stop si…**

- Un secret est encore un placeholder (`__CHANGE_ME__`, `minioadmin`, …).
- `DATABASE_URL` pointe `localhost` en préprod.
- `FRONTEND_URL` n'est pas en `https://` ou a un `/` final.
- `NODE_ENV` ≠ `production`.

**Rollback** : corriger `.env` et rejouer.

---

## Étape 4 — Base de données 🌐 👤

**Objectif** : Postgres 15+ provisionné et atteignable depuis le VPS.

**Deux variantes**

### 4a. Base managée (RDS / Cloud SQL / Neon) — recommandé préprod

1. Provisionner une instance Postgres 15 vide.
2. Créer utilisateur applicatif `iox` avec privilèges sur la base
   `iox_preprod`.
3. Restreindre l'ACL réseau à l'IP du VPS.
4. Retirer le service `postgres` du `docker-compose.preprod.yml`.
5. Renseigner `DATABASE_URL` avec `sslmode=require`.

### 4b. Base embarquée (docker-compose) — acceptable préprod

- Rien à faire hors définir `POSTGRES_PASSWORD` : la migration s'applique
  automatiquement au boot backend (cf. étape 6).

**Critère de succès**

```bash
# Depuis le VPS, hors compose :
docker run --rm postgres:15-alpine psql "$DATABASE_URL" -c 'SELECT 1'
```

**Rollback** : aucun — l'étape ne mute pas encore la base.

---

## Étape 5 — DNS + TLS + Reverse proxy 🌐 👤

**Objectif** : `https://preprod.iox.mch` résout vers le VPS, certificat
valide, Nginx en route.

**Prérequis**

- Accès au registrar DNS.
- certbot (ou acme.sh) installé sur le VPS.

**Action**

```bash
# 1. DNS — créer A/AAAA preprod.iox.mch → IP VPS
dig +short preprod.iox.mch   # vérifier propagation

# 2. ACME certificat
certbot certonly --nginx -d preprod.iox.mch

# 3. Nginx config
sudo cp /opt/iox/preprod/nginx.preprod.conf.example \
        /etc/nginx/sites-available/iox.conf
# Adapter `server_name` et chemins cert si besoin.
sudo ln -s ../sites-available/iox.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Critère de succès**

```bash
curl -I http://preprod.iox.mch/  | head -1   # → 301 https://
curl -I https://preprod.iox.mch/             # → 502 (backend pas encore up, c'est OK)
curl -I https://preprod.iox.mch/ | grep -i strict-transport-security
```

**Stop si…**

- DNS ne résout pas depuis l'extérieur.
- `nginx -t` échoue.
- Certificat manquant ou expiré.

**Rollback**

```bash
sudo rm /etc/nginx/sites-enabled/iox.conf
sudo systemctl reload nginx
```

---

## Étape 6 — Boot de la stack 🤖

**Objectif** : démarrer Postgres, Redis, MinIO, backend (avec migrations),
frontend.

**Prérequis** : étapes 2, 3, 5 terminées. Images Docker accessibles
(`BACKEND_IMAGE`, `FRONTEND_IMAGE`).

**Action**

```bash
cd /opt/iox/preprod
docker compose -f docker-compose.preprod.yml pull
docker compose -f docker-compose.preprod.yml up -d
docker compose -f docker-compose.preprod.yml ps
docker compose -f docker-compose.preprod.yml logs -f backend &
BG_PID=$!
```

Observer dans les logs backend :

```
🗂  IOX: prisma migrate deploy (APP_ENV=staging)
… Applying migration `20260421000000_init`
🚀 IOX: starting node dist/apps/backend/src/main.js
🚀 IOX Backend démarré — env=staging port=3001
```

Puis `kill $BG_PID`.

**Critère de succès**

- `docker compose ps` : tous les services en `healthy` (ou `Up` pour
  frontend qui n'a pas de healthcheck compose, mais Dockerfile le fournit).

**Stop si…**

- `prisma migrate deploy` échoue (DB inaccessible, droits insuffisants,
  migration divergente — voir étape 4).
- Backend redémarre en boucle → `docker compose logs backend | tail -50`.
- MinIO ne devient jamais `healthy` → volumes en lecture seule ou port
  occupé.

**Rollback**

```bash
docker compose -f docker-compose.preprod.yml down
# État repo inchangé, DB potentiellement déjà migrée (non destructif).
```

---

## Étape 7 — Vérification healthchecks 🤖

**Objectif** : confirmer que backend est prêt à servir du trafic.

**Action**

```bash
curl -fsS http://127.0.0.1:3001/api/v1/health/live    # liveness
curl -fsS http://127.0.0.1:3001/api/v1/health         # readiness (DB + storage)
```

**Critère de succès**

- Liveness : `{"status":"ok","uptime":…}` (HTTP 200).
- Readiness : `{"status":"ok","info":{"database":{"status":"up"},"storage":{"status":"up",…}}}` (HTTP 200).

**Stop si…**

- Readiness retourne 503 pendant plus de 60 s après boot → investiguer
  Prisma logs.

**Rollback** : idem étape 6.

---

## Étape 8 — Smoke-check automatisé 🤖

**Objectif** : valider 10 surfaces critiques en une commande.

**Action** (depuis le repo, sur le VPS ou via reverse proxy) :

```bash
# Local VPS (direct)
METRICS_TOKEN="$METRICS_TOKEN" ./scripts/smoke-check.sh

# Via reverse proxy public
BASE_BACKEND=https://preprod.iox.mch \
BASE_FRONTEND=https://preprod.iox.mch \
METRICS_TOKEN="$METRICS_TOKEN" \
  ./scripts/smoke-check.sh
```

**Critère de succès** : `✔ smoke-check OK (N checks)`, exit 0.

Contrôles couverts :

1. Liveness backend (`/api/v1/health/live` → 200 + body `status:ok`).
2. Readiness backend (`/api/v1/health` → 200 + `database` + `storage`).
3. Frontend HTML servi (`/` → 200 + contient `<html`).
4. Auth login refuse le body vide (400/401/422, pas 5xx).
5. Metrics (avec/sans token selon config).
6. Metrics contient les counters HTTP IOX.

**Stop si…** un seul check échoue → diagnostiquer, ne pas poursuivre.

**Rollback** : idem étape 6.

---

## Étape 9 — Vérification frontend manuelle 👤

**Objectif** : parcours UI minimal via navigateur.

**Action** (navigateur)

1. `https://preprod.iox.mch/` → page de login charge.
2. Login avec le compte admin (seed ou provisionné).
3. Vérifier navigation : dashboard, bénéficiaires, lots, décisions.
4. Upload d'un document test → confirmer présence dans MinIO.

**Critère de succès** : aucune 500 dans la console, `accessToken` stocké.

**Rollback** : idem étape 6.

---

## Étape 10 — Metrics + scrape Prometheus 🌐 👤

**Objectif** : télémétrie IOX récoltée par Prometheus, alertes armées.

**Action** (côté Prometheus)

```yaml
scrape_configs:
  - job_name: iox-backend
    scrape_interval: 30s
    metrics_path: /api/v1/metrics
    static_configs:
      - targets: ['preprod.iox.mch']
    scheme: https
    authorization:
      type: Bearer
      credentials: <METRICS_TOKEN>
```

Puis recharger Prometheus et vérifier dans l'UI que le target IOX est
`UP`.

Règles d'alerte minimales (cf. `docs/OBSERVABILITY.md`) :

- `rate(iox_http_requests_total{status=~"5.."}[5m]) > 0.1`
- `histogram_quantile(0.95, rate(iox_http_duration_seconds_bucket[5m])) > 1`
- `up{job="iox-backend"} == 0` (crash-loop)

**Critère de succès** : target `UP` + une query Prometheus renvoie des
séries `iox_http_requests_total`.

**Stop si…** scrape retourne 401 → vérifier `METRICS_TOKEN` côté Prom.

**Rollback** : retirer le job de Prometheus, dégrader l'alerte.

---

## Étape 11 — Seed initial (conditionnel) 👤

**Objectif** : créer le premier utilisateur admin si la DB est vide.

**Prérequis** : premier déploiement, pas de données existantes.

**Action**

```bash
docker compose -f docker-compose.preprod.yml exec backend \
  node dist/apps/backend/src/scripts/seed.js  # ou pnpm db:seed si dispo dans l'image
# Puis via l'UI : login admin, changer immédiatement le mot de passe.
```

**Critère de succès** : login admin via l'UI réussit puis le mot de passe
par défaut est rotaté.

**Stop si…** des données préexistent → **ne pas** rejouer le seed
(risque de doublons).

**Rollback** : `DELETE FROM users WHERE email = 'admin@…'` (manuel,
réservé à un premier déploiement raté).

---

## Étape 12 — Validation E2E critiques 👤 🤖

**Objectif** : sécuriser les 3 parcours métier structurants.

**Action (manuelle navigateur, déterministe)**

1. **Création bénéficiaire** : formulaire, validation, apparition liste.
2. **Création lot fini** : produit COMPLIANT seulement → lot enregistré.
3. **Décision mise en marché** :
   - COMPLIANT → décision enregistrée.
   - NON_COMPLIANT sans motif → refus côté UI (validation locale).
   - NON_COMPLIANT avec motif → décision enregistrée.

**Action (automatisée Playwright, si la CI préprod est branchée)**

```bash
BASE_URL=https://preprod.iox.mch pnpm --filter @iox/frontend test:e2e
```

**Critère de succès** : 3 parcours verts.

**Stop si…** un parcours échoue → ne pas ouvrir au-delà du cercle d'équipe.

**Rollback** : rollback image n-1 (voir plus bas).

---

## Étape 13 — Validation finale préprod 👤

**Objectif** : ouvrir l'accès à l'équipe métier.

**Action**

- Communiquer l'URL et les credentials de test à l'équipe.
- Activer la surveillance : regarder Prometheus + logs backend pendant
  30 min minimum.
- Statuer : `GO`, `GO sous réserve`, `ROLLBACK`.

**Critère de succès**

- 0 erreur 5xx sur 30 min.
- p95 latence < 500 ms sur les endpoints `/beneficiaries`, `/batches`.
- Backup Postgres quotidien planifié confirmé.

---

## Rollback global (toutes étapes)

### Rollback image n-1 (hotfix)

```bash
cd /opt/iox/preprod
sed -i 's|backend:v0\.1\.0|backend:v0.0.9|'  .env
sed -i 's|frontend:v0\.1\.0|frontend:v0.0.9|' .env
docker compose -f docker-compose.preprod.yml pull
docker compose -f docker-compose.preprod.yml up -d
./scripts/smoke-check.sh
```

### Rollback DB (nécessite backup — **destructif**)

```bash
docker compose -f docker-compose.preprod.yml down
# Restaurer dump pg_restore sur la base préprod.
docker compose -f docker-compose.preprod.yml up -d
```

### Rollback DNS

Baisser le TTL à 60 s avant go-live pour pouvoir repointer vite.
