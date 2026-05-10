#!/usr/bin/env bash
# IOX — PostgreSQL backup script
# Usage: ./scripts/backup-postgres.sh [backup-dir]
#
# Crée un dump pg_dump compressé avec horodatage.
# Supprime les backups de plus de 7 jours (rétention).
#
# Variables d'environnement lues :
#   DATABASE_URL  — postgresql://user:pass@host:port/db (requis)
#   BACKUP_KEEP_DAYS — nombre de jours de rétention (défaut: 7)
#
# Exemple cron (2h00 UTC chaque jour) :
#   0 2 * * * /opt/iox/scripts/backup-postgres.sh /opt/iox/backups >> /var/log/iox-backup.log 2>&1

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────

BACKUP_DIR="${1:-/opt/iox/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
SCRIPT_NAME="$(basename "$0")"

# ─── Couleurs et logging ──────────────────────────────────────────────────────

log_info()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*"; }
log_ok()    { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [OK]    $*"; }
log_warn()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*"; }
log_error() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2; }

log_info "=== IOX PostgreSQL Backup — $TIMESTAMP ==="

# ─── Vérifications préalables ─────────────────────────────────────────────────

# DATABASE_URL requis
if [ -z "${DATABASE_URL:-}" ]; then
  # Tenter de charger le .env backend si DATABASE_URL n'est pas dans l'environnement
  ENV_FILE="${IOX_ENV_FILE:-/opt/iox/backend/.env}"
  if [ -f "$ENV_FILE" ]; then
    log_info "Chargement de $ENV_FILE"
    # Exporter uniquement DATABASE_URL depuis le fichier .env
    DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  log_error "DATABASE_URL non défini. Exporter DATABASE_URL ou définir IOX_ENV_FILE."
  exit 1
fi

# Vérifier que pg_dump est disponible
if ! command -v pg_dump &>/dev/null; then
  log_error "pg_dump introuvable. Installer postgresql-client."
  exit 1
fi

# Vérifier que gzip est disponible
if ! command -v gzip &>/dev/null; then
  log_error "gzip introuvable."
  exit 1
fi

# ─── Création du répertoire de backup ────────────────────────────────────────

if [ ! -d "$BACKUP_DIR" ]; then
  log_info "Création du répertoire $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
fi

# ─── Extraction des paramètres de connexion depuis DATABASE_URL ──────────────

# Format attendu : postgresql://user:pass@host:port/dbname
# Extraire via pattern matching (sans dépendance Python/Node)
DB_URL_STRIPPED="${DATABASE_URL#postgresql://}"
DB_URL_STRIPPED="${DB_URL_STRIPPED#postgres://}"

DB_USER="$(echo "$DB_URL_STRIPPED" | cut -d: -f1)"
DB_PASS="$(echo "$DB_URL_STRIPPED" | cut -d: -f2 | cut -d@ -f1)"
DB_HOST="$(echo "$DB_URL_STRIPPED" | cut -d@ -f2 | cut -d: -f1)"
DB_PORT="$(echo "$DB_URL_STRIPPED" | cut -d@ -f2 | cut -d: -f2 | cut -d/ -f1)"
DB_NAME="$(echo "$DB_URL_STRIPPED" | rev | cut -d/ -f1 | rev | cut -d? -f1)"

log_info "Base de données : $DB_NAME @ $DB_HOST:$DB_PORT (user: $DB_USER)"

# ─── Nom du fichier de backup ─────────────────────────────────────────────────

BACKUP_FILE="${BACKUP_DIR}/iox_${TIMESTAMP}.dump.gz"
BACKUP_TMPFILE="${BACKUP_DIR}/iox_${TIMESTAMP}.dump.gz.tmp"

log_info "Fichier de destination : $BACKUP_FILE"

# ─── Exécution du backup ──────────────────────────────────────────────────────

log_info "Démarrage pg_dump..."

PGPASSWORD="$DB_PASS" pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --no-password \
  --format=custom \
  --compress=9 \
  --verbose \
  "$DB_NAME" \
  | gzip \
  > "$BACKUP_TMPFILE"

# Vérifier que pg_dump s'est bien terminé (pipefail attrape les erreurs de pipe)
if [ $? -ne 0 ]; then
  log_error "pg_dump a échoué. Suppression du fichier temporaire."
  rm -f "$BACKUP_TMPFILE"
  exit 1
fi

# Déplacer le fichier temporaire vers le nom final (atomique)
mv "$BACKUP_TMPFILE" "$BACKUP_FILE"

# ─── Vérification de l'intégrité ─────────────────────────────────────────────

log_info "Vérification de l'intégrité du fichier de backup..."
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
  BACKUP_SIZE="$(du -sh "$BACKUP_FILE" | cut -f1)"
  log_ok "Backup créé avec succès : $BACKUP_FILE (taille: $BACKUP_SIZE)"
else
  log_error "Le fichier de backup est corrompu : $BACKUP_FILE"
  rm -f "$BACKUP_FILE"
  exit 1
fi

# ─── Rétention — suppression des anciens backups ──────────────────────────────

log_info "Nettoyage des backups de plus de ${BACKUP_KEEP_DAYS} jours dans $BACKUP_DIR..."
DELETED_COUNT=0

while IFS= read -r -d '' old_backup; do
  log_info "Suppression ancien backup : $(basename "$old_backup")"
  rm -f "$old_backup"
  DELETED_COUNT=$((DELETED_COUNT + 1))
done < <(find "$BACKUP_DIR" -name "iox_*.dump.gz" -mtime "+${BACKUP_KEEP_DAYS}" -print0 2>/dev/null)

if [ "$DELETED_COUNT" -gt 0 ]; then
  log_ok "$DELETED_COUNT ancien(s) backup(s) supprimé(s)"
else
  log_info "Aucun ancien backup à supprimer"
fi

# ─── Résumé ───────────────────────────────────────────────────────────────────

TOTAL_BACKUPS="$(find "$BACKUP_DIR" -name "iox_*.dump.gz" 2>/dev/null | wc -l | tr -d ' ')"
TOTAL_SIZE="$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"

log_ok "=== Backup terminé ==="
log_info "Fichier    : $BACKUP_FILE"
log_info "Taille     : $BACKUP_SIZE"
log_info "Backups    : $TOTAL_BACKUPS fichier(s) dans $BACKUP_DIR (total: $TOTAL_SIZE)"
log_info "Rétention  : ${BACKUP_KEEP_DAYS} jours"
