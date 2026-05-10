# IOX — Guide de Déploiement VPS Pilote Ferme

**Date :** 2026-05-11  
**Cible :** Premier déploiement pilote sur VPS Ubuntu 22.04 LTS  
**Référence complémentaire :** `notes/deployment-checklist-vps-pilote-ferme-iox.md`

---

## 1. Architecture cible

Déploiement monolithique sur un seul VPS. Tous les services tournent sur la même machine pour le pilote.

```
Internet
    │
    ▼
[Nginx + SSL Certbot]  :443 / :80
    │
    ├── /api/*  ──────────────►  [NestJS Backend]  :3000 (PM2)
    │
    └── /*  ────────────────►  [Next.js Frontend]  :3001 (PM2)
         │
         ├── [PostgreSQL 15]   :5432 (local socket)
         ├── [Redis 7]          :6379 (local socket)
         └── [MeiliSearch]      :7700 (local)
```

**Services :**

| Service | Technologie | Port | Gestionnaire |
|---|---|---|---|
| Backend API | NestJS | 3000 | PM2 |
| Frontend | Next.js 14 | 3001 | PM2 |
| Base de données | PostgreSQL 15 | 5432 | systemd |
| Cache / Queues | Redis 7 | 6379 | systemd |
| Recherche | MeiliSearch | 7700 | systemd |
| Reverse proxy | Nginx | 80 / 443 | systemd |
| SSL | Certbot (Let's Encrypt) | — | cron |
| Stockage fichiers | MinIO (ou S3 externe) | 9000 | systemd ou distant |

---

## 2. Prérequis système

### Spécifications VPS minimales (pilote)

| Ressource | Minimum pilote | Recommandé |
|---|---|---|
| vCPU | 2 | 4 |
| RAM | 4 GB | 8 GB |
| Disque SSD | 40 GB | 80 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Bande passante | 100 Mbps | 500 Mbps |

### Packages à installer

```bash
# Mise à jour système
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm 9
npm install -g pnpm@9

# PM2
npm install -g pm2

# Nginx
sudo apt install -y nginx

# Certbot
sudo apt install -y certbot python3-certbot-nginx

# PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-client-15

# Redis 7
sudo apt install -y redis-server

# Utilitaires
sudo apt install -y git curl jq htop ufw fail2ban
```

### MeiliSearch

```bash
# Installation via script officiel
curl -L https://install.meilisearch.com | sh
sudo mv ./meilisearch /usr/local/bin/
sudo chmod +x /usr/local/bin/meilisearch

# Créer le service systemd
sudo tee /etc/systemd/system/meilisearch.service > /dev/null <<EOF
[Unit]
Description=MeiliSearch
After=network.target

[Service]
User=www-data
ExecStart=/usr/local/bin/meilisearch --db-path /var/lib/meilisearch/data --env production --master-key \${MEILI_MASTER_KEY}
Restart=always
EnvironmentFile=/etc/iox/meilisearch.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable meilisearch
```

---

## 3. Variables d'environnement requises

Créer les fichiers `.env` sur le serveur. **Ne jamais committer ces fichiers dans Git.**

### Backend — `/opt/iox/apps/backend/.env`

```env
# Runtime
NODE_ENV=production
APP_ENV=production
PORT=3000

# Base de données
DATABASE_URL=postgresql://iox_prod:[MOT_DE_PASSE_DB]@localhost:5432/iox_production

# Cache
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=[À compléter — 64 caractères minimum, générer avec openssl rand -hex 32]
JWT_REFRESH_SECRET=[À compléter — 64 caractères minimum, différent de JWT_SECRET]

# Stripe
STRIPE_SECRET_KEY=[À compléter — sk_live_...]
STRIPE_WEBHOOK_SECRET=[À compléter — whsec_...]
STRIPE_PUBLISHABLE_KEY=[À compléter — pk_live_...]

# Recherche
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_MASTER_KEY=[À compléter — 32 caractères minimum]

# Stockage fichiers
MINIO_ENDPOINT=[À compléter — ex: s3.iox.example ou s3.amazonaws.com]
MINIO_BUCKET=[À compléter — ex: iox-documents]
MINIO_ACCESS_KEY=[À compléter]
MINIO_SECRET_KEY=[À compléter]

# URLs
APP_URL=https://[À compléter — domaine backend, ex: api.iox.example]
FRONTEND_URL=https://[À compléter — domaine frontend, ex: iox.example]

# Email (SMTP)
SMTP_HOST=[À compléter — ex: smtp.sendgrid.net]
SMTP_PORT=587
SMTP_USER=[À compléter]
SMTP_PASS=[À compléter]
SMTP_FROM=noreply@[À compléter — domaine]

# Rate limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Sentry (optionnel)
SENTRY_DSN=[À compléter si Sentry configuré]
```

### Frontend — `/opt/iox/apps/frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=https://[À compléter — même valeur que APP_URL backend]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[À compléter — même valeur que STRIPE_PUBLISHABLE_KEY backend]
NEXT_PUBLIC_SENTRY_DSN=[À compléter si Sentry configuré]
```

---

## 4. Configuration Nginx

Créer `/etc/nginx/sites-available/iox` :

```nginx
# Redirection HTTP → HTTPS
server {
    listen 80;
    server_name [À compléter — domaine] api.[À compléter — domaine];
    return 301 https://$host$request_uri;
}

# Frontend Next.js
server {
    listen 443 ssl http2;
    server_name [À compléter — domaine frontend, ex: iox.example];

    ssl_certificate /etc/letsencrypt/live/[À compléter]/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/[À compléter]/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Sécurité headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend NestJS
server {
    listen 443 ssl http2;
    server_name api.[À compléter — domaine, ex: api.iox.example];

    ssl_certificate /etc/letsencrypt/live/api.[À compléter]/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.[À compléter]/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;

    # Limite taille upload
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts pour les opérations longues (imports, exports)
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }
}
```

Activer et tester :

```bash
sudo ln -s /etc/nginx/sites-available/iox /etc/nginx/sites-enabled/iox
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. Configuration PM2

Créer `/opt/iox/ecosystem.config.js` :

```js
module.exports = {
  apps: [
    {
      name: 'iox-backend',
      cwd: '/opt/iox/apps/backend',
      script: 'dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '/opt/iox/apps/backend/.env',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/iox/backend-error.log',
      out_file: '/var/log/iox/backend-out.log',
      max_memory_restart: '512M',
      restart_delay: 3000,
      watch: false,
    },
    {
      name: 'iox-frontend',
      cwd: '/opt/iox/apps/frontend',
      script: 'node_modules/.bin/next',
      args: 'start --port 3001',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_file: '/opt/iox/apps/frontend/.env.local',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/iox/frontend-error.log',
      out_file: '/var/log/iox/frontend-out.log',
      max_memory_restart: '256M',
      restart_delay: 3000,
      watch: false,
    },
  ],
};
```

---

## 6. Séquence de déploiement (15 étapes)

Exécuter en tant qu'utilisateur de déploiement (pas root).

```bash
# Étape 1 — Cloner le dépôt
git clone https://github.com/[organisation]/iox.git /opt/iox
cd /opt/iox

# Étape 2 — Checkout du tag de release
git checkout tags/v[À compléter — ex: v1.0.0-pilote]

# Étape 3 — Installer les dépendances (monorepo pnpm)
pnpm install --frozen-lockfile

# Étape 4 — Créer les répertoires nécessaires
sudo mkdir -p /var/log/iox /opt/iox/backups
sudo chown -R $USER:$USER /var/log/iox /opt/iox/backups

# Étape 5 — Vérifier les variables d'environnement backend
# (les fichiers .env doivent déjà être en place, copiés manuellement)
grep -c "À compléter" /opt/iox/apps/backend/.env
# Doit retourner 0 (aucune valeur non renseignée)

# Étape 6 — Backup de la base existante (si migration)
./scripts/backup-postgres.sh /opt/iox/backups

# Étape 7 — Appliquer les migrations Prisma
cd /opt/iox/apps/backend
npx prisma migrate deploy
# Vérifier : "All migrations have been successfully applied"

# Étape 8 — Générer le client Prisma
npx prisma generate

# Étape 9 — Builder le backend
cd /opt/iox
pnpm --filter backend build
# Vérifier : dist/main.js créé

# Étape 10 — Builder le frontend
pnpm --filter frontend build
# Vérifier : .next/BUILD_ID créé

# Étape 11 — Démarrer / redémarrer avec PM2
pm2 startOrRestart /opt/iox/ecosystem.config.js --update-env

# Étape 12 — Vérifier le statut PM2
pm2 status
# Les deux processus doivent être en status "online"

# Étape 13 — Sauvegarder la config PM2 (persistence après reboot)
pm2 save
pm2 startup  # Suivre les instructions affichées

# Étape 14 — Recharger Nginx
sudo nginx -t && sudo systemctl reload nginx

# Étape 15 — Smoke tests
curl -s https://api.[domaine]/api/health | jq '.status'
# Doit retourner "ok"
curl -o /dev/null -s -w "%{http_code}" https://[domaine]/
# Doit retourner 200
```

---

## 7. Smoke tests post-déploiement

Exécuter immédiatement après chaque déploiement.

```bash
BASE_API="https://api.[À compléter]"
BASE_FRONT="https://[À compléter]"

# 1. Health backend
echo -n "Backend health: "
curl -s "$BASE_API/api/health" | jq -r '.status'

# 2. Swagger disponible
echo -n "Swagger docs: "
curl -o /dev/null -s -w "%{http_code}\n" "$BASE_API/api/docs/json"

# 3. Frontend homepage
echo -n "Frontend home: "
curl -o /dev/null -s -w "%{http_code}\n" "$BASE_FRONT/"

# 4. Marketplace
echo -n "Marketplace: "
curl -o /dev/null -s -w "%{http_code}\n" "$BASE_FRONT/marketplace"

# 5. API marketplace (public)
echo -n "API marketplace: "
curl -o /dev/null -s -w "%{http_code}\n" "$BASE_API/api/marketplace/offers"

# 6. Auth sans token (doit retourner 401)
echo -n "Auth guard (expect 401): "
curl -o /dev/null -s -w "%{http_code}\n" "$BASE_API/api/auth/me"

# 7. Login mauvais credentials (doit retourner 401)
echo -n "Login bad creds (expect 401): "
curl -o /dev/null -s -w "%{http_code}\n" -X POST "$BASE_API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.invalid","password":"wrong"}'

# 8. Manifest PWA
echo -n "PWA manifest: "
curl -o /dev/null -s -w "%{http_code}\n" -I "$BASE_FRONT/manifest.webmanifest"
```

**Résultats attendus :** 1→ok, 2→200, 3→200, 4→200, 5→200, 6→401, 7→401, 8→200.

---

## 8. Procédure de rollback

En cas d'anomalie détectée après déploiement :

```bash
# 1. Arrêter le backend (éviter les corruptions)
pm2 stop iox-backend iox-frontend

# 2. Restaurer la base depuis le backup pré-déploiement
./scripts/restore-postgres.sh /opt/iox/backups/iox_[TIMESTAMP].dump.gz

# 3. Revenir au tag précédent
git checkout tags/v[version-précédente]
pnpm install --frozen-lockfile

# 4. Rebuilder
pnpm --filter backend build
pnpm --filter frontend build

# 5. Redémarrer
pm2 startOrRestart /opt/iox/ecosystem.config.js --update-env

# 6. Vérifier
curl -s https://api.[domaine]/api/health | jq '.status'
```

---

## 9. Checklist GO / NO-GO

A valider avant d'ouvrir le pilote aux utilisateurs réels.

```
PILOTE : [À compléter — nom de la ferme]
Date de lancement : [À compléter]
Responsable technique : [À compléter]

[ ] 1. SSL valide sur frontend et backend (padlock vert dans le navigateur)
[ ] 2. Migrations Prisma appliquées sans erreur
[ ] 3. Backup PostgreSQL créé et vérifié (gunzip -t → OK)
[ ] 4. PM2 : les 2 processus en status "online"
[ ] 5. Smoke tests : 8/8 statuts conformes
[ ] 6. Variables d'environnement : aucune valeur "À compléter" dans .env
[ ] 7. Stripe : clé live renseignée, webhook configuré dans le dashboard Stripe
[ ] 8. MeiliSearch : index créés et reindexation effectuée
[ ] 9. Email : envoi de test reçu (mot de passe oublié)
[ ] 10. Monitoring UptimeRobot : alertes configurées (cf. notes/monitoring-pilote-iox.md)
[ ] 11. Cron backup : actif (crontab -l → entrée visible, log /var/log/iox-backup.log OK)
[ ] 12. Compte admin créé et connexion testée

→ GO si les 12 cases sont cochées. Sinon : NO-GO, bloquer le lancement.
```

---

*Références :*  
*- Checklist déploiement : `notes/deployment-checklist-vps-pilote-ferme-iox.md`*  
*- Backup : `notes/backup-restore-runbook-iox.md`*  
*- Monitoring : `notes/monitoring-pilote-iox.md`*  
*- Smoke tests : `notes/smoke-tests-preprod-iox.md`*
