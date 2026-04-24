-- V2 — Ownership seller enforcement : table de jonction User ↔ Company
--
-- Pourquoi une table de jonction et pas un FK direct `User.company_id` :
--  - Plusieurs users par company (B2B : sales, logistique, direction) ;
--  - Un user peut être rattaché à plusieurs companies (consultant, groupe) ;
--  - Les users IOX-internal (ADMIN, QUALITY_MANAGER, ...) n'ont aucun lien
--    company et n'ont donc pas de colonne vide à porter.
--
-- Backfill : aucun lien `User ↔ Company` n'existait en MVP, la table est
-- donc créée vide. Les memberships des utilisateurs seller déjà présents
-- doivent être créés manuellement par un administrateur après la migration
-- (ou via le seed script pour les environnements de dev).

-- CreateTable
CREATE TABLE "user_company_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" TEXT,

    CONSTRAINT "user_company_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_company_memberships_user_id_idx" ON "user_company_memberships"("user_id");

-- CreateIndex
CREATE INDEX "user_company_memberships_company_id_idx" ON "user_company_memberships"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_company_memberships_user_id_company_id_key" ON "user_company_memberships"("user_id", "company_id");

-- AddForeignKey
ALTER TABLE "user_company_memberships" ADD CONSTRAINT "user_company_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_memberships" ADD CONSTRAINT "user_company_memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
