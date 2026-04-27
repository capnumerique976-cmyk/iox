-- FP-5 — Volumes et capacités produit marketplace.
-- Strictement additif : 5 colonnes nullables, aucun index, aucune ligne touchée.

ALTER TABLE "marketplace_products" ADD COLUMN "annual_production_capacity" DECIMAL(14, 3);
ALTER TABLE "marketplace_products" ADD COLUMN "capacity_unit" TEXT;
ALTER TABLE "marketplace_products" ADD COLUMN "available_quantity" DECIMAL(14, 3);
ALTER TABLE "marketplace_products" ADD COLUMN "available_quantity_unit" TEXT;
ALTER TABLE "marketplace_products" ADD COLUMN "restock_frequency" TEXT;
