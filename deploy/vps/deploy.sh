#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  IOX — Déploiement VPS (prod réelle)
# ─────────────────────────────────────────────────────────
#  Codification de la procédure décrite dans
#  docs/deploy/VPS-DEPLOY-AUDIT.md §5 et docs/ops/DEPLOY-VPS.md.
#
#  Flux :
#    1. rsync du code avec excludes (node_modules, .env, .git, etc.)
#    2. Tag de l'image courante en :prev pour rollback
#    3. Build ciblé (frontend par défaut, backend sur demande)
#    4. Restart du service via docker compose
#    5. Healthchecks
#
#  Aucune modification DB, aucun secret écrit, rollback en 5 s via
#  ./rollback.sh.
# ─────────────────────────────────────────────────────────
set -euo pipefail

# ── Paramètres configurables par env ─────────────────────
VPS_HOST="${IOX_VPS_HOST:-rahiss-vps}"
VPS_REMOTE="${IOX_VPS_REMOTE:-/opt/apps/iox}"
VPS_COMPOSE="${IOX_VPS_COMPOSE:-docker-compose.vps.yml}"
VPS_DOMAIN="${IOX_VPS_DOMAIN:-iox.mycloud.yt}"
TARGET="${1:-frontend}"   # frontend | backend | all

# Répertoire racine du repo (= parent de deploy/vps/)
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# ── Validation minimale ──────────────────────────────────
case "$TARGET" in
  frontend|backend|all) ;;
  *)
    echo "usage: $0 [frontend|backend|all]" >&2
    exit 2
    ;;
esac

echo "== IOX deploy =="
echo "  host     : $VPS_HOST"
echo "  remote   : $VPS_REMOTE"
echo "  target   : $TARGET"
echo "  repo     : $REPO_ROOT"
echo "  compose  : $VPS_COMPOSE"
echo "  domain   : $VPS_DOMAIN"
echo

# ── 1. Pré-conditions locales ────────────────────────────
if [ ! -f "$REPO_ROOT/apps/backend/package.json" ]; then
  echo "ERR: repo root invalide ($REPO_ROOT)" >&2
  exit 1
fi

# SSH contrôle : ne peut échouer sans droit d'accès
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "$VPS_HOST" true 2>/dev/null; then
  echo "ERR: SSH non authentifié vers $VPS_HOST" >&2
  echo "     Vérifiez votre ~/.ssh/config et les clés." >&2
  exit 1
fi

# Espace disque distant — seuil plancher 3 GB libres
DISK_FREE_GB=$(ssh "$VPS_HOST" "df -BG --output=avail $VPS_REMOTE 2>/dev/null | tail -1 | tr -d 'G '")
if [ -z "$DISK_FREE_GB" ] || [ "$DISK_FREE_GB" -lt 3 ]; then
  echo "ERR: espace disque insuffisant sur $VPS_HOST:$VPS_REMOTE (${DISK_FREE_GB:-?} GB)" >&2
  exit 1
fi
echo "✓ Disque distant : ${DISK_FREE_GB} GB libres"

# ── 2. Rsync du code avec excludes stricts ───────────────
echo
echo "== Étape 1/5 : rsync =="
rsync -av --delete \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='.turbo' \
  --exclude='coverage' \
  --exclude='test-results' \
  --exclude='playwright-report' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='docker-compose.vps.yml' \
  --exclude='tsconfig.tsbuildinfo' \
  --exclude='.DS_Store' \
  "$REPO_ROOT/" "${VPS_HOST}:${VPS_REMOTE}/"

# ── 3. Snapshot rollback (tag :prev) ─────────────────────
echo
echo "== Étape 2/5 : snapshot :prev =="
if [ "$TARGET" = "frontend" ] || [ "$TARGET" = "all" ]; then
  ssh "$VPS_HOST" "docker image inspect iox-frontend:local >/dev/null 2>&1 \
    && docker tag iox-frontend:local iox-frontend:prev \
    && echo '  ✓ iox-frontend:prev tagué' \
    || echo '  ⚠ iox-frontend:local absent (premier déploiement ?)'"
fi
if [ "$TARGET" = "backend" ] || [ "$TARGET" = "all" ]; then
  ssh "$VPS_HOST" "docker image inspect iox-backend:local >/dev/null 2>&1 \
    && docker tag iox-backend:local iox-backend:prev \
    && echo '  ✓ iox-backend:prev tagué' \
    || echo '  ⚠ iox-backend:local absent (premier déploiement ?)'"
fi

# ── 4. Build ciblé ───────────────────────────────────────
echo
echo "== Étape 3/5 : build =="
BUILD_SERVICES=""
case "$TARGET" in
  frontend) BUILD_SERVICES="frontend" ;;
  backend)  BUILD_SERVICES="backend" ;;
  all)      BUILD_SERVICES="backend frontend" ;;
esac
ssh "$VPS_HOST" "cd $VPS_REMOTE && docker compose -f $VPS_COMPOSE build $BUILD_SERVICES"

# ── 5. Recréation container(s) (sans toucher aux autres) ─
echo
echo "== Étape 4/5 : restart =="
ssh "$VPS_HOST" "cd $VPS_REMOTE && docker compose -f $VPS_COMPOSE up -d --no-deps $BUILD_SERVICES"

# ── 6. Healthchecks ──────────────────────────────────────
echo
echo "== Étape 5/5 : healthchecks =="
sleep 6

fail=0
check() {
  local label="$1" url="$2" want="$3"
  local got
  got=$(curl -skfo /dev/null -w '%{http_code}' "$url" || echo "xxx")
  if [ "$got" = "$want" ] || { [ "$want" = "2xx" ] && [[ "$got" =~ ^2 ]]; }; then
    echo "  ✓ $label $got"
  else
    echo "  ✗ $label attendu=$want obtenu=$got" >&2
    fail=1
  fi
}

check "HTTPS /              " "https://${VPS_DOMAIN}/" "307"
check "HTTPS /login         " "https://${VPS_DOMAIN}/login" "200"
check "API   /api/v1/health " "https://${VPS_DOMAIN}/api/v1/health" "200"
check "API   /api/v1/health/live" "https://${VPS_DOMAIN}/api/v1/health/live" "200"

if [ "$fail" -ne 0 ]; then
  echo
  echo "⚠ Un healthcheck a échoué — envisager ./rollback.sh" >&2
  exit 3
fi

echo
echo "✅ Déploiement OK — $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo "   Rollback : ./deploy/vps/rollback.sh $TARGET"
