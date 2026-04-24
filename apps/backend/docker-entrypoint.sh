#!/bin/sh
# ─────────────────────────────────────────────────────────
#  IOX Backend — entrypoint runtime
# ─────────────────────────────────────────────────────────
#  Rôle :
#    1. En préprod/prod, applique les migrations Prisma avant de booter.
#    2. Lance le process Node (exec → PID 1, signaux OK pour rolling update).
#
#  Désactiver la migration auto avec SKIP_MIGRATIONS=1 (utile si les
#  migrations sont exécutées par un job Kubernetes dédié).
# ─────────────────────────────────────────────────────────
set -e

if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  if [ "${APP_ENV:-development}" = "staging" ] || [ "${APP_ENV:-development}" = "production" ]; then
    echo "🗂  IOX: prisma migrate deploy (APP_ENV=${APP_ENV})"
    prisma migrate deploy --schema=./prisma/schema.prisma
  else
    echo "🗂  IOX: APP_ENV=${APP_ENV:-development} → migrations non exécutées automatiquement"
  fi
fi

echo "🚀 IOX: starting node ${*:-dist/apps/backend/src/main.js}"
exec node "${@:-dist/apps/backend/src/main.js}"
