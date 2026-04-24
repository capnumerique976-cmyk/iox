-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COORDINATOR', 'BENEFICIARY_MANAGER', 'SUPPLY_MANAGER', 'QUALITY_MANAGER', 'MARKET_VALIDATOR', 'LOGISTICS_MANAGER', 'COMMERCIAL_MANAGER', 'BENEFICIARY', 'FUNDER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "BeneficiaryStatus" AS ENUM ('DRAFT', 'QUALIFIED', 'IN_PROGRESS', 'SUSPENDED', 'EXITED');

-- CreateEnum
CREATE TYPE "AccompanimentActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaturityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('SUPPLIER', 'COOPERATIVE', 'BUYER', 'PARTNER', 'INSTITUTIONAL');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'IN_PREPARATION', 'READY_FOR_VALIDATION', 'COMPLIANT', 'COMPLIANT_WITH_RESERVATIONS', 'BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SupplyContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "InboundBatchStatus" AS ENUM ('RECEIVED', 'IN_CONTROL', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductBatchStatus" AS ENUM ('CREATED', 'READY_FOR_VALIDATION', 'AVAILABLE', 'RESERVED', 'SHIPPED', 'BLOCKED', 'DESTROYED');

-- CreateEnum
CREATE TYPE "MarketReleaseDecisionStatus" AS ENUM ('COMPLIANT', 'COMPLIANT_WITH_RESERVATIONS', 'NON_COMPLIANT');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ANALYZING', 'ACTION_IN_PROGRESS', 'CONTROLLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('MINOR', 'MAJOR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DistributionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('BENEFICIARY', 'PRODUCT', 'INBOUND_BATCH', 'TRANSFORMATION_OPERATION', 'PRODUCT_BATCH', 'MARKET_RELEASE_DECISION', 'SUPPLY_CONTRACT', 'INCIDENT', 'DISTRIBUTION', 'USER', 'COMPANY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "BeneficiaryStatus" NOT NULL DEFAULT 'DRAFT',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "siret" TEXT,
    "sector" TEXT,
    "description" TEXT,
    "legal_status" TEXT,
    "established_at" TIMESTAMP(3),
    "employee_count" INTEGER,
    "certifications" TEXT[],
    "capacity_description" TEXT,
    "referent_id" TEXT,
    "account_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiary_diagnostics" (
    "id" TEXT NOT NULL,
    "maturity_level" "MaturityLevel",
    "constraints" TEXT,
    "needs" TEXT,
    "objectives" TEXT,
    "risks" TEXT,
    "priorities" TEXT,
    "notes" TEXT,
    "conducted_at" TIMESTAMP(3),
    "beneficiary_id" TEXT NOT NULL,
    "conducted_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT,

    CONSTRAINT "beneficiary_diagnostics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accompaniment_actions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "action_type" TEXT NOT NULL,
    "status" "AccompanimentActionStatus" NOT NULL DEFAULT 'PLANNED',
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "beneficiary_id" TEXT NOT NULL,
    "assigned_to_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "accompaniment_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "types" "CompanyType"[],
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "vat_number" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commercial_name" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "origin" TEXT,
    "transformation_site" TEXT,
    "packaging_spec" TEXT,
    "production_capacity" DECIMAL(10,2),
    "unit" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "version_notes" TEXT,
    "ingredients" TEXT,
    "allergens" TEXT[],
    "shelf_life" TEXT,
    "storage_conditions" TEXT,
    "labeling_info" TEXT,
    "nutritional_info" TEXT,
    "technical_notes" TEXT,
    "beneficiary_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_contracts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "SupplyContractStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "volume_committed" DECIMAL(10,2),
    "unit" TEXT,
    "payment_terms" TEXT,
    "notes" TEXT,
    "supplier_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "supply_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_batches" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "InboundBatchStatus" NOT NULL DEFAULT 'RECEIVED',
    "received_at" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "origin" TEXT,
    "notes" TEXT,
    "control_notes" TEXT,
    "controlled_at" TIMESTAMP(3),
    "controlled_by_user_id" TEXT,
    "supplier_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "supply_contract_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "inbound_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transformation_operations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "operation_date" TIMESTAMP(3) NOT NULL,
    "site" TEXT,
    "operator_notes" TEXT,
    "yield_rate" DECIMAL(5,2),
    "inbound_batch_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "transformation_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_batches" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "ProductBatchStatus" NOT NULL DEFAULT 'CREATED',
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "production_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "storage_location" TEXT,
    "market_eligibility_status" TEXT,
    "notes" TEXT,
    "product_id" TEXT NOT NULL,
    "transformation_op_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "label_validations" (
    "id" TEXT NOT NULL,
    "is_valid" BOOLEAN NOT NULL DEFAULT false,
    "validated_at" TIMESTAMP(3),
    "notes" TEXT,
    "reservations" TEXT[],
    "product_batch_id" TEXT NOT NULL,
    "validated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT,

    CONSTRAINT "label_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_release_decisions" (
    "id" TEXT NOT NULL,
    "decision" "MarketReleaseDecisionStatus" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "decided_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "reservations" TEXT[],
    "blocking_reason" TEXT,
    "checklist" JSONB NOT NULL DEFAULT '{}',
    "product_batch_id" TEXT NOT NULL,
    "validated_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_release_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "IncidentSeverity" NOT NULL,
    "incident_date" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "actions_taken" TEXT,
    "linked_entity_type" "EntityType",
    "linked_entity_id" TEXT,
    "assigned_to_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "expires_at" TIMESTAMP(3),
    "linked_entity_type" "EntityType" NOT NULL,
    "linked_entity_id" TEXT NOT NULL,
    "beneficiary_id" TEXT,
    "product_id" TEXT,
    "company_id" TEXT,
    "supply_contract_id" TEXT,
    "inbound_batch_id" TEXT,
    "product_batch_id" TEXT,
    "incident_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "DistributionStatus" NOT NULL DEFAULT 'PLANNED',
    "distribution_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "beneficiary_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_user_id" TEXT,
    "updated_by_user_id" TEXT,

    CONSTRAINT "distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_lines" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "distribution_id" TEXT NOT NULL,
    "product_batch_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distribution_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" "EntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "previous_data" JSONB,
    "new_data" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "notes" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProductToSupplyContract" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_code_key" ON "beneficiaries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_referent_id_key" ON "beneficiaries"("referent_id");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiaries_account_user_id_key" ON "beneficiaries"("account_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_diagnostics_beneficiary_id_key" ON "beneficiary_diagnostics"("beneficiary_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE UNIQUE INDEX "supply_contracts_code_key" ON "supply_contracts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "inbound_batches_code_key" ON "inbound_batches"("code");

-- CreateIndex
CREATE UNIQUE INDEX "transformation_operations_code_key" ON "transformation_operations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_batches_code_key" ON "product_batches"("code");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_code_key" ON "incidents"("code");

-- CreateIndex
CREATE INDEX "documents_linked_entity_type_linked_entity_id_idx" ON "documents"("linked_entity_type", "linked_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "distributions_code_key" ON "distributions"("code");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToSupplyContract_AB_unique" ON "_ProductToSupplyContract"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductToSupplyContract_B_index" ON "_ProductToSupplyContract"("B");

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_referent_id_fkey" FOREIGN KEY ("referent_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_account_user_id_fkey" FOREIGN KEY ("account_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_diagnostics" ADD CONSTRAINT "beneficiary_diagnostics_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accompaniment_actions" ADD CONSTRAINT "accompaniment_actions_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_contracts" ADD CONSTRAINT "supply_contracts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_batches" ADD CONSTRAINT "inbound_batches_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_batches" ADD CONSTRAINT "inbound_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_batches" ADD CONSTRAINT "inbound_batches_supply_contract_id_fkey" FOREIGN KEY ("supply_contract_id") REFERENCES "supply_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transformation_operations" ADD CONSTRAINT "transformation_operations_inbound_batch_id_fkey" FOREIGN KEY ("inbound_batch_id") REFERENCES "inbound_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_transformation_op_id_fkey" FOREIGN KEY ("transformation_op_id") REFERENCES "transformation_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_validations" ADD CONSTRAINT "label_validations_product_batch_id_fkey" FOREIGN KEY ("product_batch_id") REFERENCES "product_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "label_validations" ADD CONSTRAINT "label_validations_validated_by_user_id_fkey" FOREIGN KEY ("validated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_release_decisions" ADD CONSTRAINT "market_release_decisions_product_batch_id_fkey" FOREIGN KEY ("product_batch_id") REFERENCES "product_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_release_decisions" ADD CONSTRAINT "market_release_decisions_validated_by_user_id_fkey" FOREIGN KEY ("validated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_supply_contract_id_fkey" FOREIGN KEY ("supply_contract_id") REFERENCES "supply_contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_inbound_batch_id_fkey" FOREIGN KEY ("inbound_batch_id") REFERENCES "inbound_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_product_batch_id_fkey" FOREIGN KEY ("product_batch_id") REFERENCES "product_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_lines" ADD CONSTRAINT "distribution_lines_distribution_id_fkey" FOREIGN KEY ("distribution_id") REFERENCES "distributions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_lines" ADD CONSTRAINT "distribution_lines_product_batch_id_fkey" FOREIGN KEY ("product_batch_id") REFERENCES "product_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToSupplyContract" ADD CONSTRAINT "_ProductToSupplyContract_A_fkey" FOREIGN KEY ("A") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToSupplyContract" ADD CONSTRAINT "_ProductToSupplyContract_B_fkey" FOREIGN KEY ("B") REFERENCES "supply_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

