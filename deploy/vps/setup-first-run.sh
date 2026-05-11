#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  IOX — Setup premier déploiement VPS (Ubuntu 22.04 LTS)
#
#  Usage depuis la MACHINE LOCALE (pas depuis le VPS) :
#    export IOX_VPS_HOST=rahiss-vps         # alias ~/.ssh/config
#    export IOX_VPS_DOMAIN=iox.mycloud.yt
#    export IOX_VPS_REMOTE=/opt/iox
#    ./deploy/vps/setup-first-run.sh
#
#  Ce script :
#    1. Installe Docker + Docker Compose plugin sur le VPS
#    2. Crée l'arborescence /opt/iox/
#    3. Rsync le code (sans node_modules / .env / .git)
#    4. Crée .env depuis le template si absent
#    5. Crée les répertoires data/* pour les volumes
#    6. Build + démarrage de la stack
#    7. Attente healthcheck
#    8. Création bucket MinIO (iox-pilot)
#    9. Migration Prisma
#   10. Seed démo (optionnel)
#   11. Setup Nginx + SSL (guidé)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

VPS_HOST="${IOX_VPS_HOST:?Définir IOX_VPS_HOST (alias ssh)}"
VPS_DOMAIN="${IOX_VPS_DOMAIN:?Définir IOX_VPS_DOMAIN (ex: iox.mycloud.yt)}"
VPS_REMOTE="${IOX_VPS_REMOTE:-/opt/iox}"
COMPOSE_FILE="docker-compose.pilot.yml"

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# ── Couleurs ─────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}==>${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }
step()    { echo; echo -e "${GREEN}══ $* ══${NC}"; }
confirm() { read -r -p "$1 [o/N] " r; [[ "$r" =~ ^[oO]$ ]]; }

echo
echo "╔══════════════════════════════════════════════════════╗"
echo "║      IOX — Premier déploiement VPS pilote            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "  VPS     : $VPS_HOST"
echo "  Domaine : $VPS_DOMAIN"
echo "  Remote  : $VPS_REMOTE"
echo

# ─────────────────────────────────────────────────────────────
# 0. Pré-conditions locales
# ─────────────────────────────────────────────────────────────
step "0. Vérifications locales"

[ -f "$REPO_ROOT/apps/backend/package.json" ] \
  || error "Répertoire repo invalide : $REPO_ROOT"

ssh -o BatchMode=yes -o ConnectTimeout=5 "$VPS_HOST" true \
  || error "SSH non accessible : $VPS_HOST. Vérifier ~/.ssh/config et les clés."

info "SSH OK"

# ─────────────────────────────────────────────────────────────
# 1. Installer Docker sur le VPS
# ─────────────────────────────────────────────────────────────
step "1. Installation Docker (VPS)"
ssh "$VPS_HOST" bash <<'REMOTE_DOCKER'
set -euo pipefail
if command -v docker &>/dev/null; then
  echo "Docker déjà installé : $(docker --version)"
  exit 0
fi
echo "Installation Docker..."
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker
echo "Docker installé : $(docker --version)"
REMOTE_DOCKER
info "Docker OK"

# ─────────────────────────────────────────────────────────────
# 2. Arborescence remote
# ─────────────────────────────────────────────────────────────
step "2. Arborescence VPS"
ssh "$VPS_HOST" "
  mkdir -p $VPS_REMOTE/deploy/vps/nginx
  mkdir -p $VPS_REMOTE/data/postgres
  mkdir -p $VPS_REMOTE/data/redis
  mkdir -p $VPS_REMOTE/data/minio
  chmod 750 $VPS_REMOTE/data
  echo 'Répertoires créés'"
info "Arborescence OK"

# ─────────────────────────────────────────────────────────────
# 3. Rsync code
# ─────────────────────────────────────────────────────────────
step "3. Rsync code source → VPS"
rsync -a --delete \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='.claude' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='.turbo' \
  --exclude='coverage' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.local' \
  --exclude='.DS_Store' \
  --exclude='tsconfig.tsbuildinfo' \
  "$REPO_ROOT/" "${VPS_HOST}:${VPS_REMOTE}/"
info "Rsync OK"

# ─────────────────────────────────────────────────────────────
# 4. Fichier .env
# ─────────────────────────────────────────────────────────────
step "4. Configuration .env"
ENV_EXISTS=$(ssh "$VPS_HOST" "[ -f $VPS_REMOTE/.env ] && echo yes || echo no")
if [ "$ENV_EXISTS" = "yes" ]; then
  warn ".env déjà présent sur le VPS — conservé tel quel."
else
  warn ".env absent. Copie du template .env.pilot.example → .env"
  ssh "$VPS_HOST" "cp $VPS_REMOTE/deploy/vps/.env.pilot.example $VPS_REMOTE/.env"
  warn ""
  warn "⚠  OBLIGATOIRE : éditer $VPS_HOST:$VPS_REMOTE/.env"
  warn "   Renseigner au minimum :"
  warn "     - POSTGRES_PASSWORD"
  warn "     - MINIO_ROOT_USER / MINIO_ROOT_PASSWORD"
  warn "     - JWT_SECRET / JWT_REFRESH_SECRET (openssl rand -hex 64)"
  warn "     - FRONTEND_URL / NEXT_PUBLIC_API_URL / NEXT_PUBLIC_SITE_URL"
  warn ""
  if ! confirm "Le .env est-il maintenant renseigné ?"; then
    echo "Interrompu. Éditer le .env puis relancer ce script."
    exit 0
  fi
fi

# ─────────────────────────────────────────────────────────────
# 5. Vérification secrets JWT
# ─────────────────────────────────────────────────────────────
step "5. Vérification variables critiques"
ssh "$VPS_HOST" bash <<REMOTE_CHECK
set -euo pipefail
cd $VPS_REMOTE
source .env 2>/dev/null || true
errors=0
for var in POSTGRES_PASSWORD MINIO_ROOT_USER MINIO_ROOT_PASSWORD JWT_SECRET JWT_REFRESH_SECRET FRONTEND_URL NEXT_PUBLIC_API_URL NEXT_PUBLIC_SITE_URL; do
  val=\$(printenv "\$var" 2>/dev/null || true)
  if [ -z "\$val" ] || echo "\$val" | grep -q "CHANGE_ME"; then
    echo "✗ \$var manquant ou non modifié"
    errors=\$((errors+1))
  else
    echo "✓ \$var défini"
  fi
done
[ \$errors -eq 0 ] || { echo "Corriger les variables dans .env"; exit 1; }
REMOTE_CHECK
info "Variables OK"

# ─────────────────────────────────────────────────────────────
# 6. Build + démarrage stack
# ─────────────────────────────────────────────────────────────
step "6. Build images Docker (peut prendre 5-10 min au premier run)"
ssh "$VPS_HOST" "cd $VPS_REMOTE && docker compose -f deploy/vps/$COMPOSE_FILE --env-file .env build --no-cache"
info "Build OK"

step "7. Démarrage stack"
ssh "$VPS_HOST" "cd $VPS_REMOTE && docker compose -f deploy/vps/$COMPOSE_FILE --env-file .env up -d"
info "Stack démarrée"

# ─────────────────────────────────────────────────────────────
# 7. Attente healthchecks
# ─────────────────────────────────────────────────────────────
step "8. Attente healthchecks (max 90s)"
ssh "$VPS_HOST" bash <<'REMOTE_HEALTH'
for i in $(seq 1 18); do
  ok=0
  docker exec iox_backend node -e \
    "require('http').get('http://127.0.0.1:3001/api/v1/health/live',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))" \
    2>/dev/null && ok=1
  if [ $ok -eq 1 ]; then
    echo "Backend healthy (tentative $i)"
    break
  fi
  echo "Attente backend... ($((i*5))s)"
  sleep 5
done
[ $ok -eq 1 ] || { echo "Backend non healthy après 90s" >&2; exit 1; }
REMOTE_HEALTH
info "Backend healthy"

# ─────────────────────────────────────────────────────────────
# 8. Créer bucket MinIO
# ─────────────────────────────────────────────────────────────
step "9. Bucket MinIO"
ssh "$VPS_HOST" bash <<REMOTE_MINIO
set -euo pipefail
source $VPS_REMOTE/.env
docker exec iox_minio sh -c "
  mc alias set local http://localhost:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD 2>/dev/null || true
  mc mb --ignore-existing local/\${MINIO_BUCKET:-iox-pilot}
  echo 'Bucket \${MINIO_BUCKET:-iox-pilot} prêt'
"
REMOTE_MINIO
info "MinIO OK"

# ─────────────────────────────────────────────────────────────
# 9. Migration Prisma (applique les migrations SQL)
# ─────────────────────────────────────────────────────────────
step "10. Migration base de données"
ssh "$VPS_HOST" "docker exec iox_backend prisma migrate deploy"
info "Migrations OK"

# ─────────────────────────────────────────────────────────────
# 10. Seed démo (optionnel)
# ─────────────────────────────────────────────────────────────
step "11. Seed démo"
if confirm "Importer les données de démo (9 vendeurs, 13 produits) ?"; then
  ssh "$VPS_HOST" "docker exec iox_backend node -e \"
    const {NestFactory} = require('@nestjs/core');
    const {AppModule} = require('./dist/apps/backend/src/app.module');
    const {SeedDemoService} = require('./dist/apps/backend/src/seed-demo/seed-demo.service');
    (async()=>{
      const app = await NestFactory.createApplicationContext(AppModule,{logger:['error']});
      await app.get(SeedDemoService).seed();
      await app.close();
      console.log('Seed OK');
    })().catch(e=>{console.error(e);process.exit(1)});
  \"" || warn "Seed échoué — relancer manuellement via POST /api/v1/admin/seed-demo"
  info "Seed OK"
else
  warn "Seed ignoré. POST /api/v1/admin/seed-demo pour seeder plus tard."
fi

# ─────────────────────────────────────────────────────────────
# 11. Nginx + SSL
# ─────────────────────────────────────────────────────────────
step "12. Nginx + SSL (Let's Encrypt)"
ssh "$VPS_HOST" bash <<REMOTE_NGINX
set -euo pipefail
# Installer Nginx + Certbot si absent
if ! command -v nginx &>/dev/null; then
  apt-get install -y -qq nginx
fi
if ! command -v certbot &>/dev/null; then
  apt-get install -y -qq certbot python3-certbot-nginx
fi
# Copier config Nginx
cp $VPS_REMOTE/deploy/vps/nginx/iox-pilot.conf /etc/nginx/sites-available/iox-pilot
sed -i 's/iox.mycloud.yt/$VPS_DOMAIN/g' /etc/nginx/sites-available/iox-pilot
ln -sf /etc/nginx/sites-available/iox-pilot /etc/nginx/sites-enabled/iox-pilot
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "Nginx configuré"
REMOTE_NGINX

warn "Obtenir le certificat SSL :"
warn "  ssh $VPS_HOST 'certbot --nginx -d $VPS_DOMAIN --non-interactive --agree-tos -m admin@$VPS_DOMAIN'"
if confirm "Lancer certbot maintenant ?"; then
  ssh "$VPS_HOST" "certbot --nginx -d $VPS_DOMAIN --non-interactive --agree-tos -m admin@$VPS_DOMAIN"
  info "SSL OK"
fi

# ─────────────────────────────────────────────────────────────
# Résumé final
# ─────────────────────────────────────────────────────────────
echo
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  IOX pilote déployé !                            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo "  Frontend  : https://$VPS_DOMAIN"
echo "  Backend   : https://$VPS_DOMAIN/api/v1/health"
echo "  Swagger   : https://$VPS_DOMAIN/api-docs"
echo "  MinIO UI  : ssh $VPS_HOST puis http://127.0.0.1:9001"
echo
echo "  Déploiements suivants : ./deploy/vps/deploy.sh all"
echo "  Smoke tests           : ./scripts/smoke-preprod-iox.sh"
echo "  Backup                : ./deploy/vps/backup.sh"
echo
