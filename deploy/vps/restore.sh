#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  IOX — Restore VPS (depuis dump Postgres)
# ─────────────────────────────────────────────────────────
#  Restaure un dump pg_dump (format custom) dans le container
#  postgres courant. Opération **destructive** — le user est
#  forcé de taper YES pour confirmer.
#
#  Usage :
#    ./restore.sh /opt/apps/iox/backups/postgres/iox-YYYYMMDDTHHMMSSZ.dump
# ─────────────────────────────────────────────────────────
set -euo pipefail

VPS_HOST="${IOX_VPS_HOST:-rahiss-vps}"
VPS_REMOTE="${IOX_VPS_REMOTE:-/opt/apps/iox}"
PG_CONTAINER="${IOX_PG_CONTAINER:-iox_postgres}"

DUMP_PATH="${1:-}"
if [ -z "$DUMP_PATH" ]; then
  echo "usage: $0 <chemin-distant-du-dump.dump>" >&2
  exit 2
fi

echo "== IOX restore =="
echo "  host   : $VPS_HOST"
echo "  dump   : $DUMP_PATH"
echo "  target : container $PG_CONTAINER"
echo
echo "⚠  OPÉRATION DESTRUCTIVE — la base courante sera écrasée."
echo -n "Confirmer en tapant YES : "
read -r confirm
[ "$confirm" = "YES" ] || { echo "Annulé."; exit 1; }

# Vérifier présence du dump distant
if ! ssh "$VPS_HOST" "test -f '$DUMP_PATH'"; then
  echo "ERR: dump introuvable sur $VPS_HOST : $DUMP_PATH" >&2
  exit 1
fi

# Restore via pg_restore (drop-then-create)
ssh "$VPS_HOST" bash -s -- "$DUMP_PATH" "$PG_CONTAINER" "$VPS_REMOTE" <<'REMOTE'
set -euo pipefail
DUMP="$1"; PG="$2"; ENVDIR="$3"
set -a; . "$ENVDIR/.env"; set +a
USER="${POSTGRES_USER:-iox}"
DB="${POSTGRES_DB:-iox}"

echo "  1. Arrêt des connexions applicatives…"
docker exec -i "$PG" psql -U "$USER" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB' AND pid<>pg_backend_pid();" >/dev/null

echo "  2. DROP + CREATE database…"
docker exec -i "$PG" psql -U "$USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB\";"
docker exec -i "$PG" psql -U "$USER" -d postgres -c "CREATE DATABASE \"$DB\";"

echo "  3. pg_restore…"
docker exec -i "$PG" pg_restore -U "$USER" -d "$DB" --no-owner --no-privileges < "$DUMP"
echo "  ✓ base restaurée"
REMOTE

echo
echo "✅ Restore OK — redémarrer le backend : "
echo "   ssh $VPS_HOST 'cd $VPS_REMOTE && docker compose -f docker-compose.vps.yml restart backend'"
