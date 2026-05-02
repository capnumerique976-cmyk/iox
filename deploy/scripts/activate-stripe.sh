#!/usr/bin/env bash
# Activation Stripe Connect Express en VPS — set 3 env vars + restart backend.
# Pré-requis : STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET + STRIPE_PUBLISHABLE_KEY exportées localement.
# Usage     : ./deploy/scripts/activate-stripe.sh
# Doc       : docs/ops/STRIPE_PROD_ACTIVATION.md

set -euo pipefail

# ─── Validation env vars locales ─────────────────────────────────────────
for var in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PUBLISHABLE_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "❌ $var manquant. Export les 3 vars avant exécution :"
    echo "   export STRIPE_SECRET_KEY=sk_test_xxx"
    echo "   export STRIPE_WEBHOOK_SECRET=whsec_xxx"
    echo "   export STRIPE_PUBLISHABLE_KEY=pk_test_xxx"
    exit 1
  fi
done

if [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_(test|live)_ ]]; then
  echo "❌ STRIPE_SECRET_KEY format invalide (doit commencer par sk_test_ ou sk_live_)."
  exit 1
fi
if [[ ! "$STRIPE_WEBHOOK_SECRET" =~ ^whsec_ ]]; then
  echo "❌ STRIPE_WEBHOOK_SECRET format invalide (doit commencer par whsec_)."
  exit 1
fi
if [[ ! "$STRIPE_PUBLISHABLE_KEY" =~ ^pk_(test|live)_ ]]; then
  echo "❌ STRIPE_PUBLISHABLE_KEY format invalide (doit commencer par pk_test_ ou pk_live_)."
  exit 1
fi

VPS_HOST="${VPS_HOST:-rahiss-vps}"
VPS_PATH="${VPS_PATH:-/opt/apps/iox}"

echo "→ Activation Stripe Connect Express sur $VPS_HOST:$VPS_PATH"
echo "→ Mode : ${STRIPE_SECRET_KEY:0:7}..."
echo "→ Backup .env existant + update 3 vars Stripe + restart backend"

ssh "$VPS_HOST" \
  STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET" \
  STRIPE_PUBLISHABLE_KEY="$STRIPE_PUBLISHABLE_KEY" \
  VPS_PATH="$VPS_PATH" \
  bash <<'REMOTE'
set -euo pipefail
cd "$VPS_PATH"

# Backup horodaté
BACKUP=".env.backup-stripe-$(date +%Y%m%d-%H%M%S)"
cp .env "$BACKUP"
echo "  ✓ Backup → $BACKUP"

# Update STRIPE_SECRET_KEY
if grep -q "^STRIPE_SECRET_KEY=" .env; then
  sed -i "s|^STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY|" .env
else
  echo "STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY" >> .env
fi

# Update STRIPE_WEBHOOK_SECRET
if grep -q "^STRIPE_WEBHOOK_SECRET=" .env; then
  sed -i "s|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET|" .env
else
  echo "STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET" >> .env
fi

# Update STRIPE_PUBLISHABLE_KEY
if grep -q "^STRIPE_PUBLISHABLE_KEY=" .env; then
  sed -i "s|^STRIPE_PUBLISHABLE_KEY=.*|STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY|" .env
else
  echo "STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY" >> .env
fi

echo "  ✓ .env mis à jour (3 vars Stripe)"

# Restart backend
docker compose -f docker-compose.vps.yml restart backend
echo "  ✓ Backend container restart"

# Healthcheck
sleep 5
HEALTH=$(curl -sS http://localhost:3001/api/v1/health | head -c 200 || echo "unreachable")
echo "  Health: $HEALTH"

# Smoke endpoint payments
ACCOUNT_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/payments/connect/account-status || echo "ERR")
echo "  /payments/connect/account-status (sans auth) → HTTP $ACCOUNT_STATUS (attendu 401)"

if [ "$ACCOUNT_STATUS" != "401" ]; then
  echo "  ⚠ Status inattendu — vérifier logs backend (peut indiquer Stripe SDK init failure)"
fi
REMOTE

echo ""
echo "✅ Bascule Stripe appliquée."
echo "   Vérifier ensuite avec : ./deploy/scripts/smoke-stripe-onboarding.sh"
echo "   Rollback : ssh $VPS_HOST 'cd $VPS_PATH && cp .env.backup-stripe-* .env && docker compose -f docker-compose.vps.yml restart backend'"
