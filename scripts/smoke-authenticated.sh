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

# ── 8. Lots récents (FP-3, FP-2.1, FP-3.1, FP-6) ───────────
# Ces routes sont récentes (avril 2026). On les teste en mode "expect"
# avec une whitelist de codes attendus (CSV), pour différencier :
#   - 200 = route présente et fonctionnelle
#   - 404 "Cannot GET" = ROUTE/MODULE ABSENT côté backend déployé
#     → drift de déploiement (alerte explicite, pas un simple skip)
#   - 401/403 = route présente mais accès refusé (acteur non autorisé)
# Les checks de SCHÉMA (FP-6) vérifient en plus que les nouveaux
# champs (originLocality, altitudeMeters, gpsLat, gpsLng) sont bien
# projetés par le backend public — un backend old-build laisserait
# passer les routes mais sans les nouveaux champs.
echo
echo "${CYAN}— Lots récents (FP-3, FP-2.1, FP-3.1, FP-6)${RESET}"

LAST_BODY=""
LAST_CODE=""

# http_expect <label> <method> <path> <allowed_csv> [<body>] [auth=yes|no]
http_expect() {
  local label="$1" method="$2" path="$3" allowed_csv="$4" body="${5:-}" auth="${6:-yes}"
  total=$((total+1))
  local tmp; tmp=$(mktemp)
  local code
  if [[ "$auth" == "yes" && -n "$body" ]]; then
    code=$(curl -sS -k --max-time "$TIMEOUT" -X "$method" "$BASE$path" \
      -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
      -d "$body" -o "$tmp" -w '%{http_code}' 2>/dev/null || echo "000")
  elif [[ "$auth" == "yes" ]]; then
    code=$(curl -sS -k --max-time "$TIMEOUT" -X "$method" "$BASE$path" \
      -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
      -o "$tmp" -w '%{http_code}' 2>/dev/null || echo "000")
  elif [[ -n "$body" ]]; then
    code=$(curl -sS -k --max-time "$TIMEOUT" -X "$method" "$BASE$path" \
      -H 'Content-Type: application/json' \
      -d "$body" -o "$tmp" -w '%{http_code}' 2>/dev/null || echo "000")
  else
    code=$(curl -sS -k --max-time "$TIMEOUT" -X "$method" "$BASE$path" \
      -H 'Content-Type: application/json' \
      -o "$tmp" -w '%{http_code}' 2>/dev/null || echo "000")
  fi
  LAST_BODY=$(cat "$tmp"); rm -f "$tmp"
  LAST_CODE="$code"
  if printf '%s' ",$allowed_csv," | grep -q ",$code,"; then
    say_ok "$label — $method $path → $code (∈ {$allowed_csv})"
    return 0
  fi
  say_fail "$label — $method $path → $code (attendu ∈ {$allowed_csv})"
  [[ -n "$LAST_BODY" ]] && echo "    body: $(printf '%s' "$LAST_BODY" | head -c 200)"
  return 1
}

# Détecte un drift "Cannot GET …" (= module Nest pas chargé / route inconnue)
# vs un vrai 404 métier (ressource introuvable mais route présente).
flag_drift_if_cannot_get() {
  local feature="$1"
  if [[ "$LAST_CODE" == "404" ]] && printf '%s' "$LAST_BODY" | grep -qi 'Cannot GET'; then
    say_warn "⚠ DRIFT DÉPLOIEMENT : route $feature absente du backend déployé (Cannot GET) — module non chargé"
  fi
}

DUMMY_UUID="00000000-0000-0000-0000-000000000000"

# FP-3 — seller-profile self
# 200 si l'acteur est seller, 404 si non-seller (pas de profil rattaché),
# 401 si auth muddled. Tout autre code = ✗.
http_expect "FP-3 GET seller-profiles/me" GET \
  "/api/v1/marketplace/seller-profiles/me" "200,401,404"
flag_drift_if_cannot_get "/marketplace/seller-profiles/me"

http_expect "FP-3 PATCH seller-profiles/me (no-op)" PATCH \
  "/api/v1/marketplace/seller-profiles/me" "200,400,401,404" "{}"
flag_drift_if_cannot_get "/marketplace/seller-profiles/me (PATCH)"

# FP-2 (sous-jacent à FP-2.1) — listing certifications
# 200 (liste possiblement vide), 400 (validation params), 401/403 (auth/scope).
# 404 "Cannot GET" → module FP-2 absent.
http_expect "FP-2 GET certifications" GET \
  "/api/v1/marketplace/certifications?relatedType=SELLER_PROFILE&relatedId=$DUMMY_UUID" \
  "200,400,401,403,404"
flag_drift_if_cannot_get "/marketplace/certifications"

# FP-4 / FP-6 — listing produits seller (auth) + vérif schéma FP-6
http_expect "FP-4 GET marketplace/products (seller scope)" GET \
  "/api/v1/marketplace/products?limit=5" "200,401,403"
if [[ "$LAST_CODE" == "200" ]]; then
  total=$((total+1))
  if printf '%s' "$LAST_BODY" | jq -e '
      (.data // []) | type=="array" and
      (length == 0 or
       (.[0] | has("originLocality") and has("altitudeMeters")
                and has("gpsLat") and has("gpsLng")))
    ' >/dev/null 2>&1; then
    say_ok "FP-6 schéma /marketplace/products : 4 champs origine fine projetés"
  else
    say_fail "FP-6 schéma /marketplace/products : champs originLocality/altitudeMeters/gpsLat/gpsLng absents → backend pas à jour FP-6"
    echo "    extrait: $(printf '%s' "$LAST_BODY" | jq -c '(.data//[])[0] // {}' 2>/dev/null | head -c 300)"
  fi
fi

# Catalog public — récupère un slug pour le check FP-6 public detail
http_expect "catalog public" GET "/api/v1/marketplace/catalog?limit=5" "200" "" "no"
CATALOG_SLUG=""
CATALOG_TOTAL=""
if [[ "$LAST_CODE" == "200" ]]; then
  CATALOG_SLUG=$(printf '%s' "$LAST_BODY" | jq -r '(.data // [])[0].productSlug // empty' 2>/dev/null || true)
  CATALOG_TOTAL=$(printf '%s' "$LAST_BODY" | jq -r '.meta.total // 0' 2>/dev/null || echo "0")
  printf "    ${CYAN}ℹ${RESET} catalog total=%s, premier slug=%s\n" "$CATALOG_TOTAL" "${CATALOG_SLUG:-<aucun>}"
fi

# FP-6 — fiche publique, vérifie présence des 4 champs origine fine
if [[ -n "$CATALOG_SLUG" ]]; then
  http_expect "FP-6 catalog product detail ($CATALOG_SLUG)" GET \
    "/api/v1/marketplace/catalog/products/$CATALOG_SLUG" "200" "" "no"
  if [[ "$LAST_CODE" == "200" ]]; then
    total=$((total+1))
    if printf '%s' "$LAST_BODY" | jq -e '
        has("originLocality") and has("altitudeMeters")
        and has("gpsLat") and has("gpsLng")
      ' >/dev/null 2>&1; then
      say_ok "FP-6 schéma fiche publique : 4 champs origine fine présents"
    else
      say_fail "FP-6 schéma fiche publique : champs absents → backend public PAS à jour FP-6"
      echo "    extrait: $(printf '%s' "$LAST_BODY" | jq -c '{originLocality,altitudeMeters,gpsLat,gpsLng}' 2>/dev/null || head -c 300)"
    fi
  fi
else
  say_skip "FP-6 fiche publique — aucun slug disponible (catalog vide)"
fi

# FP-3.1 — endpoint MediaAsset URL signée (présence de la route)
# Sans token : 401 (route présente, accès refusé) ou 404 (route absente).
http_expect "FP-3.1 GET media-assets/:id/url (sans token)" GET \
  "/api/v1/marketplace/media-assets/$DUMMY_UUID/url" "401,403,404" "" "no"
flag_drift_if_cannot_get "/marketplace/media-assets/:id/url"

http_expect "FP-3.1 GET media-assets/:id/url (avec token)" GET \
  "/api/v1/marketplace/media-assets/$DUMMY_UUID/url" "200,400,401,403,404"
flag_drift_if_cannot_get "/marketplace/media-assets/:id/url (auth)"

# ── 9. Non-régression frontend ─────────────────────────────
echo
echo "${CYAN}— Non-régression frontend${RESET}"

# Header x-nextjs-cache (présence = Next.js 14 SSR/RSC actif)
total=$((total+1))
NEXT_CACHE=$(curl -sI -k --max-time "$TIMEOUT" "$BASE/marketplace" 2>/dev/null \
  | grep -i '^x-nextjs-cache' | tr -d '\r' || true)
if [[ -n "$NEXT_CACHE" ]]; then
  say_ok "header x-nextjs-cache présent sur /marketplace : $NEXT_CACHE"
else
  say_warn "header x-nextjs-cache absent sur /marketplace (peut être normal selon cache CDN)"
fi

# /marketplace/sellers : MP-S-INDEX non livrée → "Page introuvable" attendu
total=$((total+1))
SELLERS_BODY=$(curl -sS -k --max-time "$TIMEOUT" "$BASE/marketplace/sellers" 2>/dev/null || true)
if printf '%s' "$SELLERS_BODY" | grep -q "Page introuvable"; then
  say_ok "/marketplace/sellers : 404 \"Page introuvable\" (MP-S-INDEX non livrée — état attendu)"
else
  say_warn "/marketplace/sellers : ne contient pas \"Page introuvable\" — MP-S-INDEX livrée ? (à analyser)"
fi

# BuildId frontend — drift indicateur
total=$((total+1))
BUILD_ID=$(curl -sS -k --max-time "$TIMEOUT" "$BASE/" 2>/dev/null \
  | grep -oE '"buildId":"[^"]+"' | head -1 \
  | sed 's/.*"buildId":"\([^"]*\)".*/\1/' || true)
if [[ -n "$BUILD_ID" ]]; then
  say_ok "frontend buildId = $BUILD_ID (à comparer à un build récent attendu)"
else
  say_warn "buildId frontend introuvable dans la home (response altérée par CDN/proxy ?)"
fi

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
