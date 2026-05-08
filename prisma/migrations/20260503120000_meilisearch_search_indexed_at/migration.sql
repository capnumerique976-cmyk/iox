-- MeiliSearch indexation tracking columns (additive, nullable)

ALTER TABLE "marketplace_products" ADD COLUMN "search_indexed_at" TIMESTAMP(3);
ALTER TABLE "marketplace_products" ADD COLUMN "search_index_hash" TEXT;

ALTER TABLE "seller_profiles" ADD COLUMN "search_indexed_at" TIMESTAMP(3);
ALTER TABLE "seller_profiles" ADD COLUMN "search_index_hash" TEXT;
