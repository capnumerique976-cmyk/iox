#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  IOX — DR drill (Disaster Recovery drill)
# ─────────────────────────────────────────────────────────
#  Prouve la chaîne complète backup → restore SANS toucher
#  à la base active. Le pipeline est :
#
#    1. pg_dump (-Fc) du container source
#    2. spawn d'un container Postgres jetable
#    3. pg_restore dans le jetable
#    4. requêtes de validation (counts, _prisma_migrations)
#    5. tear-down du container jetable
#
#  Usage :
#    ./deploy/vps/dr-drill.sh                    # source par défaut: iox_postgres
#    IOX_PG_CONTAINER=mon_pg ./dr-drill.sh
#    IOX_DRILL_KEEP=1 ./dr-drill.sh              # garde le container pour debug
#
#  Idempotent : nettoie un éventuel container jetable précédent au démarrage.
#
#  Exit codes :
#    0  drill OK
#    1  pg_dump a échoué
#    2  spawn container échoué
#    3  pg_restore a échoué
#    4  validation queries ont échoué
# ─────────────────────────────────────────────────────────
set -euo pipefail

PG_CONTAINER="${IOX_PG_CONTAINER:-iox_postgres}"
PG_USER="${IOX_PG_USER:-iox}"
PG_DB="${IOX_PG_DB:-iox}"
DRILL_CONTAINER="${IOX_DRILL_CONTAINER:-iox_dr_drill}"
DRILL_IMAGE="${IOX_DRILL_IMAGE:-postgres:15-alpine}"
DRILL_PORT="${IOX_DRILL_PORT:-55432}"
KEEP="${IOX_DRILL_KEEP:-0}"

STAMP=$(date -u +'%Y%m%dT%H%M%SZ')
TMP_DIR=$(mktemp -d -t iox-drdrill-XXXXXX)
DUMP_FILE="$TMP_DIR/iox-${STAMP}.dump"
START_EPOCH=$(date +%s)

cleanup() {
  if [ "$KEEP" = "1" ]; then
    echo "  ↳ IOX_DRILL_KEEP=1 : container $DRILL_CONTAINER conservé (port $DRILL_PORT)"
    echo "  ↳ dump conservé    : $DUMP_FILE"
    return
  fi
  docker rm -f "$DRILL_CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "== IOX DR drill =="
echo "  source     : container $PG_CONTAINER (db=$PG_DB user=$PG_USER)"
echo "  jetable    : container $DRILL_CONTAINER ($DRILL_IMAGE) port $DRILL_PORT"
echo "  stamp      : $STAMP"
echo "  tmp dir    : $TMP_DIR"
echo

# ── 0. Sanity ────────────────────────────────────────────
if ! docker inspect "$PG_CONTAINER" >/dev/null 2>&1; then
  echo "ERR: container source '$PG_CONTAINER' introuvable" >&2
  exit 1
fi

# Cleanup d'un drill précédent éventuellement laissé orphelin.
docker rm -f "$DRILL_CONTAINER" >/dev/null 2>&1 || true

# ── 1. pg_dump ───────────────────────────────────────────
echo "== Étape 1/4 : pg_dump =="
if ! docker exec -i "$PG_CONTAINER" pg_dump -U "$PG_USER" -Fc "$PG_DB" > "$DUMP_FILE"; then
  echo "ERR: pg_dump a échoué" >&2
  exit 1
fi
DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "  ✓ dump : $DUMP_FILE ($DUMP_SIZE)"
echo

# ── 2. Container Postgres jetable ────────────────────────
echo "== Étape 2/4 : spawn $DRILL_CONTAINER =="
docker run -d \
  --name "$DRILL_CONTAINER" \
  -e POSTGRES_USER="$PG_USER" \
  -e POSTGRES_PASSWORD=drill \
  -e POSTGRES_DB="$PG_DB" \
  -p "$DRILL_PORT:5432" \
  "$DRILL_IMAGE" >/dev/null || { echo "ERR: docker run a échoué" >&2; exit 2; }

# Attente readiness — pg_isready boucle jusqu'à 30 s.
for i in $(seq 1 30); do
  if docker exec "$DRILL_CONTAINER" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
if [ "${READY:-0}" != "1" ]; then
  echo "ERR: container jetable jamais ready après 30 s" >&2
  exit 2
fi
echo "  ✓ ready après ${i}s"
echo

# ── 3. pg_restore ────────────────────────────────────────
echo "== Étape 3/4 : pg_restore =="
# Le container jetable a déjà créé une DB vide $PG_DB → on restore dedans.
# --no-owner / --no-privileges pour éviter les warns ROLE inexistants.
if ! docker exec -i "$DRILL_CONTAINER" \
  pg_restore -U "$PG_USER" -d "$PG_DB" --no-owner --no-privileges < "$DUMP_FILE"; then
  echo "ERR: pg_restore a échoué" >&2
  exit 3
fi
echo "  ✓ restore terminé"
echo

# ── 4. Validation queries ────────────────────────────────
echo "== Étape 4/4 : validation queries =="
QUERY_OUT=$(docker exec -i "$DRILL_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -At <<'SQL'
SELECT 'tables_count', count(*) FROM information_schema.tables
  WHERE table_schema='public';
SELECT 'users_count', count(*) FROM users;
SELECT 'last_migration', migration_name
  FROM _prisma_migrations
  ORDER BY started_at DESC
  LIMIT 1;
SQL
) || { echo "ERR: validation queries en échec" >&2; exit 4; }

echo "$QUERY_OUT" | sed 's/^/  /'

TABLES=$(echo "$QUERY_OUT" | awk -F'|' '/^tables_count/ {print $2}')
USERS=$(echo "$QUERY_OUT" | awk -F'|' '/^users_count/ {print $2}')
MIGRATION=$(echo "$QUERY_OUT" | awk -F'|' '/^last_migration/ {print $2}')

if [ -z "$TABLES" ] || [ "$TABLES" -lt 5 ]; then
  echo "ERR: < 5 tables restaurées ($TABLES) — schéma incohérent" >&2
  exit 4
fi

ELAPSED=$(( $(date +%s) - START_EPOCH ))
echo
echo "✅ DR drill OK — ${ELAPSED}s"
echo "   tables=${TABLES}  users=${USERS}  last_migration=${MIGRATION}"
