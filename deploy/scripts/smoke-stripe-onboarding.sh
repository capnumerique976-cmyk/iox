#!/usr/bin/env bash
# Smoke post-bascule Stripe : login smoke-seller, génère onboarding link, vérifie SellerStripeAccount créé en DB.
# Usage : ./deploy/scripts/smoke-stripe-onboarding.sh
# Doc   : docs/ops/STRIPE_PROD_ACTIVATION.md

set -euo pipefail

API_BASE="${API_BASE:-https://iox.mycloud.yt/api/v1}"
SELLER_EMAIL="${SELLER_EMAIL:-smoke-seller@iox.mch}"
SELLER_PASSWORD="${SELLER_PASSWORD:-IoxSmoke2026!}"
VPS_HOST="${VPS_HOST:-rahiss-vps}"

echo "→ Smoke Stripe onboarding pipeline"
echo "  API : $API_BASE"
echo "  User: $SELLER_EMAIL"

# 1. Login smoke-seller
echo ""
echo "1️⃣  Login smoke-seller"
TOKEN=$(curl -sS -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SELLER_EMAIL\",\"password\":\"$SELLER_PASSWORD\"}" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['data']['accessToken'])")

if [ -z "$TOKEN" ]; then
  echo "❌ Login échoué"
  exit 1
fi
echo "  ✓ Token récupéré"

# 2. POST onboarding-link
echo ""
echo "2️⃣  POST /payments/connect/onboarding-link"
RESP=$(curl -sS -X POST "$API_BASE/payments/connect/onboarding-link" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"returnUrl":"https://iox.mycloud.yt/seller/payments/return","refreshUrl":"https://iox.mycloud.yt/seller/payments/refresh"}')

echo "  Response: $(echo "$RESP" | head -c 250)"

URL=$(echo "$RESP" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('data',{}).get('url',''))" 2>/dev/null || echo "")
if [ -z "$URL" ]; then
  echo "❌ Pas d'URL onboarding dans response"
  exit 1
fi

if [[ ! "$URL" =~ ^https://connect.stripe.com ]]; then
  echo "⚠ URL inattendue (devrait commencer par https://connect.stripe.com) : $URL"
fi
echo "  ✓ URL onboarding : ${URL:0:60}..."

# 3. Vérifier SellerStripeAccount créé en DB
echo ""
echo "3️⃣  Vérifie SellerStripeAccount créé en DB"
ssh "$VPS_HOST" "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c \"SELECT seller_profile_id, stripe_account_id, status, charges_enabled, payouts_enabled, details_submitted FROM seller_stripe_accounts ORDER BY created_at DESC LIMIT 3\""

# 4. GET account-status
echo ""
echo "4️⃣  GET /payments/connect/account-status (lecture pure DB)"
STATUS=$(curl -sS -X GET "$API_BASE/payments/connect/account-status" \
  -H "Authorization: Bearer $TOKEN")
echo "  Response: $(echo "$STATUS" | head -c 250)"

echo ""
echo "✅ Smoke terminé. Validations manuelles complémentaires :"
echo "   - Login UI seller → /seller/payments → bouton 'Démarrer l'onboarding'"
echo "   - Click bouton → redirect Stripe Express avec form KYC"
echo "   - Test mode : utiliser cartes test https://stripe.com/docs/connect/testing"
echo "   - Au retour : status passe à ONBOARDING_INCOMPLETE → CHARGES_ENABLED → PAYOUTS_ENABLED"
