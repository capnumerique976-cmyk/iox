-- FP-7 — Qualité structurée produit marketplace.
-- Strictement additif : 1 enum + 1 colonne array avec défaut '{}'.

CREATE TYPE "ProductQualityAttribute" AS ENUM (
  'NON_GMO',
  'ORGANIC',
  'HANDMADE',
  'TRADITIONAL',
  'HAND_HARVESTED',
  'GLUTEN_FREE',
  'LACTOSE_FREE',
  'VEGAN',
  'VEGETARIAN',
  'KOSHER',
  'HALAL',
  'WILD_HARVESTED',
  'SMALL_BATCH',
  'COLD_PRESSED',
  'RAW',
  'FAIR_TRADE',
  'ARTISANAL',
  'OTHER'
);

ALTER TABLE "marketplace_products"
  ADD COLUMN "quality_attributes" "ProductQualityAttribute"[] NOT NULL DEFAULT ARRAY[]::"ProductQualityAttribute"[];
