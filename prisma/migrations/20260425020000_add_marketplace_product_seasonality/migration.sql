-- FP-1 — Saisonnalité MarketplaceProduct
-- Migration purement additive : aucun champ existant n'est modifié.
-- Backward-compatible : les lignes existantes obtiennent les défauts
-- (`harvest_months = '{}'`, `availability_months = '{}'`, `is_year_round = false`).

-- CreateEnum
CREATE TYPE "SeasonalityMonth" AS ENUM (
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
);

-- AlterTable
ALTER TABLE "marketplace_products"
  ADD COLUMN "harvest_months"      "SeasonalityMonth"[] NOT NULL DEFAULT ARRAY[]::"SeasonalityMonth"[],
  ADD COLUMN "availability_months" "SeasonalityMonth"[] NOT NULL DEFAULT ARRAY[]::"SeasonalityMonth"[],
  ADD COLUMN "is_year_round"       BOOLEAN              NOT NULL DEFAULT false;
