#!/usr/bin/env bash
# Smoke post-bascule Resend : login smoke-buyer, crée RFQ test, vérifie EmailLog.
# Usage : ./deploy/scripts/smoke-resend.sh
# Doc   : docs/ops/RESEND_PROD_ACTIVATION.md

set -euo pipefail

API_BASE="${API_BASE:-https://iox.mycloud.yt/api/v1}"
BUYER_EMAIL="${BUYER_EMAIL:-smoke-buyer@iox.mch}"
BUYER_PASSWORD="${BUYER_PASSWORD:-IoxSmoke2026!}"
VPS_HOST="${VPS_HOST:-rahiss-vps}"

echo "→ Smoke Resend pipeline"
echo "  API : $API_BASE"
echo "  User: $BUYER_EMAIL"

# 1. Login smoke-buyer
echo ""
echo "1️⃣  Login smoke-buyer"
TOKEN=$(curl -sS -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$BUYER_EMAIL\",\"password\":\"$BUYER_PASSWORD\"}" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['data']['accessToken'])")

if [ -z "$TOKEN" ]; then
  echo "❌ Login échoué"
  exit 1
fi
echo "  ✓ Token récupéré"

# 2. Trouver une offre publique
echo ""
echo "2️⃣  Récupère 1 offre publique"
OFFER_ID=$(curl -sS "$API_BASE/marketplace/catalog?limit=1" \
  | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['data']['data'][0]['offerId'])")

if [ -z "$OFFER_ID" ]; then
  echo "❌ Aucune offre publique trouvée"
  exit 1
fi
echo "  ✓ Offer ID: $OFFER_ID"

# 3. Créer RFQ test
echo ""
echo "3️⃣  Crée RFQ test (trigger email seller)"
RFQ_RESP=$(curl -sS -X POST "$API_BASE/marketplace/quote-requests" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"marketplaceOfferId\":\"$OFFER_ID\",\"requestedQuantity\":1,\"requestedUnit\":\"kg\",\"deliveryCountry\":\"FR\",\"message\":\"smoke-resend-test-$(date +%s)\"}")

echo "  Response: $(echo "$RFQ_RESP" | head -c 200)"

# 4. Attendre que le job email soit traité
echo ""
echo "4️⃣  Attente 4s pour traitement async email"
sleep 4

# 5. Vérifier dernier EmailLog
echo ""
echo "5️⃣  Vérifie dernier EmailLog (status + provider_message_id)"
ssh "$VPS_HOST" "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml exec -T postgres psql -U iox -d iox_prod -c \"SELECT template_id, status, provider_message_id, recipient_email, created_at FROM email_logs ORDER BY created_at DESC LIMIT 3\""

echo ""
echo "✅ Smoke terminé. Validations manuelles complémentaires :"
echo "   - Resend dashboard → Logs : email présent + status delivered"
echo "   - Boîte mail destinataire seller → email reçu"
echo "   - Si status=SENT mais pas delivered → vérifier DKIM/SPF/DMARC"
