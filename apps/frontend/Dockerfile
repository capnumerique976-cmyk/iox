# ─────────────────────────────────────────────────────────
#  IOX Frontend — image multi-stage (Next.js standalone)
# ─────────────────────────────────────────────────────────
FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ── 1. deps ──────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/backend/package.json   apps/backend/package.json
COPY apps/frontend/package.json  apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --prefer-offline

# ── 2. builder ───────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @iox/shared build \
 && pnpm db:generate \
 && pnpm --filter @iox/frontend build

# ── 3. runtime ───────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Next.js standalone : serveur minimal + assets statiques + public/
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static     ./apps/frontend/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/public           ./apps/frontend/public

USER nextjs
EXPOSE 3000
ENV HOSTNAME=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',(r)=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "apps/frontend/server.js"]
