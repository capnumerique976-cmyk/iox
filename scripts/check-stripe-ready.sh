#!/usr/bin/env bash
# M138 — Vérification préconditions Stripe test mode
# Usage : ./scripts/check-stripe-ready.sh [--vps]
#
# Sans flag : vérifie l'environnement local (apps/backend/.env)
# Avec --vps : vérifie via l'endpoint /health/stripe du VPS staging

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
RESET='\033[0m'

ok()    { echo -e "${GREEN}✅ $*${RESET}"; }
fail()  { echo -e "${RED}❌ $*${RESET}"; }
warn()  { echo -e "${YELLOW}⚠️  $*${RESET}"; }
info()  { echo -e "   $*"; }

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/backend/.env"
VPS_BASE="https://iox.mycloud.yt"
MODE="${1:-}"

echo ""
echo "══════════════════════════════════════════"
echo "  IOX Stripe Readiness Check — M138"
echo "══════════════════════════════════════════"
echo ""

PASS=0
FAIL=0

# ─── Helpers ────────────────────────────────────────────────────────────────

mask() {
  local v="$1"
  local len="${#v}"
  if [[ $len -le 8 ]]; then echo "****"; return; fi
  echo "${v:0:7}...${v: -4}"
}

# ─── Mode VPS ───────────────────────────────────────────────────────────────

if [[ "$MODE" == "--vps" ]]; then
  echo "Mode : VPS staging ($VPS_BASE)"
  echo ""

  if ! command -v curl &>/dev/null; then
    fail "curl non disponible"; exit 1
  fi

  RESPONSE=$(curl -s --max-time 5 "$VPS_BASE/api/v1/health/stripe" 2>/dev/null || echo "{}")
  CONFIGURED=$(echo "$RESPONSE" | grep -o '"configured":[^,}]*' | cut -d: -f2 | tr -d ' ')
  MODE_VAL=$(echo "$RESPONSE"   | grep -o '"mode":"[^"]*"'     | cut -d: -f2 | tr -d '"')
  WEBHOOK=$(echo "$RESPONSE"    | grep -o '"webhookConfigured":[^,}]*' | cut -d: -f2 | tr -d ' ')
  CHECKOUT=$(echo "$RESPONSE"   | grep -o '"checkoutEnabled":[^,}]*'  | cut -d: -f2 | tr -d ' ')

  echo "Réponse brute : $RESPONSE"
  echo ""

  if [[ "$CONFIGURED" == "true" ]]; then
    ok "STRIPE_SECRET_KEY configurée (mode: $MODE_VAL)"; ((PASS++))
  else
    fail "STRIPE_SECRET_KEY absente ou vide"; ((FAIL++))
  fi

  if [[ "$MODE_VAL" == "test" ]]; then
    ok "Mode TEST (sk_test_...)"; ((PASS++))
  elif [[ "$MODE_VAL" == "live" ]]; then
    fail "Mode LIVE détecté — N'utiliser que les clés test en staging !"; ((FAIL++))
  else
    warn "Mode inconnu ou non configuré"; ((FAIL++))
  fi

  if [[ "$WEBHOOK" == "true" ]]; then
    ok "STRIPE_WEBHOOK_SECRET configurée"; ((PASS++))
  else
    fail "STRIPE_WEBHOOK_SECRET absente"; ((FAIL++))
  fi

  if [[ "$CHECKOUT" == "true" ]]; then
    ok "Checkout activé (configured + webhook OK)"; ((PASS++))
  else
    fail "Checkout désactivé — vérifier clés ci-dessus"; ((FAIL++))
  fi

# ─── Mode local ─────────────────────────────────────────────────────────────

else
  echo "Mode : local ($ENV_FILE)"
  echo ""

  if [[ ! -f "$ENV_FILE" ]]; then
    fail ".env absent : $ENV_FILE"
    echo ""
    info "Créer apps/backend/.env depuis apps/backend/.env.example"
    exit 1
  fi

  # Charger les variables Stripe depuis .env (sans exporter)
  STRIPE_KEY=""
  WEBHOOK_KEY=""
  PUBLISH_KEY=""
  SEED_STRIPE=""

  while IFS= read -r line; do
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    val="${val%\"}"
    val="${val#\"}"
    case "$key" in
      STRIPE_SECRET_KEY)    STRIPE_KEY="$val"  ;;
      STRIPE_WEBHOOK_SECRET) WEBHOOK_KEY="$val" ;;
      STRIPE_PUBLISHABLE_KEY) PUBLISH_KEY="$val" ;;
      SEED_STRIPE_ACCOUNT_ID) SEED_STRIPE="$val" ;;
    esac
  done < "$ENV_FILE"

  # Check 1 — STRIPE_SECRET_KEY
  if [[ -z "$STRIPE_KEY" ]]; then
    fail "STRIPE_SECRET_KEY manquante dans .env"; ((FAIL++))
    info "Ajouter : STRIPE_SECRET_KEY=\"sk_test_51...\""
  elif [[ "$STRIPE_KEY" == sk_test_* ]]; then
    ok "STRIPE_SECRET_KEY présente (test mode) — $(mask "$STRIPE_KEY")"; ((PASS++))
  elif [[ "$STRIPE_KEY" == sk_live_* ]]; then
    fail "STRIPE_SECRET_KEY est une clé LIVE — utiliser sk_test_ uniquement en staging !"; ((FAIL++))
  else
    warn "STRIPE_SECRET_KEY présente mais préfixe inconnu : $(mask "$STRIPE_KEY")"; ((FAIL++))
  fi

  # Check 2 — STRIPE_WEBHOOK_SECRET
  if [[ -z "$WEBHOOK_KEY" ]]; then
    fail "STRIPE_WEBHOOK_SECRET manquante dans .env"; ((FAIL++))
    info "Générer via : stripe listen --forward-to localhost:3001/api/v1/payments/webhook"
    info "Puis copier le 'whsec_...' affiché."
  elif [[ "$WEBHOOK_KEY" == whsec_* ]]; then
    ok "STRIPE_WEBHOOK_SECRET présente — $(mask "$WEBHOOK_KEY")"; ((PASS++))
  else
    warn "STRIPE_WEBHOOK_SECRET présente mais préfixe inconnu : $(mask "$WEBHOOK_KEY")"; ((FAIL++))
  fi

  # Check 3 — STRIPE_PUBLISHABLE_KEY (optionnel V1)
  if [[ -z "$PUBLISH_KEY" ]]; then
    warn "STRIPE_PUBLISHABLE_KEY absente (non critique en V1 — pas de Stripe.js côté frontend)";
  elif [[ "$PUBLISH_KEY" == pk_test_* ]]; then
    ok "STRIPE_PUBLISHABLE_KEY présente (test mode)"; ((PASS++))
  elif [[ "$PUBLISH_KEY" == pk_live_* ]]; then
    fail "STRIPE_PUBLISHABLE_KEY est une clé LIVE !"; ((FAIL++))
  fi

  # Check 4 — SEED_STRIPE_ACCOUNT_ID
  if [[ -z "$SEED_STRIPE" ]]; then
    warn "SEED_STRIPE_ACCOUNT_ID absent — seed utilisera acct_demo_stripe_test_001 (fictif)";
    info "Pour checkout réel : SEED_STRIPE_ACCOUNT_ID=acct_... (vrai compte Stripe Connect test)"
  elif [[ "$SEED_STRIPE" == acct_demo_* ]]; then
    warn "SEED_STRIPE_ACCOUNT_ID = ID fictif ($SEED_STRIPE) — checkout réel impossible";
    info "Remplacer par un vrai acct_ Stripe test Connect."
  elif [[ "$SEED_STRIPE" == acct_* ]]; then
    ok "SEED_STRIPE_ACCOUNT_ID = $(mask "$SEED_STRIPE") (vrai compte Stripe)"; ((PASS++))
  fi

fi

# ─── Résultat final ──────────────────────────────────────────────────────────

echo ""
echo "══════════════════════════════════════════"
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}  GO — Stripe test mode prêt ($PASS checks OK)${RESET}"
else
  echo -e "${RED}  BLOQUÉ — $FAIL check(s) en échec, $PASS OK${RESET}"
  echo ""
  echo "  Prochaine étape : docs/PAY_1_STRIPE_TEST_ACTIVATION.md"
fi
echo "══════════════════════════════════════════"
echo ""

exit $FAIL
