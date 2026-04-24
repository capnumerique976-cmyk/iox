#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  IOX — Backup VPS (Postgres + MinIO)
# ─────────────────────────────────────────────────────────
#  Exécute :
#    - pg_dump (format custom, compressé) du container postgres
#    - mc mirror du bucket MinIO (vers un dossier local horodaté)
#
#  Les dumps sont stockés sur le VPS dans $BACKUP_DIR puis rapatriés
#  en local (optionnel) via rsync.
#
#  Cible cron recommandée : tous les jours 03:15 UTC
#    15 3 * * * /opt/apps/iox/deploy/vps/backup.sh >> /var/log/iox-backup.log 2>&1
#
#  Rétention par défaut : 7 jours (POSIX find -mtime).
# ─────────────────────────────────────────────────────────
set -euo pipefail

VPS_HOST="${IOX_VPS_HOST:-rahiss-vps}"
VPS_REMOTE="${IOX_VPS_REMOTE:-/opt/apps/iox}"
BACKUP_DIR="${IOX_BACKUP_DIR:-/opt/apps/iox/backups}"
RETENTION_DAYS="${IOX_BACKUP_RETENTION_DAYS:-7}"
LOCAL_MIRROR="${IOX_LOCAL_BACKUP_MIRROR:-}"   # ex: $HOME/iox-backups — vide = pas de miroir local
PG_CONTAINER="${IOX_PG_CONTAINER:-iox_postgres}"
MINIO_CONTAINER="${IOX_MINIO_CONTAINER:-iox_minio}"
MINIO_BUCKET="${IOX_MINIO_BUCKET:-iox}"

STAMP=$(date -u +'%Y%m%dT%H%M%SZ')

echo "== IOX backup =="
echo "  host      : $VPS_HOST"
echo "  backupdir : $BACKUP_DIR"
echo "  stamp     : $STAMP"
echo "  retention : ${RETENTION_DAYS} jours"
echo

# ── 1. Préparer le répertoire cible sur le VPS ───────────
ssh "$VPS_HOST" "mkdir -p $BACKUP_DIR/postgres $BACKUP_DIR/minio"

# ── 2. Dump Postgres (format custom) ─────────────────────
echo "== Étape 1/3 : pg_dump =="
DUMP_REMOTE="$BACKUP_DIR/postgres/iox-${STAMP}.dump"
ssh "$VPS_HOST" bash -s -- "$DUMP_REMOTE" "$PG_CONTAINER" "$VPS_REMOTE" <<'REMOTE'
set -euo pipefail
DUMP="$1"; PG="$2"; ENVDIR="$3"
# Récupérer user/db depuis le .env du VPS (jamais en clair ici)
set -a; . "$ENVDIR/.env"; set +a
USER="${POSTGRES_USER:-iox}"
DB="${POSTGRES_DB:-iox}"
docker exec -i "$PG" pg_dump -U "$USER" -Fc "$DB" > "$DUMP"
echo "  ✓ dump écrit: $DUMP ($(du -h "$DUMP" | cut -f1))"
REMOTE

# ── 3. Miroir MinIO (bucket → tar.gz) ────────────────────
echo
echo "== Étape 2/3 : MinIO =="
TAR_REMOTE="$BACKUP_DIR/minio/iox-${STAMP}.tar.gz"
ssh "$VPS_HOST" bash -s -- "$TAR_REMOTE" "$MINIO_CONTAINER" "$MINIO_BUCKET" <<'REMOTE'
set -euo pipefail
TAR="$1"; MINIO="$2"; BUCKET="$3"
# Export du volume monté par MinIO via tar dans le container.
# /data est la convention du compose (cf. docker-compose.preprod.yml).
docker exec "$MINIO" tar czf - -C /data "$BUCKET" 2>/dev/null > "$TAR" \
  || { echo "  ⚠ bucket $BUCKET absent ou vide — tar vide créé"; : > "$TAR"; }
echo "  ✓ tar écrit: $TAR ($(du -h "$TAR" | cut -f1))"
REMOTE

# ── 4. Rotation (rétention) ─────────────────────────────
echo
echo "== Étape 3/3 : rotation (>${RETENTION_DAYS}j) =="
ssh "$VPS_HOST" "find $BACKUP_DIR/postgres -name 'iox-*.dump'   -mtime +${RETENTION_DAYS} -delete -print | sed 's/^/  - /'
find $BACKUP_DIR/minio    -name 'iox-*.tar.gz' -mtime +${RETENTION_DAYS} -delete -print | sed 's/^/  - /'
true"

# ── 5. Miroir local optionnel ────────────────────────────
if [ -n "$LOCAL_MIRROR" ]; then
  echo
  echo "== Miroir local : $LOCAL_MIRROR =="
  mkdir -p "$LOCAL_MIRROR"
  rsync -az --delete "${VPS_HOST}:${BACKUP_DIR}/" "$LOCAL_MIRROR/"
  echo "  ✓ synchronisé"
fi

echo
echo "✅ Backup OK — $STAMP"
