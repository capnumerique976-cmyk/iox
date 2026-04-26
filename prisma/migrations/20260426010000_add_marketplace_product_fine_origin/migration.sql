-- FP-6 — Origine fine produit (additif strict).
-- 4 colonnes optionnelles, aucun NOT NULL : les lignes existantes restent
-- à NULL et aucun défaut n'est posé. Pas d'index : ce sont des données
-- vitrine, non requêtables au MVP.
--
-- gps_lat / gps_lng utilisent Decimal(9,6) — précision ~11 cm, largement
-- suffisante pour de l'origine de parcelle. La cohérence (les deux
-- ensemble ou aucun) est imposée côté service, pas par le schéma.

ALTER TABLE "marketplace_products" ADD COLUMN "origin_locality" TEXT;
ALTER TABLE "marketplace_products" ADD COLUMN "altitude_meters" INTEGER;
ALTER TABLE "marketplace_products" ADD COLUMN "gps_lat" DECIMAL(9, 6);
ALTER TABLE "marketplace_products" ADD COLUMN "gps_lng" DECIMAL(9, 6);
