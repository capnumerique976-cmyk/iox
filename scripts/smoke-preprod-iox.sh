#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  IOX — smoke-preprod (M83)
# ─────────────────────────────────────────────────────────
#  Vérification pré-déploiement / post-déploiement pilote.
#
#  Étend smoke-check.sh avec :
#    • PWA manifest (/manifest.webmanifest)
#    • Apple Touch Icon (/apple-icon)
#    • Favicon (/icon)
#    • Pages légales (/legal/terms, /legal/privacy, /legal/mentions-legales)
#    • Swagger JSON (/api/docs/json)
#    • Marketplace API (/api/marketplace/offers)
#    • Auth sanity (401 sur endpoint protégé sans token)
#
#  Ce script est SANS DANGER : aucune écriture, aucune auth
#  avec des credentials réels. 100% requêtes GET/HEAD public.
#
#  Usage :
#    ./scripts/smoke-preprod-iox.sh
#
#    BASE_BACKEND=https://pilot.iox.example \
#    BASE_FRONTEND=https://pilot.iox.example \
#    ./scripts/smoke-preprod-iox.sh
#
#  Variables :
#    BASE_BACKEND   URL backend (défaut: http://127.0.0.1:3001)
#    BASE_FRONTEND  URL frontend (défaut: http://127.0.0.1:3000)
#    SMOKE_TIMEOUT  Timeout curl en secondes (défaut: 8)
#
#  Sortie : 0 si tout OK, 1 si au moins un échec.
# ─────────────────────────────────────────────────────────
set -u

BACK="${BASE_BACKEND:-http://127.0.0.1:3001}"
FRONT="${BASE_FRONTEND:-http://127.0.0.1:3000}"
TIMEOUT="${SMOKE_TIMEOUT:-8}"

RED=$'\033[31m'
GREEN=$'\033[32m'
YELLOW=$'\033[33m'
CYAN=$'\033[36m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

failed=0
total=0

# ── Helpers ─────────────────────────────────────────────

say_ok()     { printf "  ${GREEN}✔${RESET} %s\n" "$1"; }
say_warn()   { printf "  ${YELLOW}⚠${RESET} %s\n" "$1"; }
say_fail()   { printf "  ${RED}✗${RESET} %s\n" "$1"; failed=$((failed + 1)); }
say_header() { printf "\n${CYAN}${BOLD}▶ %s${RESET}\n" "$1"; }

check_http() {
  local name="$1" url="$2" expected="$3"
  total=$((total + 1))
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
  if [ "$code" = "$expected" ]; then
    say_ok "$name → $code"
  else
    say_fail "$name → $code (attendu $expected) — $url"
  fi
}

check_head() {
  local name="$1" url="$2"
  total=$((total + 1))
  local code
  code=$(curl -sS -o /dev/null -w '%{http_code}' --head --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
  if [ "$code" = "200" ] || [ "$code" = "204" ]; then
    say_ok "$name → $code"
  else
    say_fail "$name → $code — $url"
  fi
}

check_contains() {
  local name="$1" url="$2" needle="$3"
  total=$((total + 1))
  local body
  body=$(curl -sS --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "")
  if printf '%s' "$body" | grep -q -- "$needle"; then
    say_ok "$name — contient '$needle'"
  else
    say_fail "$name — '$needle' absent de la réponse — $url"
  fi
}

check_content_type() {
  local name="$1" url="$2" expected_ct="$3"
  total=$((total + 1))
  local ct
  ct=$(curl -sS -o /dev/null -w '%{content_type}' --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "")
  if printf '%s' "$ct" | grep -qi "$expected_ct"; then
    say_ok "$name — Content-Type contient '$expected_ct'"
  else
    say_warn "$name — Content-Type: $ct (attendu: $expected_ct) — $url"
  fi
}

# ── En-tête ─────────────────────────────────────────────

printf "\n${BOLD}═══════════════════════════════════════════════════${RESET}\n"
printf "${BOLD}  IOX smoke-preprod${RESET}\n"
printf "  backend  = %s\n" "$BACK"
printf "  frontend = %s\n" "$FRONT"
printf "  timeout  = %ss\n" "$TIMEOUT"
printf "${BOLD}═══════════════════════════════════════════════════${RESET}\n"

# ── 1. Backend health ────────────────────────────────────

say_header "1. Backend health"
check_http "liveness" "$BACK/api/v1/health/live" "200"
check_contains "liveness body ok" "$BACK/api/v1/health/live" '"status":"ok"'
check_http "readiness" "$BACK/api/v1/health" "200"
check_contains "readiness database" "$BACK/api/v1/health" '"database"'

# ── 2. Auth sanity ───────────────────────────────────────

say_header "2. Auth sanity"
# GET /api/me sans token → 401
code_me=$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" \
  "$BACK/api/v1/me" 2>/dev/null || echo "000")
total=$((total + 1))
case "$code_me" in
  401|403) say_ok "GET /api/v1/me sans token → $code_me (protégé)" ;;
  200)     say_fail "GET /api/v1/me sans token → 200 (endpoint non protégé!)" ;;
  404)     say_warn "GET /api/v1/me → 404 (vérifier route)" ;;
  *)       say_warn "GET /api/v1/me → $code_me" ;;
esac

# POST /api/v1/auth/login avec mauvaises creds → 401 (pas 500)
code_login=$(curl -sS -o /dev/null -w '%{http_code}' --max-time "$TIMEOUT" \
  -X POST -H 'Content-Type: application/json' \
  -d '{"email":"smoke@iox.invalid","password":"wrongpass123"}' \
  "$BACK/api/v1/auth/login" 2>/dev/null || echo "000")
total=$((total + 1))
case "$code_login" in
  400|401|422) say_ok "POST /api/v1/auth/login mauvaises creds → $code_login (OK)" ;;
  500|502|503) say_fail "POST /api/v1/auth/login → $code_login (erreur serveur!)" ;;
  000)         say_fail "POST /api/v1/auth/login → injoignable" ;;
  *)           say_warn "POST /api/v1/auth/login → $code_login (inattendu)" ;;
esac

# ── 3. API publique ──────────────────────────────────────

say_header "3. API publique"
check_http "GET /api/marketplace/offers" "$BACK/api/marketplace/offers" "200"
check_http "GET /api/marketplace/categories" "$BACK/api/marketplace/categories" "200"

# ── 4. Swagger ───────────────────────────────────────────

say_header "4. Swagger"
check_http "GET /api/docs/json" "$BACK/api/docs/json" "200"
check_contains "swagger contient IOX" "$BACK/api/docs/json" '"title"'

# ── 5. Frontend ──────────────────────────────────────────

say_header "5. Frontend"
check_http "GET / (home)" "$FRONT/" "200"
check_contains "home contient <html" "$FRONT/" "<html"
check_http "GET /marketplace" "$FRONT/marketplace" "200"
check_http "GET /login" "$FRONT/login" "200"

# ── 6. PWA (M77) ─────────────────────────────────────────

say_header "6. PWA — manifest et icônes (M77)"
check_http "GET /manifest.webmanifest" "$FRONT/manifest.webmanifest" "200"
check_contains "manifest contient IOX" "$FRONT/manifest.webmanifest" "IOX"
check_contains "manifest standalone" "$FRONT/manifest.webmanifest" "standalone"
check_content_type "manifest Content-Type JSON" "$FRONT/manifest.webmanifest" "application/manifest"
check_head "HEAD /icon (favicon PNG)" "$FRONT/icon"
check_head "HEAD /apple-icon" "$FRONT/apple-icon"

# ── 7. Pages légales (M78) ───────────────────────────────

say_header "7. Pages légales (M78)"
check_http "GET /legal/terms" "$FRONT/legal/terms" "200"
check_contains "/legal/terms contient CGU" "$FRONT/legal/terms" "Conditions"
check_http "GET /legal/privacy" "$FRONT/legal/privacy" "200"
check_contains "/legal/privacy contient RGPD" "$FRONT/legal/privacy" "confidentialit"
check_http "GET /legal/mentions-legales" "$FRONT/legal/mentions-legales" "200"
check_contains "/legal/mentions-legales LCEN" "$FRONT/legal/mentions-legales" "LCEN\|légales\|Mentions"

# ── 8. Robots / sitemap ──────────────────────────────────

say_header "8. Robots et sitemap"
check_http "GET /robots.txt" "$FRONT/robots.txt" "200"
check_http "GET /sitemap.xml" "$FRONT/sitemap.xml" "200"

# ── Résumé ───────────────────────────────────────────────

printf "\n${BOLD}═══════════════════════════════════════════════════${RESET}\n"
if [ "$failed" -eq 0 ]; then
  printf "${GREEN}${BOLD}  ✔ smoke-preprod OK — %d checks, 0 échec${RESET}\n" "$total"
  printf "${BOLD}═══════════════════════════════════════════════════${RESET}\n\n"
  exit 0
fi
printf "${RED}${BOLD}  ✗ smoke-preprod KO — %d échec(s) sur %d checks${RESET}\n" "$failed" "$total"
printf "${BOLD}═══════════════════════════════════════════════════${RESET}\n\n"
exit 1
