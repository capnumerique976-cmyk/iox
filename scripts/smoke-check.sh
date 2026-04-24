#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  IOX — smoke-check post-boot
# ─────────────────────────────────────────────────────────
#  Vérifie qu'une préprod fraîchement démarrée répond
#  correctement sur les 4 surfaces critiques :
#    1. Liveness backend
#    2. Readiness backend (DB + storage config)
#    3. Frontend sert du HTML
#    4. Metrics (public ou protégé par METRICS_TOKEN)
#
#  Usage (hôte préprod, après `docker compose up -d`) :
#    ./scripts/smoke-check.sh
#    BASE_BACKEND=http://127.0.0.1:3001 \
#    BASE_FRONTEND=http://127.0.0.1:3000 \
#    METRICS_TOKEN=xxx ./scripts/smoke-check.sh
#
#  Usage (via reverse proxy public) :
#    BASE_BACKEND=https://preprod.iox.mch \
#    BASE_FRONTEND=https://preprod.iox.mch \
#    ./scripts/smoke-check.sh
#
#  Sortie : 0 si tout OK, 1 sinon. Affiche un résumé coloré.
# ─────────────────────────────────────────────────────────
set -u

BACK="${BASE_BACKEND:-http://127.0.0.1:3001}"
FRONT="${BASE_FRONTEND:-http://127.0.0.1:3000}"
TOKEN="${METRICS_TOKEN:-}"
TIMEOUT="${SMOKE_TIMEOUT:-5}"

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'
failed=0
total=0

say_ok()   { printf "  ${GREEN}✔${RESET} %s\n" "$1"; }
say_warn() { printf "  ${YELLOW}⚠${RESET} %s\n" "$1"; }
say_fail() { printf "  ${RED}✗${RESET} %s\n" "$1"; failed=$((failed+1)); }

check_http() {
  local name="$1" url="$2" expected="$3" extra="${4:-}"
  total=$((total+1))
  local code
  # shellcheck disable=SC2086
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" $extra "$url" 2>/dev/null || echo "000")
  if [ "$code" = "$expected" ]; then
    say_ok "$name — $url → $code"
  else
    say_fail "$name — $url → $code (attendu $expected)"
  fi
}

check_contains() {
  local name="$1" url="$2" needle="$3" extra="${4:-}"
  total=$((total+1))
  local body
  # shellcheck disable=SC2086
  body=$(curl -sS --max-time "$TIMEOUT" $extra "$url" 2>/dev/null || echo "")
  if printf '%s' "$body" | grep -q -- "$needle"; then
    say_ok "$name — contient '$needle'"
  else
    say_fail "$name — '$needle' absent de la réponse"
  fi
}

echo
echo "🔎  IOX smoke-check"
echo "    backend  = $BACK"
echo "    frontend = $FRONT"
echo "    metrics  = $([ -n "$TOKEN" ] && echo "protégé (bearer)" || echo "public")"
echo

# ── Backend liveness ────────────────────────────────────
check_http "backend liveness"  "$BACK/api/v1/health/live" "200"
check_contains "backend liveness body" "$BACK/api/v1/health/live" '"status":"ok"'

# ── Backend readiness ───────────────────────────────────
check_http "backend readiness" "$BACK/api/v1/health"      "200"
check_contains "readiness database up" "$BACK/api/v1/health" '"database"'
check_contains "readiness storage up"  "$BACK/api/v1/health" '"storage"'

# ── Frontend HTML ───────────────────────────────────────
check_http "frontend HTML" "$FRONT/" "200"
check_contains "frontend HTML contient <html" "$FRONT/" "<html"

# ── Auth : refuse login vide (sanity JWT module monté) ─
# POST /auth/login sans body → 400 (ValidationPipe) ou 401, mais pas 500.
code_login=$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" \
  -X POST -H 'Content-Type: application/json' -d '{}' \
  "$BACK/api/v1/auth/login" 2>/dev/null || echo "000")
total=$((total+1))
case "$code_login" in
  400|401|422) say_ok "auth/login réagit correctement à body vide → $code_login" ;;
  500|502|503|504) say_fail "auth/login retourne $code_login (erreur serveur)" ;;
  000)             say_fail "auth/login injoignable" ;;
  *)               say_warn "auth/login code inattendu $code_login (ni 4xx ni 5xx)" ;;
esac

# ── Metrics ─────────────────────────────────────────────
if [ -n "$TOKEN" ]; then
  # Token actif : sans token → 401, avec token → 200
  check_http "metrics sans token → 401" "$BACK/api/v1/metrics" "401"
  check_http "metrics avec token → 200" "$BACK/api/v1/metrics" "200" \
    "-H 'Authorization: Bearer $TOKEN'"
  check_contains "metrics contient iox_http_requests_total" \
    "$BACK/api/v1/metrics" "iox_http_requests_total" \
    "-H 'Authorization: Bearer $TOKEN'"
else
  check_http "metrics public → 200" "$BACK/api/v1/metrics" "200"
  check_contains "metrics contient iox_http_requests_total" \
    "$BACK/api/v1/metrics" "iox_http_requests_total"
fi

# ── Résumé ──────────────────────────────────────────────
echo
if [ "$failed" -eq 0 ]; then
  printf "${GREEN}✔ smoke-check OK (%d checks)${RESET}\n\n" "$total"
  exit 0
fi
printf "${RED}✗ smoke-check KO — %d échec(s) sur %d${RESET}\n\n" "$failed" "$total"
exit 1
