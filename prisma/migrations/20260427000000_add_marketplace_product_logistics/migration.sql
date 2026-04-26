-- FP-8 — Logistique structurée produit marketplace (additif strict).
--
-- 5 colonnes optionnelles, aucun NOT NULL : les lignes existantes restent
-- à NULL / [] et aucun défaut n'est posé hormis le tableau vide pour
-- packaging_formats (cohérent avec le pattern saisonnalité harvest_months[]).
-- Pas d'index : données vitrine, pas de requêtage au MVP.
--
-- Champs :
--   - packaging_formats   TEXT[]         : conditionnements proposés
--                                          (ex. ["1kg", "5kg", "carton 10kg"])
--   - temperature_requirements TEXT      : contrainte de température
--                                          (ex. "Ambient", "Cool 4-8°C",
--                                          "Frozen ≤ -18°C")
--   - gross_weight        DECIMAL(10,3)  : poids brut unitaire (kg)
--   - net_weight          DECIMAL(10,3)  : poids net unitaire (kg)
--   - palletization       TEXT           : description palette
--                                          (ex. "120 cartons / palette EUR-EPAL")

ALTER TABLE "marketplace_products" ADD COLUMN "packaging_formats" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "marketplace_products" ADD COLUMN "temperature_requirements" TEXT;
ALTER TABLE "marketplace_products" ADD COLUMN "gross_weight" DECIMAL(10, 3);
ALTER TABLE "marketplace_products" ADD COLUMN "net_weight" DECIMAL(10, 3);
ALTER TABLE "marketplace_products" ADD COLUMN "palletization" TEXT;
