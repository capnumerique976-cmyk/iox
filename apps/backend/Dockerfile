# ─────────────────────────────────────────────────────────
#  IOX Backend — image multi-stage, monorepo-aware
# ─────────────────────────────────────────────────────────
# - pnpm workspace : on copie le repo complet pour bénéficier des
#   packages locaux (@iox/shared) via workspace:*.
# - prisma generate nécessite le schéma (prisma/schema.prisma à la racine).
# - Image finale minimale, user non-root, standalone node_modules prod.

FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV COREPACK_ENABLE_PROJECT_SPEC=0
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app

# ── 1. deps (monorepo complet, lockfile gelé) ─────────────
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json   apps/backend/package.json
COPY apps/frontend/package.json  apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --prefer-offline

# ── 2. build (génère prisma, compile shared + backend) ─────
FROM base AS builder
COPY --from=deps /app /app
COPY . .
RUN pnpm --filter @iox/shared build \
 && pnpm db:generate \
 && pnpm --filter @iox/backend build

# Dépendances prod only pour l'image finale
RUN pnpm --filter @iox/backend --prod --config.inject-workspace-packages=true deploy --legacy /prod/backend \
 && PRISMA_SRC=$(find /app -type d -path '*/.prisma/client' ! -path '*/prod/*' | head -1) \
 && echo "Prisma client source: $PRISMA_SRC" \
 && mkdir -p /prod/backend/node_modules/.prisma \
 && cp -RL "$PRISMA_SRC" /prod/backend/node_modules/.prisma/client

# ── 3. runtime (minimal, non-root) ────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates tini \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs nestjs

# Prisma CLI pour `migrate deploy` au boot. Version pinnée = celle du
# schéma. Reste léger (~20 Mo) vs embarquer tout le tooling pnpm.
RUN npm install -g --no-audit --no-fund prisma@5.18.0

# Dist compilée + node_modules prod (via deploy)
COPY --from=builder --chown=nestjs:nodejs /prod/backend ./
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./dist
# Schéma Prisma + migrations (nécessaires pour migrate deploy au démarrage)
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
# Entrypoint qui applique les migrations avant de booter.
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nestjs
ENV NODE_ENV=production
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/api/v1/health/live',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--", "./docker-entrypoint.sh"]
CMD ["dist/apps/backend/src/main.js"]
