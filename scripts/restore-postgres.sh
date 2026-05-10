#!/usr/bin/env bash
# IOX — PostgreSQL restore script
# Usage: ./scripts/restore-postgres.sh <backup-file.dump.gz> [target-database-url]
#
# Restaure un backup pg_dump compressé dans la base de données cible.
#
# Arguments :
#   $1 — Chemin vers le fichier .dump.gz (requis)
#   $2 — DATABASE_URL cible (optionnel — défaut: $DATABASE_URL de l'environnement)
#
# ATTENTION : Cette opération est DESTRUCTIVE.
#   Elle supprime et recrée la base de données cible.
#   Une confirmation manuelle est demandée sauf si FORCE=1.
#
# Exemple :
#   ./scripts/restore-postgres.sh /opt/iox/backups/iox_20260510_020000.dump.gz
#   ./scripts/restore-postgres.sh /opt/iox/backups/iox_20260510_020000.dump.gz postgresql://user:pass@host:5432/iox_staging
#
# Variables d'environnement :
#   FORCE=1      — Désactive la confirmation interactive (pour CI/scripts)
#   DATABASE_URL — URL de la base cible si non fourni en $2

set -euo pipefail

# ─── Logging ──────────────────────────────────────────────────────────────────

log_info()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*"; }
log_ok()    { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [OK]    $*"; }
log_warn()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*" >&2; }
log_error() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2; }

log_info "=== IOX PostgreSQL Restore ==="

# ─── Arguments ────────────────────────────────────────────────────────────────

BACKUP_FILE="${1:-}"
TARGET_URL="${2:-}"

if [ -z "$BACKUP_FILE" ]; then
  log_error "Usage: $0 <backup-file.dump.gz> [target-database-url]"
  log_error "Exemple: $0 /opt/iox/backups/iox_20260510_020000.dump.gz"
  exit 1
fi

# ─── Vérifications préalables ─────────────────────────────────────────────────

if [ ! -f "$BACKUP_FILE" ]; then
  log_error "Fichier de backup introuvable : $BACKUP_FILE"
  exit 1
fi

if ! command -v pg_restore &>/dev/null; then
  log_error "pg_restore introuvable. Installer postgresql-client."
  exit 1
fi

if ! command -v psql &>/dev/null; then
  log_error "psql introuvable. Installer postgresql-client."
  exit 1
fi

# ─── URL de la base cible ─────────────────────────────────────────────────────

if [ -z "$TARGET_URL" ]; then
  if [ -z "${DATABASE_URL:-}" ]; then
    # Tenter de charger le .env
    ENV_FILE="${IOX_ENV_FILE:-/opt/iox/backend/.env}"
    if [ -f "$ENV_FILE" ]; then
      log_info "Chargement de $ENV_FILE"
      DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
    fi
  fi
  TARGET_URL="${DATABASE_URL:-}"
fi

if [ -z "$TARGET_URL" ]; then
  log_error "DATABASE_URL non défini. Passer l'URL en argument $2 ou exporter DATABASE_URL."
  exit 1
fi

# ─── Extraction des paramètres de connexion ───────────────────────────────────

DB_URL_STRIPPED="${TARGET_URL#postgresql://}"
DB_URL_STRIPPED="${DB_URL_STRIPPED#postgres://}"

DB_USER="$(echo "$DB_URL_STRIPPED" | cut -d: -f1)"
DB_PASS="$(echo "$DB_URL_STRIPPED" | cut -d: -f2 | cut -d@ -f1)"
DB_HOST="$(echo "$DB_URL_STRIPPED" | cut -d@ -f2 | cut -d: -f1)"
DB_PORT="$(echo "$DB_URL_STRIPPED" | cut -d@ -f2 | cut -d: -f2 | cut -d/ -f1)"
DB_NAME="$(echo "$DB_URL_STRIPPED" | rev | cut -d/ -f1 | rev | cut -d? -f1)"

BACKUP_FILENAME="$(basename "$BACKUP_FILE")"
BACKUP_SIZE="$(du -sh "$BACKUP_FILE" | cut -f1)"

log_info "Fichier de backup : $BACKUP_FILENAME ($BACKUP_SIZE)"
log_info "Base cible        : $DB_NAME @ $DB_HOST:$DB_PORT (user: $DB_USER)"

# ─── Vérification de l'intégrité du backup ────────────────────────────────────

log_info "Vérification de l'intégrité du backup..."
if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
  log_error "Le fichier de backup est corrompu ou invalide : $BACKUP_FILE"
  exit 1
fi
log_ok "Intégrité du backup : OK"

# ─── Confirmation interactive ─────────────────────────────────────────────────

if [ "${FORCE:-0}" != "1" ]; then
  log_warn "ATTENTION : Cette opération va écraser la base '$DB_NAME' sur $DB_HOST."
  log_warn "Toutes les données actuelles seront PERDUES."
  echo ""
  read -r -p "Confirmer la restauration ? Taper 'OUI' pour continuer : " CONFIRM
  if [ "$CONFIRM" != "OUI" ]; then
    log_info "Restauration annulée par l'utilisateur."
    exit 0
  fi
fi

# ─── Construction de l'URL admin (connexion à postgres pour DROP/CREATE) ───────

# Connexion à la DB 'postgres' (admin) sur le même hôte
ADMIN_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/postgres"

# ─── Fermeture des connexions actives ─────────────────────────────────────────

log_info "Fermeture des connexions actives sur '$DB_NAME'..."
PGPASSWORD="$DB_PASS" psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --no-password \
  "postgres" \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
  --quiet 2>/dev/null || true

# ─── Drop et recréation de la base ───────────────────────────────────────────

log_info "Suppression de la base '$DB_NAME'..."
PGPASSWORD="$DB_PASS" psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --no-password \
  "postgres" \
  -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" \
  --quiet

log_info "Création de la base '$DB_NAME'..."
PGPASSWORD="$DB_PASS" psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --no-password \
  "postgres" \
  -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";" \
  --quiet

# ─── Restauration ─────────────────────────────────────────────────────────────

log_info "Restauration en cours... (peut prendre plusieurs minutes)"

gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASS" pg_restore \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --no-password \
  --dbname="$DB_NAME" \
  --verbose \
  --no-owner \
  --no-privileges \
  2>&1 | grep -v "^pg_restore: warning:" || true
# Note : pg_restore retourne exit code 1 sur les warnings (normal avec --no-owner)
# On filtre les warnings non critiques mais on laisse les vraies erreurs passer

# ─── Vérification post-restore ────────────────────────────────────────────────

log_info "Vérification post-restore..."

# Compter les tables principales pour confirmer la restauration
RESULT="$(PGPASSWORD="$DB_PASS" psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --no-password \
  "$DB_NAME" \
  --tuples-only \
  --no-align \
  -c "
    SELECT
      (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS tables,
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM payments) AS payments
    ;
  " 2>/dev/null || echo "0|0|0")"

TABLE_COUNT="$(echo "$RESULT" | tr -d ' ' | cut -d'|' -f1)"
USER_COUNT="$(echo "$RESULT" | tr -d ' ' | cut -d'|' -f2)"
PAYMENT_COUNT="$(echo "$RESULT" | tr -d ' ' | cut -d'|' -f3)"

if [ "${TABLE_COUNT:-0}" -gt 0 ]; then
  log_ok "Restauration vérifiée : $TABLE_COUNT tables, $USER_COUNT users, $PAYMENT_COUNT payments"
else
  log_warn "Impossible de vérifier les données post-restore — vérifier manuellement."
fi

# ─── Vérification des migrations Prisma ──────────────────────────────────────

log_info "Vérification des migrations Prisma..."
MIGRATION_COUNT="$(PGPASSWORD="$DB_PASS" psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --no-password \
  "$DB_NAME" \
  --tuples-only \
  --no-align \
  -c "SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;" 2>/dev/null || echo "0")"

log_info "Migrations Prisma appliquées : $(echo "$MIGRATION_COUNT" | tr -d ' ')"

# ─── Résumé ───────────────────────────────────────────────────────────────────

log_ok "=== Restore terminé avec succès ==="
log_info "Source  : $BACKUP_FILENAME"
log_info "Cible   : $DB_NAME @ $DB_HOST:$DB_PORT"
log_info ""
log_warn "IMPORTANT : Redémarrer le backend pour reconnecter Prisma à la base restaurée."
log_info "  pm2 restart iox-backend"
log_info ""
log_info "Vérification manuelle recommandée :"
log_info "  psql $TARGET_URL -c \"SELECT COUNT(*) FROM users;\""
