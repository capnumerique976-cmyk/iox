-- AlterEnum: add PAYMENT and INVOICE to EntityType
ALTER TYPE "EntityType" ADD VALUE 'PAYMENT';
ALTER TYPE "EntityType" ADD VALUE 'INVOICE';

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELED');

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "seller_profile_id" TEXT NOT NULL,
    "buyer_company_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "pdf_storage_key" TEXT,
    "issued_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_payment_id_key" ON "invoices"("payment_id");
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX "invoices_seller_profile_id_created_at_idx" ON "invoices"("seller_profile_id", "created_at");
CREATE INDEX "invoices_buyer_company_id_created_at_idx" ON "invoices"("buyer_company_id", "created_at");
