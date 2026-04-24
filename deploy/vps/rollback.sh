#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  IOX — Rollback VPS (tag :prev → :local)
# ─────────────────────────────────────────────────────────
#  Rétablit la version précédente de l'image frontend et/ou backend
#  (tagguée :prev par deploy.sh) comme image courante :local, puis
#  recrée le container.
#
#  Usage : ./rollback.sh [frontend|backend|all]
#
#  Limitations :
#  - Ne rollback PAS le code source sur le VPS (rsync est destructif).
#  - Ne rollback PAS la base de données ni les volumes MinIO.
#  - Le tag :prev ne remonte qu'à la version n-1.
# ─────────────────────────────────────────────────────────
set -euo pipefail

VPS_HOST="${IOX_VPS_HOST:-rahiss-vps}"
VPS_REMOTE="${IOX_VPS_REMOTE:-/opt/apps/iox}"
VPS_COMPOSE="${IOX_VPS_COMPOSE:-docker-compose.vps.yml}"
VPS_DOMAIN="${IOX_VPS_DOMAIN:-iox.mycloud.yt}"
TARGET="${1:-frontend}"

case "$TARGET" in frontend|backend|all) ;; *)
  echo "usage: $0 [frontend|backend|all]" >&2; exit 2;;
esac

ROLLBACK_SERVICES=""
case "$TARGET" in
  frontend) ROLLBACK_SERVICES="frontend" ;;
  backend)  ROLLBACK_SERVICES="backend" ;;
  all)      ROLLBACK_SERVICES="backend frontend" ;;
esac

echo "== IOX rollback =="
echo "  host   : $VPS_HOST"
echo "  target : $TARGET"
echo

# Vérifier présence des tags :prev
for svc in $ROLLBACK_SERVICES; do
  if ! ssh "$VPS_HOST" "docker image inspect iox-${svc}:prev >/dev/null 2>&1"; then
    echo "ERR: iox-${svc}:prev absent sur $VPS_HOST — rollback impossible" >&2
    exit 1
  fi
done

# Re-tag :prev → :local (l'image courante pointée par compose)
for svc in $ROLLBACK_SERVICES; do
  ssh "$VPS_HOST" "docker tag iox-${svc}:prev iox-${svc}:local"
  echo "  ✓ iox-${svc}:local ← :prev"
done

# Recréation container(s)
ssh "$VPS_HOST" "cd $VPS_REMOTE && docker compose -f $VPS_COMPOSE up -d --no-deps $ROLLBACK_SERVICES"

# Healthcheck rapide
sleep 4
code=$(curl -sko /dev/null -w '%{http_code}' "https://${VPS_DOMAIN}/api/v1/health" || echo xxx)
echo
if [ "$code" = "200" ]; then
  echo "✅ Rollback OK — /api/v1/health $code"
else
  echo "⚠ Rollback exécuté mais /api/v1/health a retourné $code" >&2
  exit 3
fi
