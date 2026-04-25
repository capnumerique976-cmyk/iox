-- L9-4 — Refresh token revocation list
-- Voir prisma/schema.prisma model RevokedRefreshToken pour la doc métier.

CREATE TABLE "revoked_refresh_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT,
    "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revoked_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "revoked_refresh_tokens_token_hash_key" ON "revoked_refresh_tokens"("token_hash");
CREATE INDEX "revoked_refresh_tokens_user_id_idx" ON "revoked_refresh_tokens"("user_id");
CREATE INDEX "revoked_refresh_tokens_expires_at_idx" ON "revoked_refresh_tokens"("expires_at");
