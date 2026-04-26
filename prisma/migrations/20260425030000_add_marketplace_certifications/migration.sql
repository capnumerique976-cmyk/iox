-- FP-2 — Certifications structurées (table polymorphe dédiée).
-- Migration purement additive : aucune donnée existante n'est touchée.
-- relatedType est volontairement la même enum polymorphe que les autres
-- artefacts marketplace (MarketplaceDocument, MediaAsset). La restriction
-- aux scopes SELLER_PROFILE et MARKETPLACE_PRODUCT est imposée côté service
-- (le MVP ne stocke pas de certifications au niveau OFFER ou BATCH).

-- AlterEnum (additive) : nouvelle valeur EntityType pour l'audit trail.
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'MARKETPLACE_CERTIFICATION';

-- CreateEnum
CREATE TYPE "CertificationType" AS ENUM (
  'BIO_EU',
  'BIO_USDA',
  'ECOCERT',
  'FAIRTRADE',
  'RAINFOREST_ALLIANCE',
  'HACCP',
  'ISO_22000',
  'ISO_9001',
  'GLOBALGAP',
  'BRC',
  'IFS',
  'KOSHER',
  'HALAL',
  'OTHER'
);

-- CreateTable
CREATE TABLE "marketplace_certifications" (
  "id"                    TEXT                            NOT NULL,
  "related_type"          "MarketplaceRelatedEntityType"  NOT NULL,
  "related_id"            TEXT                            NOT NULL,

  "type"                  "CertificationType"             NOT NULL,
  "code"                  TEXT,
  "issuing_body"          TEXT,

  "issued_at"             TIMESTAMP(3),
  "valid_from"            TIMESTAMP(3),
  "valid_until"           TIMESTAMP(3),

  "document_media_id"     TEXT,

  "verification_status"   "MarketplaceVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "rejection_reason"      TEXT,
  "verified_by_user_id"   TEXT,
  "verified_at"           TIMESTAMP(3),

  "created_at"            TIMESTAMP(3)                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3)                    NOT NULL,
  "created_by_user_id"    TEXT,
  "updated_by_user_id"    TEXT,

  CONSTRAINT "marketplace_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketplace_certifications_related_type_related_id_idx"
  ON "marketplace_certifications"("related_type", "related_id");
CREATE INDEX "marketplace_certifications_type_idx"
  ON "marketplace_certifications"("type");
CREATE INDEX "marketplace_certifications_verification_status_idx"
  ON "marketplace_certifications"("verification_status");
CREATE INDEX "marketplace_certifications_valid_until_idx"
  ON "marketplace_certifications"("valid_until");

-- CreateUniqueIndex
-- code est nullable : Postgres traite NULL ≠ NULL pour les contraintes
-- d'unicité, ce qui autorise plusieurs entrées "sans code" (ex. OTHER).
CREATE UNIQUE INDEX "uniq_certification_scope_type_code"
  ON "marketplace_certifications"("related_type", "related_id", "type", "code");
