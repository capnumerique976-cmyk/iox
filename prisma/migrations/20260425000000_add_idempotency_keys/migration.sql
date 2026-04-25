-- L9-3 — Idempotency keys
-- Cache de réponses pour le header HTTP `Idempotency-Key`.
-- Voir prisma/schema.prisma model IdempotencyKey pour la doc métier.

CREATE TABLE "idempotency_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "user_id" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_status" INTEGER NOT NULL,
    "response_body" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "idempotency_keys"("key");
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");
CREATE INDEX "idempotency_keys_user_id_idx" ON "idempotency_keys"("user_id");
