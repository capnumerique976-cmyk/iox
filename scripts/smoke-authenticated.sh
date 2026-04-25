#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  IOX — smoke-check AUTHENTIFIÉ
# ─────────────────────────────────────────────────────────
#  Complément de scripts/smoke-check.sh : effectue un VRAI
#  parcours utilisateur connecté pour piéger les régressions
#  d'authentification, de payload, ou d'endpoints qui
#  retournent HTTP 200 mais lèvent un erreur en runtime.
#
#  Le smoke-check public a uniquement vérifié que les routes
#  publiques répondent. Ce script-ci :
#    1. Login avec un compte de test
#    2. Vérifie que le token est présent dans la réponse
#    3. Appelle les endpoints critiques avec Bearer
#    4. Vérifie absence de 401/403/5xx ET absence de payload
#       d'erreur (`{ "error": ... }`)
#    5. Refresh token roundtrip (sanity)
#
#  Pourquoi ce script existe : un déploiement frontend peut
#  laisser passer des HTTP 200 publics tout en cassant les
#  fetchs authentifiés (cookie/token mal propagé, expiration
#  silencieuse, hydratation cassée, etc). Le déploiement Lot 7
#  d'avril 2026 a montré ce trou — on s'assure qu'il ne se
#  reproduise pas.
#
#  Modèle "tiered" (Lot 8) :
#    - call_required → endpoint qui DOIT répondre 200 sur Lot 6
#      (baseline prod actuelle). Un échec = NO-GO.
#    - call_optional → endpoint qui peut être absent (404/501)
#      sans bloquer la baseline ; tout autre statut reste un ✗.
#    - HAS_LOT7 (auto-détection via probe /referentiel) :
#      les routes Lot 7 (/referentiel /production /marketplace-hub
#      /distribution) sont required si Lot 7 est déployé,
#      sinon optionnelles. Override : SMOKE_LOT7=1|0.
#
#  Usage local :
#    BASE_URL=http://localhost:3000 \
#    SMOKE_EMAIL=admin@iox.local \
#    SMOKE_PASSWORD=admin123 \
#    ./scripts/smoke-authenticated.sh
#
#  Usage prod (idem mais avec compte de test dédié) :
#    BASE_URL=https://iox.mycloud.yt \
#    SMOKE_EMAIL=smoke@iox.mch \
#    SMOKE_PASSWORD='***' \
#    ./scripts/smoke-authenticated.sh
#
#  Sortie : 0 si tout OK, 1 sinon.
# ─────────────────────────────────────────────────────────
set -u

# Charge un fichier d'env local s'il existe (hors repo, gitignoré).
# Priorité : --env-file CLI > $SMOKE_ENV_FILE > ~/.iox-smoke.env > scripts/.iox-smoke.env
for candidate in \
  "${SMOKE_ENV_FILE:-}" \
  "${HOME}/.iox-smoke.env" \
  "$(dirname "$0")/.iox-smoke.env"
do
  if [[ -n "$candidate" && -f "$candidate" ]]; then
    # shellcheck disable=SC1090
    source "$candidate"
    echo "📄 env chargé depuis $candidate"
    break
  fi
done

BASE="${BASE_URL:-http://localhost:3000}"
EMAIL="${SMOKE_EMAIL:-}"
PASSWORD="${SMOKE_PASSWORD:-}"
TIMEOUT="${SMOKE_TIMEOUT:-10}"

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; CYAN=$'\033[36m'; RESET=$'\033[0m'
failed=0
skipped=0
total=0

say_ok()   { printf "  ${GREEN}✔${RESET} %s\n" "$1"; }
say_warn() { printf "  ${YELLOW}⚠${RESET} %s\n" "$1"; }
say_fail() { printf "  ${RED}✗${RESET} %s\n" "$1"; failed=$((failed+1)); }
say_skip() { printf "  ${CYAN}⊝${RESET} %s\n" "$1"; skipped=$((skipped+1)); }

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "${RED}ERR${RESET}: SMOKE_EMAIL et SMOKE_PASSWORD requis." >&2
  echo "Voir : docs/ops/SMOKE-AUTH.md" >&2
  echo >&2
  echo "Exemples :" >&2
  echo "  # local (compte seed)" >&2
  echo "  SMOKE_EMAIL='admin@iox.mch' SMOKE_PASSWORD='Admin@IOX2026!' $0" >&2
  echo >&2
  echo "  # fichier env (recommandé)" >&2
  echo "  echo \"SMOKE_EMAIL=admin@iox.mch\"        >  ~/.iox-smoke.env" >&2
  echo "  echo \"SMOKE_PASSWORD='Admin@IOX2026!'\"   >> ~/.iox-smoke.env" >&2
  echo "  chmod 600 ~/.iox-smoke.env && $0" >&2
  exit 2
fi

# Garde-fou : détecte les guillemets courbes souvent introduits par les
# clients macOS (Notes, Messages, Mail) quand on copie-colle un mot de passe.
# C'est LA cause la plus fréquente de "login impossible" en smoke.
if printf '%s' "$EMAIL$PASSWORD" | LC_ALL=C grep -q $'[\xe2][\x80][\x98-\x9b]'; then
  echo "${RED}ERR${RESET}: SMOKE_EMAIL ou SMOKE_PASSWORD contient des guillemets Unicode (’ ‘ “ ”)." >&2
  echo "       Ré-encode en ASCII (apostrophes droites '  et guillemets \" ). Voir SMOKE-AUTH.md." >&2
  exit 2
fi

# Trim d'éventuels espaces (fin de mot de passe) copiés depuis un doc.
# On ne trim JAMAIS le milieu — seulement leading/trailing.
EMAIL="${EMAIL#"${EMAIL%%[![:space:]]*}"}"; EMAIL="${EMAIL%"${EMAIL##*[![:space:]]}"}"
PASSWORD="${PASSWORD#"${PASSWORD%%[![:space:]]*}"}"; PASSWORD="${PASSWORD%"${PASSWORD##*[![:space:]]}"}"

if ! command -v jq >/dev/null 2>&1; then
  echo "${RED}ERR${RESET}: jq requis (brew install jq)" >&2
  exit 2
fi
if ! command -v curl >/dev/null 2>&1; then
  echo "${RED}ERR${RESET}: curl requis" >&2
  exit 2
fi

echo
echo "🔐  IOX smoke-check AUTHENTIFIÉ"
echo "    base  = $BASE"
echo "    user  = $EMAIL"
echo

# ── 1. Login ────────────────────────────────────────────────
total=$((total+1))
LOGIN_TMP=$(mktemp)
# On utilise jq pour construire le JSON : robuste aux caractères spéciaux
# dans le mot de passe (guillemets, backslash, dollar…) que le shell
# mangerait via une simple interpolation.
LOGIN_PAYLOAD=$(jq -cn --arg email "$EMAIL" --arg password "$PASSWORD" \
  '{email: $email, password: $password}')

LOGIN_CODE=$(curl -sS -k --max-time "$TIMEOUT" \
  -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$LOGIN_PAYLOAD" \
  -o "$LOGIN_TMP" -w '%{http_code}' 2>/dev/null || echo "000")
LOGIN_BODY=$(cat "$LOGIN_TMP")
rm -f "$LOGIN_TMP"

TOKEN=$(printf '%s' "$LOGIN_BODY" | jq -r '.data.accessToken // .accessToken // empty' 2>/dev/null || true)
REFRESH=$(printf '%s' "$LOGIN_BODY" | jq -r '.data.refreshToken // .refreshToken // empty' 2>/dev/null || true)
USER_ROLE=$(printf '%s' "$LOGIN_BODY" | jq -r '.data.user.role // .user.role // empty' 2>/dev/null || true)

if [[ -z "$TOKEN" ]]; then
  say_fail "login → HTTP $LOGIN_CODE, pas d'accessToken"
  echo "    base      : $BASE"
  echo "    email     : $EMAIL"
  echo "    pwd length: ${#PASSWORD} char(s)"
  echo "${YELLOW}Diagnostic :${RESET}"
  case "$LOGIN_CODE" in
    000) echo "  → connexion impossible au backend (DNS, TLS, réseau, proxy)" ;;
    401) echo "  → credentials invalides (compte inconnu, mauvais mot de passe, compte inactif)" ;;
    403) echo "  → accès refusé par middleware (CORS, CSRF, geoblock)" ;;
    404) echo "  → endpoint /api/v1/auth/login introuvable (mauvais BASE_URL ?)" ;;
    429) echo "  → rate-limit throttler (attendre 1 min)" ;;
    5*)  echo "  → erreur backend — consulter les logs serveur" ;;
    *)   echo "  → code inattendu" ;;
  esac
  echo "${YELLOW}Réponse brute (500 premiers octets) :${RESET}"
  echo "  $(printf '%s' "$LOGIN_BODY" | head -c 500)"
  echo
  printf "${RED}✗ smoke-authentifié KO — login impossible${RESET}\n\n"
  exit 1
fi
say_ok "login OK (HTTP $LOGIN_CODE, rôle=$USER_ROLE, token=${TOKEN:0:12}…)"

# ── 2. Helper : appel authentifié + validation payload ─────
# Modes :
#   call_required <label> <method> <path> [<expected_field>]
#       → un échec compte dans `failed` (NO-GO baseline)
#   call_optional <label> <method> <path> [<expected_field>]
#       → un 200 est tracé en ✔ ; un 404/501 est tracé en ⊝ skip (acceptable
#       sur Lot 6, on signale juste que la feature n'est pas encore là) ;
#       tout autre échec (401/403/5xx) reste un ✗ failure.
# Vérifie : status 200 ET pas d'attribut `.error` dans le body. Si
# <expected_field> est fourni, vérifie que jq peut l'extraire.
_call_inner() {
  local mode="$1" label="$2" method="$3" path="$4" arrayField="${5:-}"
  total=$((total+1))
  local tmp; tmp=$(mktemp)
  local code
  code=$(curl -sS -k --max-time "$TIMEOUT" \
    -X "$method" "$BASE$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -o "$tmp" -w '%{http_code}' 2>/dev/null || echo "000")

  if [[ "$code" != "200" ]]; then
    if [[ "$mode" == "optional" && ( "$code" == "404" || "$code" == "501" ) ]]; then
      say_skip "$label — $method $path → $code (optionnel, skip)"
      rm -f "$tmp"
      return
    fi
    say_fail "$label — $method $path → $code"
    [[ -s "$tmp" ]] && echo "    body: $(head -c 200 "$tmp")"
    rm -f "$tmp"
    return
  fi

  # Détection d'un payload d'erreur (envelope { error: ... }) — un endpoint
  # peut renvoyer 200 mais avec une erreur logique en body.
  if jq -e '.error' "$tmp" >/dev/null 2>&1; then
    say_fail "$label — 200 mais payload contient .error"
    echo "    body: $(jq -c '.error' "$tmp")"
    rm -f "$tmp"
    return
  fi

  if [[ -n "$arrayField" ]]; then
    if ! jq -e "$arrayField" "$tmp" >/dev/null 2>&1; then
      say_fail "$label — $method $path → 200 mais champ $arrayField absent"
      rm -f "$tmp"
      return
    fi
  fi

  say_ok "$label — $method $path → 200"
  rm -f "$tmp"
}
call_required() { _call_inner required "$@"; }
call_optional() { _call_inner optional "$@"; }
# Compat ascendante avec les anciens scripts qui utiliseraient `call_auth`.
call_auth()     { _call_inner required "$@"; }

# ── 2 bis. Détection automatique Lot 7 (top nav + landings) ──
# Lot 7 ajoute /referentiel /production /marketplace-hub /distribution.
# Si /referentiel répond 200 → Lot 7 considéré présent.
# Override possible : SMOKE_LOT7=1 (force) ou SMOKE_LOT7=0 (force absence).
detect_lot7() {
  if [[ -n "${SMOKE_LOT7:-}" ]]; then
    [[ "$SMOKE_LOT7" == "1" ]] && return 0 || return 1
  fi
  local code
  code=$(curl -sS -k --max-time "$TIMEOUT" -o /dev/null -w '%{http_code}' \
    "$BASE/referentiel" 2>/dev/null || echo "000")
  [[ "$code" == "200" ]]
}
if detect_lot7; then
  HAS_LOT7=1
  echo "${CYAN}ℹ Lot 7 détecté (routes /referentiel, …) — endpoints Lot 7 vérifiés en ✔/✗${RESET}"
else
  HAS_LOT7=0
  echo "${CYAN}ℹ Lot 7 absent — endpoints Lot 7 traités en optionnels (skip si 404)${RESET}"
fi
echo

# ── 3. Endpoints dashboard (Lot 6 obligatoires) ────────────
echo "${CYAN}— Dashboard${RESET}"
call_required "stats globales"      GET "/api/v1/dashboard/stats"            '.data // .'
call_required "alerts"              GET "/api/v1/dashboard/alerts"           '.data // .'
call_required "activité récente"    GET "/api/v1/dashboard/recent-activity"  '.data // .'

# ── 4. Listings métier (Lot 6 obligatoires) ────────────────
echo "${CYAN}— Listings métier${RESET}"
call_required "bénéficiaires"       GET "/api/v1/beneficiaries?page=1&limit=5"
call_required "produits"            GET "/api/v1/products?page=1&limit=5"
call_required "entreprises"         GET "/api/v1/companies?page=1&limit=5"
call_required "lots entrants"       GET "/api/v1/inbound-batches?page=1&limit=5"
call_required "lots finis"          GET "/api/v1/product-batches?page=1&limit=5"
call_required "validations label"   GET "/api/v1/label-validations?page=1&limit=5"
call_required "distributions"       GET "/api/v1/distributions?page=1&limit=5"
call_required "incidents"           GET "/api/v1/incidents?page=1&limit=5"
call_required "documents"           GET "/api/v1/documents?page=1&limit=5"
call_required "supply-contracts"    GET "/api/v1/supply-contracts?page=1&limit=5"
call_required "transformations"     GET "/api/v1/transformation-operations?page=1&limit=5"

# ── 5. Endpoints admin (rôle ADMIN — préfixes réels backend) ─
# Préfixes vérifiés dans apps/backend/src/**/controller.ts :
#   - admin/memberships         (PAS /memberships)
#   - marketplace/review-queue  (PAS /review-queue)
#   - marketplace/quote-requests (PAS /quote-requests)
#   - marketplace/seller-profiles (PAS /seller-profiles)
if [[ "$USER_ROLE" == "ADMIN" ]]; then
  echo "${CYAN}— Admin (rôle ADMIN détecté)${RESET}"
  call_required "users list"             GET "/api/v1/users?page=1&limit=5"
  call_required "audit logs"             GET "/api/v1/audit-logs?page=1&limit=5"
  call_required "memberships diagnostic" GET "/api/v1/admin/memberships/diagnostic"
  call_required "memberships orphan-sellers"     GET "/api/v1/admin/memberships/orphan-sellers"
  call_required "memberships orphan-memberships" GET "/api/v1/admin/memberships/orphan-memberships"
  call_required "memberships list"       GET "/api/v1/admin/memberships?page=1&limit=5"
  call_required "review queue"           GET "/api/v1/marketplace/review-queue?page=1&limit=5"
  call_required "review queue stats"     GET "/api/v1/marketplace/review-queue/stats/pending"
  call_required "rfq admin"              GET "/api/v1/marketplace/quote-requests?page=1&limit=5"
  call_required "seller profiles"        GET "/api/v1/marketplace/seller-profiles?page=1&limit=5"
fi

# ── 6. Refresh token roundtrip ─────────────────────────────
if [[ -n "$REFRESH" ]]; then
  echo "${CYAN}— Refresh token${RESET}"
  total=$((total+1))
  REFRESH_BODY=$(curl -sS -k --max-time "$TIMEOUT" \
    -X POST "$BASE/api/v1/auth/refresh" \
    -H 'Content-Type: application/json' \
    -d "{\"refreshToken\":\"$REFRESH\"}" 2>/dev/null || echo '{}')
  NEW_TOKEN=$(printf '%s' "$REFRESH_BODY" | jq -r '.data.accessToken // .accessToken // empty')
  if [[ -n "$NEW_TOKEN" ]]; then
    say_ok "refresh token OK (nouveau token=${NEW_TOKEN:0:12}…)"
  else
    say_warn "refresh token : pas de nouveau accessToken (endpoint absent ou refus) — non bloquant"
  fi
fi

# ── 7. Pages frontend (HTML render) ────────────────────────
# Lot 6 obligatoires : routes qui existaient AVANT Lot 7. Un 404 = NO-GO.
# Lot 7 conditionnels : routes ajoutées par Lot 7 (top nav + landings).
#   - si Lot 7 détecté présent → traités en obligatoires.
#   - sinon → 404 acceptable (skip).
check_html() {
  local mode="$1" path="$2"
  total=$((total+1))
  local code
  code=$(curl -sS -k --max-time "$TIMEOUT" -o /dev/null -w '%{http_code}' "$BASE$path" 2>/dev/null || echo "000")
  if [[ "$code" == "200" ]]; then
    say_ok "page HTML $path → 200"
  elif [[ "$mode" == "optional" && "$code" == "404" ]]; then
    say_skip "page HTML $path → 404 (Lot 7 absent, skip)"
  else
    say_fail "page HTML $path → $code"
  fi
}

echo "${CYAN}— Pages frontend (HTML, Lot 6 obligatoires)${RESET}"
for path in /dashboard /admin /beneficiaries /products /companies \
            /inbound-batches /product-batches /transformation-operations \
            /traceability /label-validations /distributions /incidents \
            /documents /supply-contracts /seller/dashboard \
            /admin/users /admin/review-queue /admin/memberships \
            /admin/diagnostics /admin/sellers /admin/rfq; do
  check_html required "$path"
done

echo "${CYAN}— Pages frontend (HTML, Lot 7 conditionnel — auto-skip si Lot 7 absent)${RESET}"
LOT7_MODE=optional
[[ "$HAS_LOT7" == "1" ]] && LOT7_MODE=required
for path in /referentiel /production /marketplace-hub /distribution; do
  check_html "$LOT7_MODE" "$path"
done

# ── Résumé ──────────────────────────────────────────────────
echo
passed=$((total - failed - skipped))
if [[ "$failed" -eq 0 ]]; then
  if [[ "$skipped" -gt 0 ]]; then
    printf "${GREEN}✔ smoke-authentifié OK${RESET} — %d ✔  /  %d ⊝ skipped (Lot 7 absent ou endpoint optionnel)  /  %d total\n\n" \
      "$passed" "$skipped" "$total"
  else
    printf "${GREEN}✔ smoke-authentifié OK${RESET} — %d ✔ sur %d\n\n" "$passed" "$total"
  fi
  exit 0
fi
printf "${RED}✗ smoke-authentifié KO${RESET} — %d ✗ failed  /  %d ✔ passed  /  %d ⊝ skipped  /  %d total\n\n" \
  "$failed" "$passed" "$skipped" "$total"
exit 1
