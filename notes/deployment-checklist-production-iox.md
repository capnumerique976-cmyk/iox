# IOX — Checklist déploiement production

**Date :** 2026-05-10  
**Décision :** ⚠️ PRÊT AVEC RÉSERVES — voir section 10

> **Règle d'or :** Si un point de cette checklist n'est pas coché, NE PAS déployer.

---

## 1. Prérequis infrastructure

- [ ] VPS / instance cloud provisionnée (Ubuntu 22.04 LTS recommandé, min 2 vCPU / 4 GB RAM)
- [ ] Domaine configuré (ex: `iox.example`) + SSL Let's Encrypt ou équivalent
- [ ] Reverse proxy configuré (Nginx ou Caddy) — HTTP → HTTPS redirect
- [ ] PostgreSQL (v15+) accessible — URL `postgresql://user:pass@host:port/db`
- [ ] Redis (v7+) accessible — URL `redis://host:6379`
- [ ] MeiliSearch (v1.x) accessible OU fallback Postgres activé (ne pas définir `MEILISEARCH_HOST`)
- [ ] MinIO OU S3 compatible configuré — bucket `iox-documents` créé
- [ ] Provider email configuré (Resend recommandé) — API key prête
- [ ] Stripe Connect configuré en mode **LIVE** — clés prod obtenues

---

## 2. Variables d'environnement backend (production)

Créer `/opt/iox/backend/.env` (ou équivalent secrets manager) :

### Obligatoires

```bash
APP_ENV="production"
APP_PORT="3001"
FRONTEND_URL="https://iox.example"       # URL réelle de production
APP_URL="https://iox.example"            # Identique — utilisé pour liens emails

DATABASE_URL="postgresql://iox_prod:STRONG_PASSWORD@host:5432/iox_prod"

REDIS_URL="redis://host:6379"

# Générer : openssl rand -hex 48
JWT_SECRET="<48-char-random-hex>"
JWT_REFRESH_SECRET="<48-char-random-hex-different>"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

MINIO_ENDPOINT="s3.example.com"
MINIO_PORT="443"
MINIO_ACCESS_KEY="<access-key-not-minioadmin>"
MINIO_SECRET_KEY="<secret-key-not-minioadmin>"
MINIO_BUCKET="iox-documents"
MINIO_USE_SSL="true"
```

### Fortement recommandés

```bash
# Stripe — LIVE keys uniquement en production
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."      # Obtenu via Stripe Dashboard → Webhooks

# Email
RESEND_API_KEY="re_..."
MAIL_FROM="noreply@iox.example"

# MeiliSearch (optionnel — fallback Postgres si absent)
MEILISEARCH_HOST="http://meilisearch:7700"
MEILISEARCH_API_KEY="<strong-api-key>"
```

### Vérifications automatiques au boot

Le backend **refusera de démarrer** si :
- JWT_SECRET < 32 caractères
- JWT_SECRET === JWT_REFRESH_SECRET
- JWT_SECRET ou MINIO_ACCESS_KEY contient une valeur de démo bannie
- DATABASE_URL manquant

---

## 3. Variables d'environnement frontend (production)

Créer `/opt/iox/frontend/.env.local` :

```bash
# Optionnel si frontend et backend partagent le même hôte (même domaine)
# Définir uniquement si l'API est sur un sous-domaine différent
# NEXT_PUBLIC_API_URL="https://api.iox.example/api/v1"
# BACKEND_INTERNAL_URL="http://localhost:3001"
```

---

## 4. Commandes build

```bash
# Depuis la racine du monorepo
pnpm install --frozen-lockfile

# Backend
cd apps/backend
npx nest build         # webpack bundle → dist/main.js
# OU
npm run build          # tsc classique (selon la config du projet)

# Frontend
cd apps/frontend
npm run build          # next build → .next/
```

---

## 5. Migrations DB

```bash
# ⚠️ BACKUP OBLIGATOIRE avant chaque migration en production
pg_dump -U iox_prod iox_prod > backups/iox_$(date +%Y%m%d_%H%M%S).dump

# Appliquer les migrations (SANS seed demo)
cd apps/backend
npx prisma migrate deploy

# Vérifier l'état
npx prisma migrate status
```

> **⚠️ IMPORTANT :** Ne jamais lancer `IOX_DEMO_SEED=1` en production.  
> Le seed démo crée des données fictives préfixées `demo-` qui pollueront la prod.

---

## 6. Démarrage des services

```bash
# Backend (avec process manager — PM2 recommandé)
pm2 start dist/main.js --name iox-backend --env production

# Frontend (Next.js standalone)
pm2 start npm --name iox-frontend -- run start

# Ou avec Docker Compose (voir docker-compose.vps.yml.example)
docker-compose -f docker-compose.vps.yml up -d
```

---

## 7. Configuration Stripe webhook

```bash
# Dans Stripe Dashboard → Webhooks → Add endpoint :
# URL : https://iox.example/api/v1/payments/webhook
# Events : payment_intent.succeeded, payment_intent.payment_failed,
#          account.updated, transfer.created

# Récupérer le webhook secret (whsec_...) et l'ajouter à .env :
# STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## 8. Smoke tests post-déploiement

Lancer ces commandes depuis n'importe quel terminal après déploiement :

```bash
BASE="https://iox.example/api/v1"

# 1. Health (si configuré)
curl -s -o /dev/null -w "%{http_code}" $BASE/health

# 2. Login admin
ADMIN_TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@iox.example","password":"YOUR_ADMIN_PASSWORD"}' \
  | jq -r '.data.accessToken')

# 3. Stats catalogue
curl -s $BASE/marketplace/catalog/stats

# 4. Compliance admin
curl -s $BASE/compliance/admin/summary \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data'

# 5. Swagger désactivé en prod
curl -s -o /dev/null -w "%{http_code}" $BASE/../docs
# ← DOIT retourner 404 (Swagger désactivé en production)

# 6. Bull Board protégé
curl -s -o /dev/null -w "%{http_code}" https://iox.example/admin/queues
# ← DOIT retourner 401 (JWT requis)
```

---

## 9. Rollback

```bash
# Si problème après déploiement :

# 1. Stopper le backend
pm2 stop iox-backend

# 2. Revenir à la version précédente (git)
git checkout main~1   # ou le commit précédent
npx nest build
pm2 start dist/main.js --name iox-backend

# 3. Restaurer la DB si migration problématique
pg_restore -U iox_prod -d iox_prod backups/iox_YYYYMMDD_HHMMSS.dump

# 4. Aucune migration Prisma en sens inverse automatique —
#    restauration manuelle via backup si rollback DB nécessaire
```

---

## 10. Points de vigilance & décision GO

### Points résolus

| Point | Statut |
|---|---|
| Tests backend 1003/1003 | ✅ |
| TypeScript clean | ✅ |
| Swagger désactivé en production (main.ts ligne 132) | ✅ |
| Bull Board protégé JWT admin | ✅ |
| Secrets dev interdits en prod (env.validation.ts) | ✅ |
| Seed démo séparé (`IOX_DEMO_SEED=1` requis explicitement) | ✅ |
| Secrets Stripe test redactés de l'historique Git | ✅ |
| .env jamais committé (.gitignore) | ✅ |

### Points à résoudre manuellement avant prod

| Point | Action requise | Criticité |
|---|---|---|
| `STRIPE_SECRET_KEY` manquant dans .env prod | Obtenir clés live Stripe → renseigner .env | Haute (paiements inactifs sinon) |
| `STRIPE_WEBHOOK_SECRET` manquant | Configurer endpoint Stripe Dashboard | Haute |
| KYC vendeurs Stripe Connect | Chaque vendeur doit compléter son onboarding Stripe | Haute |
| `APP_URL` à renseigner en prod | Sinon emails RFQ pointent vers `iox.example` (fallback) | Moyenne |
| `RESEND_API_KEY` ou SMTP prod | Configurer provider email pour notifs | Moyenne |
| `MEILISEARCH_API_KEY` forte | Remplacer la valeur de démo si utilisée | Moyenne |
| Seed démo interdite en prod | Documenter et rappeler à l'équipe OPS | Haute |
| Backup DB automatisé | Configurer cron pg_dump avant premier déploiement | Haute |
| Monitoring / alertes | PM2 + healthcheck Uptime Robot ou équivalent | Moyenne |
| RGPD : CGU, politique confidentialité | Rédiger et afficher avant ouverture | Haute (légal) |

### Décision

**⚠️ PRÊT AVEC RÉSERVES — GO production uniquement après :**

1. ✅ Clés Stripe live configurées
2. ✅ Backup DB en place
3. ✅ APP_URL et RESEND_API_KEY renseignés
4. ✅ RGPD documenté et affiché
5. ✅ KYC premiers vendeurs Stripe initiés
6. ✅ PR #133 mergée dans main

**Le code est prêt. L'infrastructure et la config prod sont la condition bloquante.**

---

## 11. Commandes de régénération des supports

```bash
# Regénérer le deck PDF
npx @marp-team/marp-cli notes/deck-investisseur-iox.marp.md --pdf -o exports/iox-deck-investisseur.pdf

# Regénérer le deck HTML
npx @marp-team/marp-cli notes/deck-investisseur-iox.marp.md --html -o exports/iox-deck-investisseur.html

# Regénérer la fiche synthèse PDF
npx @marp-team/marp-cli notes/fiche-synthese-iox.marp.md --pdf -o exports/iox-fiche-synthese.pdf
```

---

*Pour la checklist RDV : `notes/checklist-rdv-investisseur-iox.md`*  
*Pour la démo technique : `notes/demo-runbook-technique.md`*
