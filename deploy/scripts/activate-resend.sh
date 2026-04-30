#!/usr/bin/env bash
# Activation Resend en production VPS — bascule NOTIF_EMAIL_TRANSPORT=resend.
# Pré-requis : RESEND_API_KEY exporté localement avant exécution.
# Usage     : RESEND_API_KEY=re_xxx ./deploy/scripts/activate-resend.sh
# Doc       : docs/ops/RESEND_PROD_ACTIVATION.md
#
# Sécurité : ce script ne stocke pas la clé en clair côté local. Elle est
# transmise au VPS via heredoc SSH puis écrite dans /opt/apps/iox/.env.

set -euo pipefail

if [ -z "${RESEND_API_KEY:-}" ]; then
  echo "❌ RESEND_API_KEY manquant. Export avant exécution :"
  echo "   export RESEND_API_KEY=re_xxx_secret"
  exit 1
fi

if [[ ! "$RESEND_API_KEY" =~ ^re_ ]]; then
  echo "❌ RESEND_API_KEY format invalide (doit commencer par 're_')."
  exit 1
fi

VPS_HOST="${VPS_HOST:-rahiss-vps}"
VPS_PATH="${VPS_PATH:-/opt/apps/iox}"

echo "→ Activation Resend sur $VPS_HOST:$VPS_PATH"
echo "→ Backup .env existant + update NOTIF_EMAIL_TRANSPORT + restart backend"

ssh "$VPS_HOST" RESEND_API_KEY="$RESEND_API_KEY" VPS_PATH="$VPS_PATH" bash <<'REMOTE'
set -euo pipefail
cd "$VPS_PATH"

# Backup horodaté
BACKUP=".env.backup-$(date +%Y%m%d-%H%M%S)"
cp .env "$BACKUP"
echo "  ✓ Backup → $BACKUP"

# Update NOTIF_EMAIL_TRANSPORT
if grep -q "^NOTIF_EMAIL_TRANSPORT=" .env; then
  sed -i "s|^NOTIF_EMAIL_TRANSPORT=.*|NOTIF_EMAIL_TRANSPORT=resend|" .env
else
  echo "NOTIF_EMAIL_TRANSPORT=resend" >> .env
fi

# Update RESEND_API_KEY
if grep -q "^RESEND_API_KEY=" .env; then
  sed -i "s|^RESEND_API_KEY=.*|RESEND_API_KEY=$RESEND_API_KEY|" .env
else
  echo "RESEND_API_KEY=$RESEND_API_KEY" >> .env
fi

# Default RESEND_FROM_* si absents
grep -q "^RESEND_FROM_EMAIL=" .env || echo "RESEND_FROM_EMAIL=notifications@iox.mch" >> .env
grep -q "^RESEND_FROM_NAME=" .env || echo "RESEND_FROM_NAME=IOX Notifications" >> .env

echo "  ✓ .env mis à jour"

# Restart backend
docker compose -f docker-compose.vps.yml restart backend
echo "  ✓ Backend container restart"

# Healthcheck
sleep 5
HEALTH=$(curl -sS http://localhost:3001/api/v1/health | head -c 200 || echo "unreachable")
echo "  Health: $HEALTH"
REMOTE

echo ""
echo "✅ Bascule Resend appliquée."
echo "   Vérifier ensuite avec : ./deploy/scripts/smoke-resend.sh"
echo "   Rollback : ssh $VPS_HOST 'cd $VPS_PATH && cp .env.backup-* .env && docker compose -f docker-compose.vps.yml restart backend'"
