# IOX — Checklist déploiement VPS pilote fermé

**Date :** 2026-05-11  
**Scope :** Pilote fermé 3-5 coopératives invitées (non public)  
**Prérequis :** PR #133 mergée ✅ · Fixes sécurité P0 appliqués ✅ · Tests 1016/1016 ✅

> **Pilote fermé ≠ production publique.** Stripe en mode test. RGPD informel. Accès sur invitation uniquement.

---

## 1. Infrastructure VPS

- [ ] VPS Ubuntu 22.04 LTS provisionné — min **2 vCPU / 4 GB RAM** (recommandé : 4 vCPU / 8 GB)
- [ ] Accès SSH configuré — clé publique admin déployée, root désactivé
- [ ] Pare-feu UFW configuré :
  ```bash
  ufw allow 22/tcp   # SSH
  ufw allow 80/tcp   # HTTP (redirect vers HTTPS)
  ufw allow 443/tcp  # HTTPS
  ufw enable
  ```
- [ ] Domaine configuré (ex: `pilot.iox.example`) — DNS A record → IP VPS
- [ ] SSL Let's Encrypt via Caddy ou Certbot :
  ```bash
  # Caddy (recommandé — HTTPS automatique)
  apt install -y caddy
  # Caddyfile : pilot.iox.example → reverse_proxy localhost:3000
  ```

---

## 2. Stack applicative

- [ ] Node.js v20 LTS installé (`nvm install 20 && nvm use 20`)
- [ ] pnpm installé (`npm install -g pnpm`)
- [ ] PM2 installé (`npm install -g pm2`)
- [ ] PostgreSQL v15+ installé et démarré :
  ```bash
  apt install -y postgresql-15
  # Créer user + DB
  sudo -u postgres psql -c "CREATE USER iox_pilot WITH PASSWORD 'STRONG_PASSWORD';"
  sudo -u postgres psql -c "CREATE DATABASE iox_pilot OWNER iox_pilot;"
  ```
- [ ] Redis v7+ installé et démarré :
  ```bash
  apt install -y redis-server
  systemctl enable --now redis
  ```
- [ ] MinIO installé (ou S3 compatible) — bucket `iox-documents` créé
- [ ] MailHog OU Resend configuré pour emails transactionnels (pilote OK avec MailHog)

---

## 3. Variables d'environnement backend

Créer `/opt/iox/backend/.env` :

```bash
APP_ENV="staging"           # staging pour le pilote (pas production)
APP_PORT="3001"
FRONTEND_URL="https://pilot.iox.example"
APP_URL="https://pilot.iox.example"

DATABASE_URL="postgresql://iox_pilot:STRONG_PASSWORD@localhost:5432/iox_pilot"

REDIS_URL="redis://localhost:6379"

# Générer : openssl rand -hex 48
JWT_SECRET="<hex-48-chars-unique>"
JWT_REFRESH_SECRET="<hex-48-chars-different>"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="<iox-pilot-access-key>"       # PAS minioadmin
MINIO_SECRET_KEY="<iox-pilot-secret-key>"       # PAS minioadmin
MINIO_BUCKET="iox-documents"
MINIO_USE_SSL="false"

# Stripe — MODE TEST pour le pilote (sk_test_ intentionnel)
STRIPE_SECRET_KEY="sk_test_..."                 # clé test OK pour pilote
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Email
NOTIF_EMAIL_TRANSPORT="smtp-stream"             # ou "resend" si Resend configuré
SMTP_HOST="localhost"
SMTP_PORT="1025"
MAIL_FROM="noreply@pilot.iox.example"
# RESEND_API_KEY="re_..."                       # si transport=resend

# MeiliSearch (optionnel — fallback Postgres si absent)
# MEILISEARCH_HOST="http://localhost:7700"
# MEILISEARCH_API_KEY="<strong-key>"

# Métriques (optionnel)
# METRICS_TOKEN="<token>"
```

**Vérifications automatiques au boot :**
- ⚠️ `staging` émet warnings Stripe (attendu — clés test intentionnelles en pilote)
- `production` bloquerait si secrets de démo détectés (minioadmin, JWT par défaut)
- JWT_SECRET ≠ JWT_REFRESH_SECRET validé

---

## 4. Variables d'environnement frontend

Créer `/opt/iox/frontend/.env.local` :

```bash
# FRONTEND_URL est utilisé par next.config.mjs pour allowedOrigins (Server Actions)
FRONTEND_URL="https://pilot.iox.example"
# Si backend sur même hôte avec proxy Next.js rewrites (recommandé) :
BACKEND_INTERNAL_URL="http://127.0.0.1:3001"
```

---

## 5. Build et déploiement

```bash
# Clone ou pull depuis main
cd /opt
git clone git@github.com:capnumerique976-cmyk/iox.git || (cd iox && git pull)
cd iox

# Install dépendances
pnpm install --frozen-lockfile

# Build backend
cd apps/backend
npm run build     # → dist/main.js
cd ../..

# Build frontend
cd apps/frontend
npm run build     # → .next/ (standalone)
cd ../..
```

---

## 6. Migrations DB

```bash
# ⚠️ Toujours backup avant migration
DATABASE_URL="postgresql://iox_pilot:STRONG_PASSWORD@localhost:5432/iox_pilot" \
  npx prisma migrate deploy

# Vérifier l'état
npx prisma migrate status
```

> **NE PAS** lancer `IOX_DEMO_SEED=1` si des coopératives pilotes réelles utilisent la base.  
> Lancer uniquement pour la démo interne initiale.

---

## 7. Démarrage des services

```bash
# Backend
pm2 start /opt/iox/apps/backend/dist/main.js \
  --name iox-backend \
  --env-file /opt/iox/backend/.env \
  --time

# Frontend (Next.js standalone)
cd /opt/iox/apps/frontend
pm2 start npm --name iox-frontend -- run start

# Sauvegarder la configuration PM2
pm2 save
pm2 startup   # configurer redémarrage automatique
```

---

## 8. Backup opérationnel

```bash
# Rendre le script exécutable (déjà fait si clone depuis main)
chmod +x /opt/iox/scripts/backup-postgres.sh

# Test manuel
DATABASE_URL="postgresql://iox_pilot:STRONG_PASSWORD@localhost:5432/iox_pilot" \
  /opt/iox/scripts/backup-postgres.sh /opt/iox/backups

# Vérifier le fichier créé
ls -lh /opt/iox/backups/

# Configurer cron (2h00 UTC chaque nuit)
crontab -e
# Ajouter :
# 0 2 * * * DATABASE_URL="postgresql://iox_pilot:STRONG_PASSWORD@localhost:5432/iox_pilot" /opt/iox/scripts/backup-postgres.sh /opt/iox/backups >> /var/log/iox-backup.log 2>&1
```

- [ ] Backup manuel lancé avec succès ✅
- [ ] Fichier `.dump.gz` créé dans `/opt/iox/backups/` ✅
- [ ] Cron configuré ✅

---

## 9. Smoke tests post-déploiement

```bash
BASE="https://pilot.iox.example/api/v1"

# 1. Health check
curl -sf $BASE/../health | jq '.status'
# → "ok"

# 2. Login admin pilote
ADMIN_TOKEN=$(curl -sf -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@iox.example","password":"YOUR_ADMIN_PASSWORD"}' \
  | jq -r '.data.accessToken')
echo "Token: ${ADMIN_TOKEN:0:20}..."

# 3. Catalogue marketplace (public)
curl -sf "$BASE/marketplace/catalog/products?limit=5" | jq '.data | length'

# 4. Compliance admin (authentifié)
curl -sf "$BASE/compliance/admin/summary" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data'

# 5. Swagger désactivé (staging = désactivé, comme production)
curl -sf -o /dev/null -w "%{http_code}" "$BASE/../docs"
# → 404

# 6. Bull Board protégé
curl -sf -o /dev/null -w "%{http_code}" https://pilot.iox.example/admin/queues
# → 401

# 7. Frontend accessible
curl -sf -o /dev/null -w "%{http_code}" https://pilot.iox.example
# → 200
```

- [ ] `/health` → status ok ✅
- [ ] Admin login → token JWT ✅
- [ ] Catalogue → au moins 0 produits (vide si pas de seed) ✅
- [ ] Swagger → 404 ✅
- [ ] Bull Board → 401 ✅
- [ ] Frontend → 200 ✅

---

## 10. Onboarding vendeurs pilotes

Pour chaque coopérative pilote :

1. **Créer le compte** : `POST /api/v1/auth/register` (rôle MARKETPLACE_SELLER)
2. **Créer le profil vendeur** : `POST /api/v1/seller-profiles` (associé à la company)
3. **Stripe Connect onboarding** (mode test) :
   - `POST /api/v1/payments/connect/onboarding` → URL d'onboarding Stripe test
   - Vendeur complète le formulaire Stripe (sandbox)
4. **Accès frontend** : `https://pilot.iox.example/seller/`
5. **Formation** : guider avec `notes/guide-vendeur-iox.md` (max 2h)

---

## 11. Rollback

```bash
# 1. Stopper les services
pm2 stop iox-backend iox-frontend

# 2. Revenir au commit précédent
git checkout main~1

# 3. Rebuild
cd apps/backend && npm run build
pm2 start /opt/iox/apps/backend/dist/main.js --name iox-backend

# 4. Si rollback DB nécessaire (après backup vérifié)
DATABASE_URL="postgresql://iox_pilot:STRONG_PASSWORD@localhost:5432/iox_pilot" \
  FORCE=1 /opt/iox/scripts/restore-postgres.sh \
  /opt/iox/backups/iox_YYYYMMDD_HHMMSS.dump.gz
```

---

## 12. Différences pilote fermé vs production publique

| Aspect | Pilote fermé | Production publique |
|---|---|---|
| `APP_ENV` | `staging` | `production` |
| Stripe | Mode test (`sk_test_`) | Mode live (`sk_live_`) |
| RGPD | Informel (participants informés) | CGU + politique confidentialité publiées |
| Monitoring | Optionnel | UptimeRobot + Sentry recommandés |
| Accès | Invitation uniquement | Ouvert |
| Seed démo | Possible (isolé) | Interdit absolument |

---

*Deployment checklist production complète : `notes/deployment-checklist-production-iox.md`*  
*Scripts backup/restore : `scripts/backup-postgres.sh`, `scripts/restore-postgres.sh`*  
*Guides utilisateurs : `notes/guide-vendeur-iox.md`, `notes/guide-acheteur-iox.md`*
